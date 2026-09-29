# Swasthya Supply Resilience
### Real-Time National PHC Operations, Multimodal AI Field Input, and Autonomous Cross-District Redistribution

> **Google Build with AI: Code for Communities Hackathon Submission**  
> **Track 3:** Smart Health & Supply Chain Resilience  
> **Live Demo:** [https://Imanshu7.github.io/swasthya/](https://Imanshu7.github.io/swasthya/)  
> **Repository:** [https://github.com/Imanshu7/swasthya](https://github.com/Imanshu7/swasthya)

---

## Executive Summary

Across India's rural public healthcare network, over **30,000 Primary Health Centres (PHCs)** serve as the first point of medical contact for more than 800 million citizens. However, maternal emergencies, snakebite treatments, and infectious disease containment are repeatedly compromised by **preventable stockouts of essential life-saving medicines**—including Oxytocin, Paracetamol, Oral Rehydration Salts (ORS), and Amoxicillin.

These stockouts do not stem from national manufacturing shortages. Rather, they are caused by **information latency and supply friction**:
1. **Paper-Based Register Lag:** Ground staff manually record medicine dispensations in physical ledgers, creating a 7 to 21-day reporting delay before district medical officers detect a deficit.
2. **Climate & Monsoon Disconnections:** Severe weather anomalies cause unexpected disease surges (e.g. acute diarrhea or seasonal fever) while cutting off road logistics.
3. **Cold-Chain Breakdowns:** Vaccines, insulins, and uterotonics spoil when remote refrigeration systems breach the critical 2°C–8°C threshold.
4. **Isolated Inventory Silos:** While one clinic faces an acute emergency stockout, a neighboring clinic less than 50 km away often holds surplus stock expiring on the shelf.

**Swasthya Supply Resilience** bridges this operational gap. Built with Google Cloud and Gemini AI, it provides end-to-end network visibility across **60 Primary Health Centres in 12 Indian states**, empowers frontline health workers with multimodal AI tools (handwritten register OCR and multilingual voice commands), and deploys an autonomous optimization agent to dynamically rebalance medicine supplies between facilities within a 2-hour delivery window.

---

## Google Cloud & AI Technology Stack

| Google Technology | Role in Swasthya Architecture | Implementation in Platform |
| :--- | :--- | :--- |
| **Google Gemini 1.5 Flash** | Multimodal OCR & Structured Field Intelligence | Converts smartphone photos of handwritten paper registers into validated ledger entries; extracts medicine quantities from voice inputs. |
| **Google Cloud Vertex AI** | Predictive Consumption Modeling | Forecasts 7-day medicine depletion trajectories based on footfall velocity, seasonal disease curves, and IMD monsoon weather anomalies. |
| **Firebase Authentication** | ABDM / ABHA Verified Identity | Provides role-based access control for Duty Pharmacists, District Health Officers, and Warehouse Dispatchers via Phone OTP and Google Sign-In. |
| **Cloud Firestore / Realtime Ledger** | Synchronized State & Multi-Device Mesh | Sub-second real-time distributed ledger with instant cross-tab synchronization and audited change receipts. |
| **Google BigQuery** | National Health Data Warehouse | Aggregates daily burn rates, disease outbreak indicators, and cold-chain compliance telemetry across states (`swasthya_national_warehouse.phc_daily_ledger`). |
| **Google Cloud Run** | Containerized Microservices Backend | Hosts serverless dispatch coordination, OR-Tools optimization solvers, and secure backend proxy endpoints (`apiBase`). |
| **Google Maps Platform** | Geocoding & Fleet Route Dispatch | Calculates real road distances, cold-chain route polylines, and terrain travel times for inter-facility medicine transfers. |

---

## Key Capabilities & System Modules

### 1. National Network Operations Ledger
- **60 Facilities Monitored Across 12 States:** Bihar, Uttar Pradesh, Madhya Pradesh, Rajasthan, Maharashtra, West Bengal, Tamil Nadu, Karnataka, Telangana, Gujarat, Odisha, Assam, Kerala, and Punjab.
- **Dynamic Risk Stratification:** Facilities are categorized dynamically based on projected cover:
  - **Critical (< 5 days remaining):** Immediate transfer or warehouse escalation required.
  - **Stock Watch (< 12 days remaining):** Early warning alert for pre-emptive rebalancing.
  - **Stable:** Adequate reserve above mandated safety stock thresholds.
- **National KPI Strip:** Live indicators for Monitored Facilities, Critical Warnings, Average Network Cover, and Audited Ledger Writes.
- **Weather Anomaly Integration:** Real-time IMD district anomaly feed adjustments that mathematically uplift seasonal consumption rates.

### 2. Staff Operations & Field Portal
Designed specifically for frontline duty pharmacists and Auxiliary Nurse Midwives (ANMs) working in remote primary health clinics:
- **Full Shelf Audit Table:** Physical count management with inline steppers (`[-]` `[+]`), quick-fill increments (`+100`, `+500`, `Set Safe`), and instant recalculated cover metrics.
- **Vertex AI Vision OCR (Register Digitization):** Frontline workers snap a photograph of physical paper logbooks. Gemini Multimodal extracts drug names, batch quantities, and confidence ratings, committing them to the ledger in one click.
- **Multilingual Voice AI (Cloud STT):** Accepts spoken updates in 8 regional languages (**Hindi, Bengali, Marathi, Tamil, Telugu, Kannada, Gujarati, and Indian English**), extracting OPD footfall, staff attendance, and medicine stock levels.
- **Cold-Chain & Facility Vitals Monitor:** Live tracking of refrigerator temperatures (°C), power grid backup status, bed occupancy, and active staff presence.
- **Cryptographic Audit Trail:** Every ledger mutation is logged with timestamp, operator role, ABHA ID, and change summary, with JSON export capabilities.

### 3. Autonomous Redistribution Agent
- **OR-Tools & Proximity Optimization:** When a clinic enters critical status, the AI Redistribution Agent evaluates surrounding facilities within a 250 km radius.
- **Safe-Surplus Verification:** Donors are only selected if their existing inventory exceeds 150% of their own minimum safety threshold, ensuring one clinic is never depleted to save another.
- **Transfer Logistics Plan:** Automatically calculates transfer quantities, haversine road distances, and estimated travel times (@38 km/h average rural transit speed), displaying route polylines on the operations map.

### 4. State Medical Services Depot & Supplier Portal
- **Central Warehouse Inventory:** Tracks state reserve levels for primary pharmaceuticals (Paracetamol, Amoxicillin, ORS, Insulin, Oxytocin, Albendazole).
- **Consignment Fleet Dispatch:** Dispatches refrigerated cold-chain vans and standard delivery fleets with automated waybill generation and real-time transit telemetry.
- **Emergency Replenishment Simulator:** Simulates sudden patient surges and automated emergency drops from central stores.

### 5. Privacy-Preserving Federated Intelligence
- Simulates decentralized model training where individual state health departments retain raw patient footfall and consumption logs locally.
- Only differential privacy (`ε-DP`) sanitized weight deltas are aggregated at the national level using Federated Averaging (`FedAvg`), preserving citizen data confidentiality while improving national predictive accuracy.

---

## Calibrated Public Health Data Standards

All simulation parameters, formulary categorizations, and baseline metrics are anchored in verified public health sources:

1. **Ministry of Health & Family Welfare (MoHFW) / data.gov.in (HMIS):** Outpatient department footfall distributions and seasonal rural disease profiles.
2. **Indian Public Health Standards (IPHS 2022):** Mandatory bed capacity (6–10 beds per rural PHC), medical officer staffing ratios, and cold-chain infrastructure requirements.
3. **National List of Essential Medicines (NLEM India):** Formulary prioritization of essential maternal uterotonics, broad-spectrum antimicrobials, oral electrolytes, and emergency therapeutics.
4. **India Meteorological Department (IMD District Normals):** Monsoon, humidity, and heatwave anomaly multipliers driving acute diarrheal disease and fever spikes.

---

## Local Setup & Quickstart

The platform is built as a zero-dependency, high-performance static web application. No complex build pipelines or package installations are required to run locally.

### 1. Clone the Repository
```bash
git clone https://github.com/Imanshu7/swasthya.git
cd swasthya
```

### 2. Launch Local Web Server
Serve the project directory using any static file server:

**Using Python:**
```bash
python -m http.server 8080
```

**Using Node.js:**
```bash
npx serve -l 8080 .
```

### 3. Access the Operations Console
Open your web browser and navigate to:
```
http://localhost:8080
```

---

## Configuration & Google Cloud Integration

All cloud credentials and endpoints are centrally configured in [`firebase-config.js`](firebase-config.js):

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

window.GCLOUD = {
  mapsApiKey: "",              // Google Maps Platform API Key
  geminiApiKey: "",            // Google AI Studio Gemini API Key
  apiBase: "",                 // Cloud Run Microservices URL
  bigqueryDataset: "swasthya_national_warehouse",
  bigqueryTable: "phc_daily_ledger",
  vertexForecastEndpoint: "projects/your-project/locations/asia-south1/endpoints/forecast-v1",
  geminiModel: "gemini-1.5-flash"
};
```

*Note: The platform features high-fidelity client-side fallback engines. If live cloud keys are omitted, all forecasting, routing, and inventory tracking features operate seamlessly in offline simulation mode.*

---

## Keyboard Navigation Shortcuts

| Key | Action |
| :--- | :--- |
| `/` | Focus search bar to query facilities, districts, or states |
| `↑` / `↓` | Navigate through facility records in the national ledger |
| `Enter` | Select and inspect facility details in the active pane |
| `t` | Instantly launch the AI Redistribution Agent for the selected facility |

---

## Team Members
- Himanshu
- Kei

---

## License & Attribution

Developed for **Google Build with AI: Code for Communities Hackathon**.  
Released under the MIT License. Public health guidelines referenced from Government of India open data portals.
