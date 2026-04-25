"""
TrackFast – AI-Enabled Smart Emergency Response & Ambulance Coordination System
Backend: FastAPI + SQLite + WebSockets
"""

from __future__ import annotations

import asyncio
import json
import math
import random
import sqlite3
import string
import time
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import DB_PATH, init_db

# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────

def _db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _haversine(lat1, lng1, lat2, lng2):
    """Return distance in km between two points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _eta_minutes(distance_km, speed_kmh=40):
    """Estimate ETA in minutes given distance and average ambulance speed."""
    if speed_kmh <= 0:
        return 0
    return max(1, round((distance_km / speed_kmh) * 60))


def _generate_tracking_id():
    return "INC-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def _generate_bed_label():
    return f"ICU-{random.randint(100, 499)}"


# ────────────────────────────────────────────────────────────────────────────
# WebSocket connection manager
# ────────────────────────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}  # tracking_id -> [ws]

    async def connect(self, tracking_id: str, ws: WebSocket):
        await ws.accept()
        self.connections.setdefault(tracking_id, []).append(ws)

    def disconnect(self, tracking_id: str, ws: WebSocket):
        if tracking_id in self.connections:
            self.connections[tracking_id] = [
                c for c in self.connections[tracking_id] if c is not ws
            ]

    async def broadcast(self, tracking_id: str, data: dict):
        for ws in self.connections.get(tracking_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()

# In-memory simulation state
simulations: Dict[str, dict] = {}  # tracking_id -> simulation state

# ────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ────────────────────────────────────────────────────────────────────────────

class CreateIncidentRequest(BaseModel):
    lat: float
    lng: float
    label: str = "Main Street"
    severity: str = "high"

class BookBedRequest(BaseModel):
    incident_id: int
    hospital_id: int

class CancelBookingRequest(BaseModel):
    incident_id: int

class UpdateStatusRequest(BaseModel):
    incident_id: int
    status: str  # dispatched | en_route | arrived | completed

class HospitalOut(BaseModel):
    id: int
    name: str
    address: str
    lat: float
    lng: float
    icu_beds: int
    general_beds: int
    distance_km: float
    eta_minutes: int
    available: bool

class IncidentOut(BaseModel):
    id: int
    tracking_id: str
    location_lat: float
    location_lng: float
    location_label: str
    severity: str
    status: str
    assigned_ambulance_id: Optional[int] = None
    assigned_hospital_id: Optional[int] = None
    booked_bed_id: Optional[str] = None
    ambulance_call_sign: Optional[str] = None
    hospital_name: Optional[str] = None

# ────────────────────────────────────────────────────────────────────────────
# App lifecycle
# ────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="TrackFast Emergency Response API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ────────────────────────────────────────────────────────────────────────────
# REST Endpoints
# ────────────────────────────────────────────────────────────────────────────

@app.get("/api/hospitals")
def list_hospitals():
    conn = _db()
    rows = conn.execute("SELECT * FROM hospitals ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/ambulances")
def list_ambulances():
    conn = _db()
    rows = conn.execute("SELECT * FROM ambulances ORDER BY call_sign").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/incidents")
def list_incidents():
    conn = _db()
    rows = conn.execute("""
        SELECT i.*, a.call_sign as ambulance_call_sign, h.name as hospital_name
        FROM incidents i
        LEFT JOIN ambulances a ON i.assigned_ambulance_id = a.id
        LEFT JOIN hospitals h ON i.assigned_hospital_id = h.id
        ORDER BY i.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/incidents/{tracking_id}")
def get_incident(tracking_id: str):
    conn = _db()
    row = conn.execute("""
        SELECT i.*, a.call_sign as ambulance_call_sign, a.lat as amb_lat, a.lng as amb_lng,
               h.name as hospital_name, h.address as hospital_address,
               h.lat as hosp_lat, h.lng as hosp_lng
        FROM incidents i
        LEFT JOIN ambulances a ON i.assigned_ambulance_id = a.id
        LEFT JOIN hospitals h ON i.assigned_hospital_id = h.id
        WHERE i.tracking_id = ?
    """, (tracking_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Incident not found")
    result = dict(row)
    # Add simulation state if exists
    if tracking_id in simulations:
        sim = simulations[tracking_id]
        result["current_lat"] = sim.get("current_lat", result.get("amb_lat"))
        result["current_lng"] = sim.get("current_lng", result.get("amb_lng"))
        result["eta_seconds"] = sim.get("eta_seconds", 0)
        result["progress"] = sim.get("progress", 0)
    return result


@app.post("/api/incidents")
def create_incident(req: CreateIncidentRequest):
    """Create an incident and assign the nearest available ambulance."""
    conn = _db()
    tracking_id = _generate_tracking_id()

    # Find nearest available ambulance
    ambulances = conn.execute(
        "SELECT * FROM ambulances WHERE status = 'available' ORDER BY id"
    ).fetchall()
    if not ambulances:
        conn.close()
        raise HTTPException(400, "No ambulances available")

    nearest_amb = min(ambulances, key=lambda a: _haversine(req.lat, req.lng, a["lat"], a["lng"]))

    conn.execute(
        "INSERT INTO incidents (tracking_id, location_lat, location_lng, location_label, severity, status, assigned_ambulance_id) VALUES (?,?,?,?,?,?,?)",
        (tracking_id, req.lat, req.lng, req.label, req.severity, "dispatched", nearest_amb["id"]),
    )
    conn.execute("UPDATE ambulances SET status = 'dispatched' WHERE id = ?", (nearest_amb["id"],))
    conn.commit()

    incident = conn.execute("SELECT * FROM incidents WHERE tracking_id = ?", (tracking_id,)).fetchone()
    conn.close()

    result = dict(incident)
    result["ambulance_call_sign"] = nearest_amb["call_sign"]
    return result


@app.post("/api/nearest-hospitals")
def nearest_hospitals(req: CreateIncidentRequest):
    """Return 3 nearest hospitals with bed availability and distance info."""
    conn = _db()
    rows = conn.execute("SELECT * FROM hospitals").fetchall()
    conn.close()

    hospitals = []
    for r in rows:
        d = _haversine(req.lat, req.lng, r["lat"], r["lng"])
        hospitals.append(HospitalOut(
            id=r["id"],
            name=r["name"],
            address=r["address"],
            lat=r["lat"],
            lng=r["lng"],
            icu_beds=r["icu_beds"],
            general_beds=r["general_beds"],
            distance_km=round(d, 1),
            eta_minutes=_eta_minutes(d),
            available=r["icu_beds"] > 0,
        ))

    hospitals.sort(key=lambda h: h.distance_km)
    return hospitals[:4]  # Return all 4 so UI can show unavailable ones too


@app.post("/api/book-bed")
def book_bed(req: BookBedRequest):
    """Reserve an ICU bed at the selected hospital for an incident."""
    conn = _db()
    hospital = conn.execute("SELECT * FROM hospitals WHERE id = ?", (req.hospital_id,)).fetchone()
    if not hospital:
        conn.close()
        raise HTTPException(404, "Hospital not found")
    if hospital["icu_beds"] <= 0:
        conn.close()
        raise HTTPException(400, "No ICU beds available at this hospital")

    incident = conn.execute("SELECT * FROM incidents WHERE id = ?", (req.incident_id,)).fetchone()
    if not incident:
        conn.close()
        raise HTTPException(404, "Incident not found")

    bed_label = _generate_bed_label()

    # Decrease bed count
    conn.execute("UPDATE hospitals SET icu_beds = icu_beds - 1 WHERE id = ?", (req.hospital_id,))

    # Create reservation
    conn.execute(
        "INSERT INTO bed_reservations (hospital_id, bed_label, bed_type, incident_id, status) VALUES (?,?,?,?,?)",
        (req.hospital_id, bed_label, "icu", req.incident_id, "reserved"),
    )

    # Update incident
    conn.execute(
        "UPDATE incidents SET assigned_hospital_id = ?, booked_bed_id = ?, status = 'en_route', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (req.hospital_id, bed_label, req.incident_id),
    )
    conn.execute(
        "UPDATE ambulances SET status = 'en_route' WHERE id = ?",
        (incident["assigned_ambulance_id"],),
    )
    conn.commit()

    # Fetch updated data
    updated_hospital = conn.execute("SELECT * FROM hospitals WHERE id = ?", (req.hospital_id,)).fetchone()
    updated_incident = conn.execute("""
        SELECT i.*, h.name as hospital_name, h.address as hospital_address,
               h.lat as hosp_lat, h.lng as hosp_lng,
               a.call_sign as ambulance_call_sign, a.lat as amb_lat, a.lng as amb_lng
        FROM incidents i
        JOIN hospitals h ON i.assigned_hospital_id = h.id
        JOIN ambulances a ON i.assigned_ambulance_id = a.id
        WHERE i.id = ?
    """, (req.incident_id,)).fetchone()
    conn.close()

    # Calculate distance and ETA
    dist = _haversine(
        updated_incident["amb_lat"], updated_incident["amb_lng"],
        updated_incident["hosp_lat"], updated_incident["hosp_lng"]
    )
    eta = _eta_minutes(dist)

    # Initialize simulation state
    tracking_id = updated_incident["tracking_id"]
    simulations[tracking_id] = {
        "incident_id": req.incident_id,
        "start_lat": updated_incident["amb_lat"],
        "start_lng": updated_incident["amb_lng"],
        "end_lat": updated_incident["hosp_lat"],
        "end_lng": updated_incident["hosp_lng"],
        "current_lat": updated_incident["amb_lat"],
        "current_lng": updated_incident["amb_lng"],
        "total_distance_km": round(dist, 2),
        "eta_seconds": eta * 60,
        "total_seconds": eta * 60,
        "progress": 0.0,
        "started_at": time.time(),
        "speed_factor": 15,  # Speed up simulation: complete in ~60 seconds
        "status": "en_route",
    }

    return {
        "success": True,
        "bed_label": bed_label,
        "hospital_name": updated_hospital["name"],
        "hospital_address": dict(updated_hospital).get("address", ""),
        "icu_beds_remaining": updated_hospital["icu_beds"],
        "tracking_id": tracking_id,
        "tracking_url": f"http://localhost:5173/track/{tracking_id}",
        "eta_minutes": eta,
        "distance_km": round(dist, 1),
    }


@app.post("/api/cancel-booking")
def cancel_booking(req: CancelBookingRequest):
    """Cancel a bed reservation and release the bed."""
    conn = _db()
    incident = conn.execute("SELECT * FROM incidents WHERE id = ?", (req.incident_id,)).fetchone()
    if not incident:
        conn.close()
        raise HTTPException(404, "Incident not found")
    if not incident["assigned_hospital_id"]:
        conn.close()
        raise HTTPException(400, "No bed booked for this incident")

    # Release the bed
    conn.execute("UPDATE hospitals SET icu_beds = icu_beds + 1 WHERE id = ?", (incident["assigned_hospital_id"],))
    conn.execute(
        "UPDATE bed_reservations SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE incident_id = ? AND status = 'reserved'",
        (req.incident_id,),
    )
    conn.execute(
        "UPDATE incidents SET assigned_hospital_id = NULL, booked_bed_id = NULL, status = 'dispatched', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (req.incident_id,),
    )
    conn.commit()
    conn.close()

    # Clean up simulation
    tracking_id = incident["tracking_id"]
    if tracking_id in simulations:
        del simulations[tracking_id]

    return {"success": True, "message": "Bed reservation cancelled. Bed released back to available pool."}


@app.post("/api/arrive")
def mark_arrived(req: UpdateStatusRequest):
    """Mark ambulance as arrived at hospital."""
    conn = _db()
    incident = conn.execute("SELECT * FROM incidents WHERE id = ?", (req.incident_id,)).fetchone()
    if not incident:
        conn.close()
        raise HTTPException(404, "Incident not found")

    elapsed = 0
    tracking_id = incident["tracking_id"]
    if tracking_id in simulations:
        sim = simulations[tracking_id]
        elapsed = int(time.time() - sim["started_at"])

    conn.execute(
        "UPDATE incidents SET status = 'arrived', response_time_sec = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (elapsed, req.incident_id),
    )
    conn.execute(
        "UPDATE ambulances SET status = 'arrived' WHERE id = ?",
        (incident["assigned_ambulance_id"],),
    )
    conn.execute(
        "UPDATE bed_reservations SET status = 'occupied' WHERE incident_id = ? AND status = 'reserved'",
        (req.incident_id,),
    )
    conn.commit()
    conn.close()

    if tracking_id in simulations:
        simulations[tracking_id]["status"] = "arrived"
        simulations[tracking_id]["progress"] = 1.0

    return {
        "success": True,
        "response_time_sec": elapsed,
        "response_time_display": f"{elapsed // 60}m {elapsed % 60}s",
    }


@app.post("/api/complete")
def complete_incident(req: UpdateStatusRequest):
    """Complete the incident and free the ambulance."""
    conn = _db()
    incident = conn.execute("SELECT * FROM incidents WHERE id = ?", (req.incident_id,)).fetchone()
    if not incident:
        conn.close()
        raise HTTPException(404, "Incident not found")

    conn.execute(
        "UPDATE incidents SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (req.incident_id,),
    )
    conn.execute(
        "UPDATE ambulances SET status = 'available' WHERE id = ?",
        (incident["assigned_ambulance_id"],),
    )
    conn.commit()
    conn.close()

    tracking_id = incident["tracking_id"]
    if tracking_id in simulations:
        simulations[tracking_id]["status"] = "completed"

    return {"success": True}


@app.post("/api/reset")
def reset_data():
    """Reset all data to initial state for demo purposes."""
    conn = _db()
    conn.execute("DELETE FROM bed_reservations")
    conn.execute("DELETE FROM incidents")
    conn.execute("UPDATE hospitals SET icu_beds = CASE id WHEN 1 THEN 4 WHEN 2 THEN 2 WHEN 3 THEN 0 WHEN 4 THEN 3 END")
    conn.execute("UPDATE hospitals SET general_beds = CASE id WHEN 1 THEN 12 WHEN 2 THEN 8 WHEN 3 THEN 5 WHEN 4 THEN 10 END")
    conn.execute("UPDATE ambulances SET status = 'available', lat = CASE id WHEN 1 THEN 40.7128 WHEN 2 THEN 40.7150 WHEN 3 THEN 40.7100 END, lng = CASE id WHEN 1 THEN -74.0060 WHEN 2 THEN -74.0090 WHEN 3 THEN -74.0030 END")
    conn.commit()
    conn.close()
    simulations.clear()
    return {"success": True, "message": "All data reset to initial state."}


# ────────────────────────────────────────────────────────────────────────────
# WebSocket – live tracking
# ────────────────────────────────────────────────────────────────────────────

@app.websocket("/ws/track/{tracking_id}")
async def websocket_track(ws: WebSocket, tracking_id: str):
    await manager.connect(tracking_id, ws)
    try:
        while True:
            # Update simulation
            if tracking_id in simulations:
                sim = simulations[tracking_id]
                if sim["status"] == "en_route":
                    elapsed = time.time() - sim["started_at"]
                    progress = min(1.0, (elapsed * sim["speed_factor"]) / sim["total_seconds"])
                    sim["progress"] = progress
                    sim["current_lat"] = sim["start_lat"] + (sim["end_lat"] - sim["start_lat"]) * progress
                    sim["current_lng"] = sim["start_lng"] + (sim["end_lng"] - sim["start_lng"]) * progress
                    remaining_dist = sim["total_distance_km"] * (1 - progress)
                    sim["eta_seconds"] = max(0, int(sim["total_seconds"] * (1 - progress) / sim["speed_factor"]))

                    if progress >= 1.0:
                        sim["status"] = "arrived"
                        sim["current_lat"] = sim["end_lat"]
                        sim["current_lng"] = sim["end_lng"]
                        sim["eta_seconds"] = 0

                await ws.send_json({
                    "type": "location_update",
                    "tracking_id": tracking_id,
                    "lat": sim["current_lat"],
                    "lng": sim["current_lng"],
                    "eta_seconds": sim["eta_seconds"],
                    "progress": sim["progress"],
                    "status": sim["status"],
                    "dest_lat": sim["end_lat"],
                    "dest_lng": sim["end_lng"],
                    "total_distance_km": sim["total_distance_km"],
                })
            else:
                await ws.send_json({
                    "type": "waiting",
                    "tracking_id": tracking_id,
                    "message": "Waiting for ambulance dispatch...",
                })

            await asyncio.sleep(2)  # Update every 2 seconds
    except WebSocketDisconnect:
        manager.disconnect(tracking_id, ws)
    except Exception:
        manager.disconnect(tracking_id, ws)


@app.websocket("/ws/dispatch")
async def websocket_dispatch(ws: WebSocket):
    """General dispatch channel – broadcasts all ambulance positions."""
    await ws.accept()
    try:
        while True:
            updates = []
            for tid, sim in simulations.items():
                updates.append({
                    "tracking_id": tid,
                    "lat": sim["current_lat"],
                    "lng": sim["current_lng"],
                    "status": sim["status"],
                    "progress": sim["progress"],
                })
            await ws.send_json({"type": "dispatch_update", "simulations": updates})
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass


# ────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
