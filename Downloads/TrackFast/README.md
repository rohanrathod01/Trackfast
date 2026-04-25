# 🚨 TrackFast – AI-Enabled Smart Emergency Response System

A complete emergency ambulance coordination system with real-time tracking, hospital bed booking, and family notification — built for hackathon demonstration.

## Features

1. **Nearest Hospital Finder** – Shows 3+ nearest hospitals with ICU/general bed counts, distance, and ETA
2. **Bed Booking System** – Instant ICU bed reservation with confirmation; cancellation releases the bed
3. **Real-Time Tracking** – Live ambulance tracking via WebSocket with ETA countdown, map, and status timeline

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Python, FastAPI, WebSockets         |
| Frontend  | React 18, Vite, React Router        |
| Database  | SQLite (via `sqlite3`)              |
| Maps      | Leaflet + OpenStreetMap (free)      |
| Styling   | Vanilla CSS with dark/light theme   |
| Real-time | WebSockets (native FastAPI)         |

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs at **http://localhost:8000**.  
Database (`emergency.db`) is auto-created with seed data on first run.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**.

## Pages

| Route                        | Purpose                         |
|------------------------------|---------------------------------|
| `http://localhost:5173/`     | Dispatcher Dashboard (map + controls) |
| `http://localhost:5173/driver` | Driver Tablet View              |
| `http://localhost:5173/track/:id` | Public Family Tracking Page |

## Demo Walkthrough (< 2 minutes)

1. Open **Dispatcher Dashboard** (`/`)
2. Click **"Simulate Emergency at Main Street"**
3. See 4 hospitals with bed availability — University Medical shows "NOT AVAILABLE" (0 ICU beds)
4. Click **SELECT** on City General (4 ICU beds) → bed reserved, count drops to 3
5. Tracking link appears → open it in a new tab to see the **Family Tracking Page**
6. Ambulance icon moves on map, ETA counts down
7. Click **"Mark as Arrived"** → incident complete with response time summary

### Alternative: Use the Driver View

1. Open `/driver` in a separate browser tab
2. Click **"Simulate Emergency Call"**
3. Click **"Patient Loaded — Select Hospital"**
4. Choose a hospital → bed booked → navigation starts
5. Watch the live map and ETA
6. Click **"Arrived at Hospital"** → **"Complete Incident"**

## API Endpoints

| Method | Endpoint                   | Description                     |
|--------|----------------------------|---------------------------------|
| GET    | `/api/hospitals`           | List all hospitals              |
| GET    | `/api/ambulances`          | List all ambulances             |
| GET    | `/api/incidents`           | List all incidents              |
| GET    | `/api/incidents/:id`       | Get incident by tracking ID     |
| POST   | `/api/incidents`           | Create new incident             |
| POST   | `/api/nearest-hospitals`   | Get nearest hospitals           |
| POST   | `/api/book-bed`            | Reserve ICU bed                 |
| POST   | `/api/cancel-booking`      | Cancel reservation              |
| POST   | `/api/arrive`              | Mark ambulance arrived          |
| POST   | `/api/complete`            | Complete incident               |
| POST   | `/api/reset`               | Reset all data to seed state    |
| WS     | `/ws/track/:tracking_id`   | Live ambulance location updates |
| WS     | `/ws/dispatch`             | Dispatch channel (all ambulances) |

## Database Schema

```
hospitals:        id, name, address, lat, lng, icu_beds, general_beds, phone
ambulances:       id, call_sign, lat, lng, status
incidents:        id, tracking_id, location_lat/lng, severity, status, assigned_ambulance_id, assigned_hospital_id, booked_bed_id
bed_reservations: id, hospital_id, bed_label, bed_type, incident_id, status, reserved_at, released_at
```

## Seed Data

- **Ambulances**: A01 (40.7128°N, 74.006°W), A02, A03
- **Hospitals**: City General (4 ICU), St. Mary's (2 ICU), University Medical (0 ICU), Community Hospital (3 ICU)
- **Incident Location**: Main Street (40.713°N, 74.007°W)
