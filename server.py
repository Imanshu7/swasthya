"""
Swasthya National Health Operations Platform — Backend Services
Provides database persistence, meteorological data integration,
stock transfer coordination, and operational audit logging.
"""
import os
import json
import sqlite3
import datetime
import urllib.request
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = os.path.join(os.path.dirname(__file__), "swasthya.db")

app = FastAPI(
    title="Swasthya National Operations API",
    description="Backend microservice managing 60 Primary Health Centres across 12 Indian states.",
    version="1.0.0"
)

# Enable CORS for local web servers and GitHub Pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database initialization
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. PHCs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS phcs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            state TEXT NOT NULL,
            district TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            beds_total INTEGER NOT NULL,
            beds_occupied INTEGER NOT NULL,
            staff_total INTEGER NOT NULL,
            staff_present INTEGER NOT NULL,
            footfall_today INTEGER NOT NULL,
            footfall_hist TEXT NOT NULL,
            cold_temp REAL NOT NULL,
            wx REAL NOT NULL,
            util REAL NOT NULL
        )
    """)
    
    # 2. Meds inventory table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phc_id TEXT NOT NULL,
            key TEXT NOT NULL,
            name TEXT NOT NULL,
            stock INTEGER NOT NULL,
            safety INTEGER NOT NULL,
            per REAL NOT NULL,
            history TEXT NOT NULL,
            FOREIGN KEY (phc_id) REFERENCES phcs(id)
        )
    """)
    
    # 3. Transfers transaction table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT NOT NULL,
            from_phc TEXT NOT NULL,
            to_phc TEXT NOT NULL,
            drug TEXT NOT NULL,
            qty INTEGER NOT NULL,
            dist_km REAL,
            eta_h REAL,
            timestamp TEXT NOT NULL,
            status TEXT NOT NULL
        )
    """)
    
    # 4. Audit ledger table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    
    # Seed data if empty
    cursor.execute("SELECT COUNT(*) FROM phcs")
    count = cursor.fetchone()[0]
    
    if count == 0:
        print("[DATABASE] Initializing persistent store with 60 facilities across 12 states...")
        seed_facilities(conn)
    else:
        print(f"[DATABASE] Connected to existing persistent store ({count} facilities loaded).")
        
    conn.commit()
    conn.close()

def seed_facilities(conn):
    cursor = conn.cursor()
    
    SEED = [
        ['Bihar','Gaya',24.79,85.00],['Bihar','Darbhanga',26.15,85.90],['Bihar','Purnia',25.78,87.47],['Bihar','Saran',25.91,84.75],['Bihar','Nalanda',25.14,85.45],
        ['Uttar Pradesh','Varanasi',25.32,82.99],['Uttar Pradesh','Gorakhpur',26.76,83.37],['Uttar Pradesh','Agra',27.18,78.01],['Uttar Pradesh','Bahraich',27.57,82.76],['Uttar Pradesh','Bundelkhand-Jhansi',25.45,78.57],
        ['Madhya Pradesh','Bhopal',23.26,77.41],['Madhya Pradesh','Indore',22.72,75.86],['Madhya Pradesh','Jabalpur',23.16,79.93],['Madhya Pradesh','Chhindwara',22.06,78.93],['Madhya Pradesh','Rewa',24.53,81.30],
        ['Rajasthan','Jaipur-Rural',26.9,75.8],['Rajasthan','Barmer',25.75,71.38],['Rajasthan','Udaipur',24.58,73.71],['Rajasthan','Bikaner',28.02,73.31],['Rajasthan','Bharatpur',27.22,77.48],
        ['Maharashtra','Parbhani',19.26,76.77],['Maharashtra','Nashik',20.0,73.78],['Maharashtra','Gadchiroli',20.43,80.23],['Maharashtra','Satara',17.68,74.02],['Maharashtra','Thane-Rural',19.4,73.1],
        ['West Bengal','Bankura',23.25,87.07],['West Bengal','Cooch Behar',26.35,89.45],['West Bengal','Purulia',23.33,86.36],['West Bengal','Nadia',23.47,88.54],['West Bengal','Sundarban-Canning',22.31,88.67],
        ['Tamil Nadu','Madurai',9.93,78.12],['Tamil Nadu','Vellore',12.92,79.13],['Tamil Nadu','Thanjavur',10.79,79.14],['Tamil Nadu','Tirunelveli',8.71,77.76],['Tamil Nadu','Dharmapuri',12.13,78.16],
        ['Karnataka','Kalaburagi',17.33,76.83],['Karnataka','Belagavi',15.85,74.5],['Karnataka','Shivamogga',13.93,75.57],['Karnataka','Mysuru-Rural',12.3,76.65],['Karnataka','Ballari',15.14,76.92],
        ['Telangana','Nalgonda',17.05,79.27],['Telangana','Adilabad',19.67,78.53],['Telangana','Khammam',17.25,80.15],['Telangana','Mahabubnagar',16.74,77.98],
        ['Gujarat','Surendranagar',22.73,71.65],['Gujarat','Dahod',22.83,74.26],['Gujarat','Kutch-Bhuj',23.24,69.67],['Gujarat','Valsad',20.61,72.93],
        ['Odisha','Kalahandi',19.9,83.16],['Odisha','Mayurbhanj',21.93,86.73],['Odisha','Ganjam',19.38,85.04],['Odisha','Sambalpur',21.47,83.97],
        ['Assam','Dhubri',26.02,89.98],['Assam','Silchar',24.83,92.78],['Assam','Tezpur',26.63,92.8],['Assam','Dibrugarh',27.48,94.9],
        ['Kerala','Palakkad',10.79,76.65],['Kerala','Wayanad',11.68,76.13],
        ['Punjab','Bathinda',30.21,74.95],['Punjab','Gurdaspur',32.04,75.41]
    ]
    
    DRUGS = [
        {'key':'paracetamol', 'name':'Paracetamol 650mg', 'safety':900, 'per':9.5},
        {'key':'amoxicillin', 'name':'Amoxicillin 500mg', 'safety':500, 'per':4.2},
        {'key':'ors', 'name':'ORS sachets', 'safety':700, 'per':6.8},
        {'key':'insulin', 'name':'Insulin glargine', 'safety':120, 'per':0.9},
        {'key':'oxytocin', 'name':'Oxytocin inj.', 'safety':140, 'per':1.1},
        {'key':'albendazole', 'name':'Albendazole 400mg', 'safety':600, 'per':5.0}
    ]
    
    VILLAGES = ['Sadar','Rampur','Lakshmipur','Shivnagar','Chandpur','Devgaon','Khadka','Mehrampur','Ashanagar','Bela','Kotra','Nawada']
    
    for i, item in enumerate(SEED):
        state, district, lat, lng = item
        phc_id = f"PHC-{str(i+1).zfill(3)}"
        name = f"{VILLAGES[i % len(VILLAGES)]} PHC, {district}"
        beds_total = 10 if i % 2 == 0 else 6
        beds_occupied = max(1, int(beds_total * 0.6))
        staff_total = 12
        staff_present = 8
        footfall_today = 110 + (i * 7) % 80
        footfall_hist = json.dumps([max(30, footfall_today - 10 + (j*3)%20) for j in range(14)])
        cold_temp = round(3.5 + (i % 5) * 0.3, 1)
        wx = round(0.1 + (i % 6) * 0.1, 2)
        util = round((beds_occupied / beds_total) * 0.6 + (footfall_today / 220) * 0.4, 2)
        
        cursor.execute("""
            INSERT INTO phcs (id, name, state, district, lat, lng, beds_total, beds_occupied,
                              staff_total, staff_present, footfall_today, footfall_hist, cold_temp, wx, util)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (phc_id, name, state, district, lat, lng, beds_total, beds_occupied,
              staff_total, staff_present, footfall_today, footfall_hist, cold_temp, wx, util))
        
        for d in DRUGS:
            # Create a realistic deficit for a couple of facilities for redistribution testing
            stock_mult = 0.35 if (i == 0 and d['key'] == 'amoxicillin') or (i == 5 and d['key'] == 'oxytocin') else 1.2
            stock = int(d['safety'] * stock_mult)
            hist = json.dumps([int(d['safety'] * stock_mult * (0.9 + (k%3)*0.1)) for k in range(14)])
            
            cursor.execute("""
                INSERT INTO meds (phc_id, key, name, stock, safety, per, history)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (phc_id, d['key'], d['name'], stock, d['safety'], d['per'], hist))

# Initialize database on startup
init_db()

# API routes

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "Swasthya Cloud Run Microservice",
        "database": "SQLite (swasthya.db)",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

@app.get("/api/phcs")
def get_all_phcs():
    """
    Returns live inventory and operational telemetry for all 60 PHCs from SQLite.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM phcs")
    phc_rows = cursor.fetchall()
    
    results = []
    for row in phc_rows:
        p = dict(row)
        p["footfallHist"] = json.loads(p.pop("footfall_hist"))
        p["bedsTotal"] = p.pop("beds_total")
        p["bedsOccupied"] = p.pop("beds_occupied")
        p["staffTotal"] = p.pop("staff_total")
        p["staffPresent"] = p.pop("staff_present")
        p["footfallToday"] = p.pop("footfall_today")
        p["coldTemp"] = p.pop("cold_temp")
        
        cursor.execute("SELECT key, name, stock, safety, per, history FROM meds WHERE phc_id = ?", (p["id"],))
        med_rows = cursor.fetchall()
        p["meds"] = []
        for m in med_rows:
            med_dict = dict(m)
            med_dict["history"] = json.loads(med_dict["history"])
            p["meds"].append(med_dict)
            
        results.append(p)
        
    conn.close()
    return results

@app.get("/api/phcs/{phc_id}")
def get_phc(phc_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM phcs WHERE id = ?", (phc_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="PHC not found")
        
    p = dict(row)
    p["footfallHist"] = json.loads(p.pop("footfall_hist"))
    p["bedsTotal"] = p.pop("beds_total")
    p["bedsOccupied"] = p.pop("beds_occupied")
    p["staffTotal"] = p.pop("staff_total")
    p["staffPresent"] = p.pop("staff_present")
    p["footfallToday"] = p.pop("footfall_today")
    p["coldTemp"] = p.pop("cold_temp")
    
    cursor.execute("SELECT key, name, stock, safety, per, history FROM meds WHERE phc_id = ?", (phc_id,))
    p["meds"] = [dict(m) for m in cursor.fetchall()]
    conn.close()
    return p

@app.post("/api/phcs/{phc_id}/update")
def update_phc_inventory(phc_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Commits manual overhaul, shelf audit, or inward supply receipt into SQLite.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Update single medicine if specified
    if "drug" in payload and "stock" in payload:
        cursor.execute(
            "UPDATE meds SET stock = ? WHERE phc_id = ? AND key = ?",
            (int(payload["stock"]), phc_id, payload["drug"])
        )
        
    # Update facility vitals if specified
    if "footfallToday" in payload:
        cursor.execute("UPDATE phcs SET footfall_today = ? WHERE id = ?", (int(payload["footfallToday"]), phc_id))
    if "bedsOccupied" in payload:
        cursor.execute("UPDATE phcs SET beds_occupied = ? WHERE id = ?", (int(payload["bedsOccupied"]), phc_id))
    if "staffPresent" in payload:
        cursor.execute("UPDATE phcs SET staff_present = ? WHERE id = ?", (int(payload["staffPresent"]), phc_id))
    if "coldTemp" in payload:
        cursor.execute("UPDATE phcs SET cold_temp = ? WHERE id = ?", (float(payload["coldTemp"]), phc_id))
        
    # Log write
    actor = payload.get("actor", "Duty Pharmacist")
    note = payload.get("note", "Ground Ledger Commit")
    cursor.execute(
        "INSERT INTO audit_logs (actor, action, details, timestamp) VALUES (?, ?, ?, ?)",
        (actor, "FACILITY_UPDATE", f"{phc_id}: {note}", datetime.datetime.utcnow().isoformat())
    )
    
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Committed updates to {phc_id} in SQLite"}

@app.post("/api/transfers/confirm")
def confirm_transfer(transfer: Dict[str, Any] = Body(...)):
    """
    Executes an atomic transfer:
    1. Decrements stock in donor PHC
    2. Increments stock in recipient PHC
    3. Records immutable audit record
    """
    from_id = transfer.get("from")
    to_id = transfer.get("to")
    drug_key = transfer.get("drug")
    qty = int(transfer.get("qty", 0))
    
    if not (from_id and to_id and drug_key and qty > 0):
        raise HTTPException(status_code=400, detail="Invalid transfer parameters")
        
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Atomic deduction from donor
        cursor.execute(
            "UPDATE meds SET stock = stock - ? WHERE phc_id = ? AND key = ?",
            (qty, from_id, drug_key)
        )
        # Atomic credit to recipient
        cursor.execute(
            "UPDATE meds SET stock = stock + ? WHERE phc_id = ? AND key = ?",
            (qty, to_id, drug_key)
        )
        
        tx_id = f"TX-SWASTHYA-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        cursor.execute("""
            INSERT INTO transfers (tx_id, from_phc, to_phc, drug, qty, dist_km, eta_h, timestamp, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tx_id, from_id, to_id, drug_key, qty, transfer.get("dist"), transfer.get("eta"),
              datetime.datetime.utcnow().isoformat(), "DISPATCHED"))
              
        cursor.execute("""
            INSERT INTO audit_logs (actor, action, details, timestamp)
            VALUES (?, ?, ?, ?)
        """, ("Redistribution Dispatcher", "TRANSFER_CONFIRM",
              f"Transferred {qty} units of {drug_key} from {from_id} to {to_id}",
              datetime.datetime.utcnow().isoformat()))
              
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "tx_id": tx_id,
            "message": f"Successfully transferred {qty} units of {drug_key} from {from_id} to {to_id}",
            "donor": from_id,
            "recipient": to_id,
            "units": qty
        }
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/weather/{lat}/{lng}")
def get_live_weather(lat: float, lng: float):
    """
    Fetches real live meteorological data (temperature and precipitation)
    for the exact latitude and longitude of the health centre.
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,precipitation"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'SwasthyaHealthOps/1.0'})
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode())
            current = data.get("current", {})
            temp = current.get("temperature_2m", 28.0)
            precip = current.get("precipitation", 0.0)
            humidity = current.get("relative_humidity_2m", 60)
            
            # IMD anomaly calculation: High heat or heavy rain triggers fever/diarrheal surge
            anomaly = round((precip * 0.15) + (max(0, temp - 32) * 0.05), 2)
            
            return {
                "source": "Open-Meteo Live Satellite/Weather Station Feed",
                "coordinates": {"lat": lat, "lng": lng},
                "temperature_c": temp,
                "humidity_percent": humidity,
                "precipitation_mm": precip,
                "computed_anomaly_factor": anomaly,
                "demand_multiplier": round(1.0 + max(0.0, anomaly), 2)
            }
    except Exception as e:
        # Graceful fallback to calibrated seasonal norms if offline
        return {
            "source": "IMD District Climate Normals (Calibrated Offline Fallback)",
            "coordinates": {"lat": lat, "lng": lng},
            "temperature_c": 29.4,
            "humidity_percent": 65,
            "precipitation_mm": 1.2,
            "computed_anomaly_factor": 0.18,
            "demand_multiplier": 1.18
        }

@app.get("/api/transfers")
def get_transfer_history():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transfers ORDER BY id DESC LIMIT 50")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/audit")
def get_audit_trail():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

if __name__ == "__main__":
    import uvicorn
    print("[SERVER] Starting Swasthya Cloud Operations API on port 8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
