"""
Database setup and seed data for the Emergency Response System.
Uses SQLite via aiosqlite for simplicity.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "emergency.db")


def get_connection():
    """Get a synchronous SQLite connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables and seed initial data."""
    conn = get_connection()
    cursor = conn.cursor()

    # ── Schema ──────────────────────────────────────────────────────────
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS hospitals (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            address     TEXT NOT NULL,
            lat         REAL NOT NULL,
            lng         REAL NOT NULL,
            icu_beds    INTEGER NOT NULL DEFAULT 0,
            general_beds INTEGER NOT NULL DEFAULT 0,
            phone       TEXT,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ambulances (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            call_sign   TEXT NOT NULL UNIQUE,
            lat         REAL NOT NULL,
            lng         REAL NOT NULL,
            status      TEXT NOT NULL DEFAULT 'available',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS incidents (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            tracking_id     TEXT NOT NULL UNIQUE,
            location_lat    REAL NOT NULL,
            location_lng    REAL NOT NULL,
            location_label  TEXT NOT NULL DEFAULT '',
            severity        TEXT NOT NULL DEFAULT 'medium',
            status          TEXT NOT NULL DEFAULT 'reported',
            assigned_ambulance_id INTEGER,
            assigned_hospital_id  INTEGER,
            booked_bed_id   TEXT,
            response_time_sec INTEGER,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assigned_ambulance_id) REFERENCES ambulances(id),
            FOREIGN KEY (assigned_hospital_id)  REFERENCES hospitals(id)
        );

        CREATE TABLE IF NOT EXISTS bed_reservations (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            hospital_id     INTEGER NOT NULL,
            bed_label       TEXT NOT NULL,
            bed_type        TEXT NOT NULL DEFAULT 'icu',
            incident_id     INTEGER,
            status          TEXT NOT NULL DEFAULT 'reserved',
            reserved_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            released_at     TIMESTAMP,
            FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
            FOREIGN KEY (incident_id) REFERENCES incidents(id)
        );
    """)

    # ── Seed data (only if tables are empty) ────────────────────────────
    if cursor.execute("SELECT COUNT(*) FROM hospitals").fetchone()[0] == 0:
        hospitals = [
            ("City General Hospital", "420 Broadway, New York, NY", 40.7185, -74.0025, 4, 12, "555-0101"),
            ("St. Mary's Medical Center", "88 Greenwich St, New York, NY", 40.7095, -74.0135, 2, 8, "555-0102"),
            ("University Medical Center", "200 Liberty St, New York, NY", 40.7075, -74.0155, 0, 5, "555-0103"),
            ("Community Hospital", "150 Park Row, New York, NY", 40.7112, -74.0000, 3, 10, "555-0104"),
        ]
        cursor.executemany(
            "INSERT INTO hospitals (name, address, lat, lng, icu_beds, general_beds, phone) VALUES (?,?,?,?,?,?,?)",
            hospitals,
        )

    if cursor.execute("SELECT COUNT(*) FROM ambulances").fetchone()[0] == 0:
        ambulances = [
            ("A01", 40.7128, -74.0060, "available"),
            ("A02", 40.7150, -74.0090, "available"),
            ("A03", 40.7100, -74.0030, "available"),
        ]
        cursor.executemany(
            "INSERT INTO ambulances (call_sign, lat, lng, status) VALUES (?,?,?,?)",
            ambulances,
        )

    conn.commit()
    conn.close()
    print("[OK] Database initialized with seed data.")


if __name__ == "__main__":
    init_db()
