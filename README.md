# Swasthya Supply Resilience

**Real-Time National PHC Operations, Multimodal AI Field Input, and Autonomous Cross-District Redistribution**

![Hackathon](https://img.shields.io/badge/Hackathon-Google_Build_with_AI-blue?style=for-the-badge)
![Track](https://img.shields.io/badge/Track-Healthcare_%26_Community_Resilience-10b981?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)

 
**Live Deployment:** [https://swasthya-anantvyom.web.app/](https://swasthya-anantvyom.web.app/)  
**Repository:** [https://github.com/Imanshu7/swasthya](https://github.com/Imanshu7/swasthya)

---

## The Team
- **Himanshu** – Frontend Architecture & UI/UX Design **|**  **GitHub:** [https://github.com/Imanshu7](https://github.com/Imanshu7)
- **Krish Pranami** – Backend Engineering & Cloud Architecture  **|**  **GitHub:** [https://github.com/krish180242](https://github.com/krish180242)

---

## Executive Summary
Across India's rural public healthcare network, over 30,000 Primary Health Centres (PHCs) serve as the first point of medical contact for more than 800 million citizens. However, maternal emergencies, snakebite treatments, and infectious disease containment are repeatedly compromised by preventable stockouts of essential life-saving medicines.

These stockouts are caused by information latency and supply friction:
1. **Paper-Based Register Lag:** Manual recording creates a 7 to 21-day reporting delay.
2. **Climate & Monsoon Disconnections:** Severe weather anomalies cause unexpected disease surges while cutting off road logistics.
3. **Cold-Chain Breakdowns:** Vaccines and insulins spoil when remote refrigeration systems breach the critical 2°C–8°C threshold.
4. **Isolated Inventory Silos:** One clinic may face an acute emergency stockout, while a neighboring clinic (< 50 km away) holds expiring surplus stock.

**Swasthya Supply Resilience bridges this gap.** Built with Google Cloud and Gemini AI, it provides end-to-end network visibility across 60 Primary Health Centres in 12 states. It empowers frontline workers with multimodal AI tools (OCR and voice) and deploys an autonomous optimization agent to dynamically rebalance supplies between facilities within a 2-hour delivery window.

---

## Google Cloud & AI Technology Stack

| Google Technology | Role in Swasthya Architecture | Implementation in Platform |
| :--- | :--- | :--- |
| **Google Gemini 1.5 Flash** | Multimodal OCR & Structured Intelligence | Converts photos of handwritten registers into ledger entries; extracts medicine data from voice inputs. |
| **Google Cloud Vertex AI** | Predictive Consumption Modeling | Forecasts 7-day medicine depletion trajectories based on footfall, seasonal curves, and weather anomalies. |
| **Firebase Auth** | ABDM / ABHA Verified Identity | Role-based access control for Pharmacists, Health Officers, and Dispatchers via OTP and Google Sign-In. |
| **Cloud Firestore** | Synchronized State & Multi-Device Mesh | Sub-second real-time distributed ledger with instant cross-tab synchronization. |
| **Google BigQuery** | National Health Data Warehouse | Aggregates daily burn rates, outbreak indicators, and cold-chain telemetry across states. |
| **Cloud Run** | Containerized Microservices Backend | Hosts serverless dispatch coordination, OR-Tools optimization solvers, and backend proxy endpoints. |
| **Google Maps Platform**| Geocoding & Fleet Route Dispatch | Calculates real road distances, cold-chain routes, and travel times for cross-district transfers. |

---

## Key Capabilities & System Modules

### 1. National Network Operations Ledger
- **Live Monitoring:** Tracking 60 Facilities across 12 Indian states.
- **Dynamic Risk Stratification:** Facilities are categorized as **Critical** (< 5 days remaining), **Stock Watch** (< 12 days remaining), or **Stable**.
- **Weather Anomaly Integration:** Real-time IMD district anomaly feeds mathematically uplift seasonal consumption rates.

### 2. Staff Operations & Field Portal
- **Vertex AI Vision OCR:** Frontline workers photograph physical logbooks, and Gemini extracts drug names and quantities instantly.
- **Multilingual Voice AI:** Accepts spoken updates in 8 regional languages (Hindi, Bengali, Marathi, Tamil, Telugu, Kannada, Gujarati, and English).
- **Facility Vitals Monitor:** Live tracking of refrigerator temperatures, bed occupancy, and active staff.

### 3. Autonomous Redistribution Agent
- **OR-Tools & Proximity Optimization:** Evaluates surrounding facilities within a 250 km radius when a clinic hits critical status.
- **Safe-Surplus Verification:** Donors are only selected if inventory exceeds 150% of their own minimum safety threshold.
- **Transfer Logistics:** Automatically calculates transfer quantities, haversine road distances, and estimated travel times.

### 4. State Medical Services Depot
- Tracks state reserve levels for primary pharmaceuticals (Paracetamol, ORS, Insulin, Oxytocin, etc.).
- Consignment Fleet Dispatch with automated waybill generation and real-time transit telemetry.

### 5. Privacy-Preserving Federated Intelligence
- Simulates decentralized model training. Only differential privacy (ε-DP) sanitized weight deltas are aggregated at the national level, preserving patient data confidentiality while improving forecasting.

---

## Calibrated Public Health Data Standards
All parameters, formulations, and baseline metrics are anchored in verified public sources:
1. **MoHFW / data.gov.in (HMIS):** Outpatient department footfall distributions.
2. **Indian Public Health Standards (IPHS 2022):** Mandatory bed capacity and cold-chain infrastructure requirements.
3. **National List of Essential Medicines (NLEM India):** Formulary prioritization.
4. **India Meteorological Department (IMD):** Monsoon, humidity, and heatwave anomaly multipliers.

---

## Local Setup & Quickstart

The platform is a zero-dependency, high-performance static web application. No complex build pipelines are required.

**1. Clone the Repository**
```bash
git clone [https://github.com/Imanshu7/swasthya.git](https://github.com/Imanshu7/swasthya.git)
cd swasthya
```
### 2. Launch Local Web Server

**Using Python:**
```bash
python -m http.server 8080
```

**OR Using Node.js:**
```bash
npx serve -l 8080 .
```

### 3. Access the Operations Console
Navigate to: `http://localhost:8080`

---

## Configuration & Google Cloud Integration

All cloud credentials and endpoints are centrally configured in `firebase-config.js`.
*(Note: If live cloud keys are omitted, forecasting, routing, and inventory tracking gracefully fallback to offline simulation mode).*

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
  mapsApiKey: "",
  geminiApiKey: "",
  apiBase: "",
  bigqueryDataset: "swasthya_national_warehouse",
  bigqueryTable: "phc_daily_ledger",
  vertexForecastEndpoint: "projects/your-project/locations/asia-south1/endpoints/forecast-v1",
  geminiModel: "gemini-1.5-flash"
};
```

---

## Keyboard Navigation Shortcuts

| Key | Action |
| :--- | :--- |
| `/` | Focus search bar to query facilities, districts, or states |
| `Up` / `Down` | Navigate through facility records in the national ledger |
| `Enter` | Select and inspect facility details in the active pane |
| `t` | Instantly launch the AI Redistribution Agent for the selected facility |

---

## License & Attribution
Developed for Google Build with AI: Code for Communities Hackathon.
Released under the MIT License. Public health guidelines referenced from Government of India open data portals.
