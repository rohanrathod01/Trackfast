from database import get_conn

def seed():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("DELETE FROM hospitals")
    cur.execute("DELETE FROM ambulances")

    hospitals = [
        ("City General", "Main Road", 19.876, 75.343, 4, 10, "123"),
        ("St Mary", "Station", 19.880, 75.350, 2, 8, "123"),
        ("University Medical", "Campus", 19.870, 75.340, 0, 12, "123"),
        ("Community Hospital", "Suburb", 19.885, 75.360, 3, 6, "123"),
    ]

    ambulances = [
        ("A01", 19.872, 75.342, "available"),
        ("A02", 19.880, 75.355, "available"),
    ]

    cur.executemany(
        "INSERT INTO hospitals (name, address, lat, lng, icu_beds, general_beds, phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
        hospitals
    )

    cur.executemany(
        "INSERT INTO ambulances (call_sign, lat, lng, status) VALUES (?, ?, ?, ?)",
        ambulances
    )

    conn.commit()
    conn.close()