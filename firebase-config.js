const FIREBASE_API_KEY = "AIzaSyAraJ4DNowz9cHxpHmq5TbzKBeTT39WHzw";
const MAPAPIKEY = "";
const GEMINIAPIKEY = "";

window.FIREBASE_CONFIG = {
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
  mapsApiKey: MAPAPIKEY,
  geminiApiKey: GEMINIAPIKEY,
  apiBase: null,
  bigqueryDataset: "swasthya_national_warehouse",
  bigqueryTable: "phc_daily_ledger",
  vertexForecastEndpoint: "projects/anantmesh-faa44/locations/asia-south1/endpoints/forecast-v1",
  geminiModel: "gemini-1.5-flash"
};
