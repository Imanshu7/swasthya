
window.FIREBASE_CONFIG = {
  // Real Firebase Web API Key
  apiKey: FIREBASE_API_KEY,
  authDomain: "anantmesh-faa44.firebaseapp.com",
  databaseURL: "https://anantmesh-faa44-default-rtdb.firebaseio.com",
  projectId: "anantmesh-faa44",
  storageBucket: "anantmesh-faa44.firebasestorage.app",
  messagingSenderId: "735205080658",
  appId: "1:735205080658:web:9c6e9acaed98dd397a698b",
  measurementId: "G-0G9FDK1FZM"
};

window.GCLOUD = {
  // 1. Google Maps Platform API Key (enables Google Maps JS API & Routes API)
  mapsApiKey: MAPAPIKEY,

  // 2. Google AI Studio Gemini API Key
  geminiApiKey: GEMINIAPIKEY,

  // 3. Cloud Run Microservices Proxy URL
  apiBase: APIBASE,

  // 4. BigQuery National Health Data Warehouse configuration
  bigqueryDataset: "swasthya_national_warehouse",
  bigqueryTable: "phc_daily_ledger",

  // 5. Vertex AI AutoML Endpoint for predictive medicine depletion
  vertexForecastEndpoint: "projects/anantmesh-faa44/locations/asia-south1/endpoints/forecast-v1",

  // Gemini Model Identifier
  geminiModel: "gemini-1.5-flash"
};
