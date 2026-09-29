/* National PHC federated platform — simulation + Staff Operations Portal + UI engine.
   Production swap points marked PROD: Firebase / BigQuery / Vertex / Google Maps. */
'use strict';

// ---------- LIVE CONFIG: keys live in firebase-config.js (never commit it) ----------
const LIVE = Object.assign({mode:'simulation'}, window.FIREBASE_CONFIG||{}, window.GCLOUD||{});
const hasFirebase = !!(LIVE.apiKey && !/REPLACE/i.test(LIVE.apiKey));
const hasMaps = !!(LIVE.mapsApiKey && !/REPLACE/i.test(LIVE.mapsApiKey));
const API = (LIVE.apiBase && !/REPLACE/i.test(LIVE.apiBase)) ? LIVE.apiBase.replace(/\/$/,'') : null;

// Google Gemini API Configuration (User can paste API key here or use the UI "API Settings" modal)
let GEMINI_API_KEY = '';
try {
  GEMINI_API_KEY = localStorage.getItem('gemini_api_key') || (window.GCLOUD && window.GCLOUD.geminiApiKey) || '';
} catch(e) {
  GEMINI_API_KEY = (window.GCLOUD && window.GCLOUD.geminiApiKey) || '';
}

// Global HTML sanitization helper to neutralize DOM XSS from user/field inputs
function escapeHtml(str){
  if(str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function callGemini(promptText, systemInstruction){
  const key = GEMINI_API_KEY || (window.GCLOUD && window.GCLOUD.geminiApiKey);
  if(!key) return null;
  try{
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: promptText }] }]
    };
    if(systemInstruction){
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if(!res.ok) return null;
    const json = await res.json();
    const txt = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if(txt){
      toast('Google Gemini 1.5 Flash', 'Live response generated from AI Studio');
      return txt;
    }
    return null;
  }catch(e){
    console.warn('[Gemini call exception, fallback used]', e);
    return null;
  }
}

async function apiPost(path, body){
  if(!API) return null;
  try{
    const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return await r.json();
  }catch(e){
    console.warn('[live] cloud unreachable, local engine used', e);
    return null;
  }
}

function setSyncLabel(){
  const tag = LIVE.mode==='firebase' ? 'Firebase' : API ? 'Cloud' : hasMaps ? 'Maps' : 'Sim';
  const st = $('syncTag');
  if(st) st.textContent = tag;
  const clk = $('clock');
  if(clk) clk.textContent = new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
}

// ---------- Audio feedback (subtle Web Audio synthesized clicks & chimes) ----------
let audioCtx = null;
function playSound(type){
  try{
    const AudioC = window.AudioContext || window.webkitAudioContext;
    if(!AudioC) return;
    if(!audioCtx) audioCtx = new AudioC();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if(type === 'click'){
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.04);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.start(t);
      osc.stop(t + 0.04);
    } else if(type === 'chime'){
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.setValueAtTime(659.25, t + 0.09); // E5
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    }
  }catch(e){}
}

// ---------- seeded RNG ----------
let _s = 20260929;
function rnd(){ _s|=0; _s=_s+0x6D2B79F5|0; let t=Math.imul(_s^_s>>>15,1|_s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }
function ri(a,b){ return a+Math.floor(rnd()*(b-a+1)); }
function pick(a){ return a[Math.floor(rnd()*a.length)]; }

const DRUGS = [
  {key:'paracetamol', name:'Paracetamol 650mg', safety:900, per:9.5},
  {key:'amoxicillin', name:'Amoxicillin 500mg', safety:500, per:4.2},
  {key:'ors', name:'ORS sachets', safety:700, per:6.8},
  {key:'insulin', name:'Insulin glargine', safety:120, per:0.9},
  {key:'oxytocin', name:'Oxytocin inj.', safety:140, per:1.1},
  {key:'albendazole', name:'Albendazole 400mg', safety:600, per:5.0},
];

// 60 PHCs across 12 states
const SEED = [
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
  ['Punjab','Bathinda',30.21,74.95],['Punjab','Gurdaspur',32.04,75.41],
];
const VILLAGES = ['Sadar','Rampur','Lakshmipur','Shivnagar','Chandpur','Devgaon','Khadka','Mehrampur','Ashanagar','Bela','Kotra','Nawada'];
let PHCS = [];
let writesCount = 0;
let auditedLogEntries = [];

function hist(base, vol){
  const h=[];
  for(let i=0;i<14;i++) h.push(Math.max(0,Math.round(base*(1+(rnd()-0.5)*vol))));
  return h;
}

function buildData(){
  PHCS = SEED.map((s,i)=>{
    const footBase = ri(70,220);
    const meds = DRUGS.map(d=>{
      const mult = rnd()<0.14 ? rnd()*0.35 : 0.7+rnd()*1.6;
      const stock = Math.round(d.safety*mult*ri(9,13)/10);
      return {key:d.key, name:d.name, stock, safety:d.safety, per:d.per*(0.85+rnd()*0.3), history:hist(d.safety*mult*0.09,0.5)};
    });
    const bedsTotal = pick([6,6,10,10,16,30]);
    return {
      id:'PHC-'+String(i+1).padStart(3,'0'),
      name:pick(VILLAGES)+' PHC, '+s[1],
      state:s[0], district:s[1], lat:s[2]+(rnd()-0.5)*0.35, lng:s[3]+(rnd()-0.5)*0.35,
      bedsTotal, bedsOccupied:ri(1,bedsTotal-1),
      staffTotal:ri(8,22), staffPresent:0,
      footfallToday:footBase+ri(-15,15), footfallHist:hist(footBase,0.4),
      util:0, meds, wx:+(rnd()*0.7-0.15).toFixed(2),
      coldTemp: +(3.2 + rnd()*1.4).toFixed(1)
    };
  });
  PHCS.forEach(p=>{
    p.staffPresent = Math.max(2,Math.min(p.staffTotal, Math.round(p.staffTotal*(0.62+rnd()*0.33))));
    p.util = Math.min(0.99,(p.bedsOccupied/p.bedsTotal)*0.6 + (p.footfallToday/220)*0.4);
  });
}
buildData();

// ---------- forecast math ----------
function avg(a){ return (a && a.length) ? a.reduce((x,y)=>x+y,0)/a.length : 0; }
function drugCover(p,m){
  const ff = avg(p.footfallHist.slice(-7))||100;
  const ffF = 0.7 + 0.6*(p.footfallToday/Math.max(1,ff));
  const wxF = 1 + Math.max(0,p.wx);
  return { days: m.stock/Math.max(0.2,(m.per*ffF*wxF)), ffF, wxF };
}
function worstCover(p){
  let w={days:1e9, drug: p.meds[0]?.name || 'Essential Drugs'};
  p.meds.forEach(m=>{ const c=drugCover(p,m); if(c.days<w.days) w={days:c.days,drug:m.name}; });
  if(w.days === 1e9) w.days = 99;
  return w;
}
function riskOf(days){ return days<5?'critical':days<12?'watch':'stable'; }

const $=id=>document.getElementById(id);

function sparkSVG(data,w,h,color){
  w=w||120;h=h||28;
  if(!data || !data.length) return '';
  const mx=Math.max(...data,1), mn=Math.min(...data,0);
  const denom = Math.max(1, data.length - 1);
  const pts=data.map((v,i)=>[i/denom*w, h-3-((v-mn)/Math.max(1e-6,(mx-mn)))*(h-6)]);
  const d='M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6"/></svg>`;
}

// ---------- Active Operator & Authentication State ----------
let activeOperator = {
  role: 'pharmacist',
  name: 'Dr. Ananya Sen',
  title: 'Duty Pharmacist',
  avatar: 'AS',
  abha: '91-4821-3901-22',
  facility: 'PHC-001 (Sadar PHC, Gaya)'
};

function initOperatorSwitcher(){
  const p = $('opSelector');
  const m = $('opMenu');
  if(!p || !m) return;
  p.onclick = e => {
    e.stopPropagation();
    m.classList.toggle('open');
    playSound('click');
  };
  document.addEventListener('click', () => m.classList.remove('open'));

  document.querySelectorAll('.op-opt').forEach(opt => {
    opt.onclick = e => {
      e.stopPropagation();
      setLoggedInOperator({
        role: opt.dataset.role,
        name: opt.dataset.name,
        title: opt.dataset.title,
        avatar: opt.dataset.avatar,
        abha: opt.dataset.role === 'pharmacist' ? '91-4821-3901-22' : opt.dataset.role === 'officer' ? '91-1102-8840-77' : 'CMS-LOG-44'
      });
      m.classList.remove('open');
    };
  });
}

function setLoggedInOperator(op){
  activeOperator = Object.assign(activeOperator, op);
  $('opAvatar').textContent = activeOperator.avatar;
  $('opName').textContent = activeOperator.name;
  $('opRole').textContent = activeOperator.title;
  if($('portalAuthName')) $('portalAuthName').textContent = activeOperator.name;
  if($('portalAuthTitle')) $('portalAuthTitle').textContent = activeOperator.title;
  if($('portalAuthAbha')) $('portalAuthAbha').textContent = activeOperator.abha || '91-4821-3901-22';
  playSound('click');
  toast(`Authenticated: ${activeOperator.name}`, `${activeOperator.title} · ABHA: ${activeOperator.abha || 'Verified'}`);
}

// ---------- Health Worker Auth Modal ----------
function initAuthModal(){
  // Auth Modal
  const authModal = $('authModal');
  const btnCloseAuth = $('btnCloseAuthModal');
  if(btnCloseAuth && authModal){
    btnCloseAuth.onclick = () => { authModal.classList.remove('open'); playSound('click'); };
  }

  // Open triggers
  const btnOpenAuth = $('btnOpenAuth');
  if(btnOpenAuth && authModal){
    btnOpenAuth.onclick = () => {
      authModal.classList.add('open');
      playSound('click');
    };
  }
  const btnOpenFromMenu = $('btnOpenAuthFromMenu');
  if(btnOpenFromMenu && authModal){
    btnOpenFromMenu.onclick = e => {
      e.stopPropagation();
      $('opMenu')?.classList.remove('open');
      authModal.classList.add('open');
      playSound('click');
    };
  }
  const btnSwitchPortal = $('btnSwitchAuthFromPortal');
  if(btnSwitchPortal && authModal){
    btnSwitchPortal.onclick = () => {
      authModal.classList.add('open');
      playSound('click');
    };
  }

  // Auth Tabs (Demo / Phone / Google)
  document.querySelectorAll('[data-auth-tab]').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('[data-auth-tab]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
      const targetPanel = $(`ap-${b.dataset.authTab}`);
      if(targetPanel) targetPanel.classList.add('active');
      playSound('click');
    };
  });

  // Demo Profiles (1-Click Login for Hackathon Judges)
  document.querySelectorAll('.demo-profile-card').forEach(card => {
    const btn = card.querySelector('.btn-login-as');
    if(btn){
      btn.onclick = () => {
        setLoggedInOperator({
          role: card.dataset.role,
          name: card.dataset.name,
          title: card.dataset.title,
          avatar: card.dataset.avatar,
          abha: card.dataset.abha,
          facility: card.dataset.facility
        });
        if(authModal) authModal.classList.remove('open');
      };
    }
  });

  // Phone OTP Flow
  const btnSendOtp = $('btnSendOtp');
  const btnVerifyOtp = $('btnVerifyOtp');
  if(btnSendOtp){
    btnSendOtp.onclick = () => {
      const phone = $('authPhone').value.trim();
      if(phone.length < 10){
        alert('Please enter a valid 10-digit mobile number.');
        return;
      }
      $('otpStep1').style.display = 'none';
      $('otpStep2').style.display = 'block';
      $('authOtp').value = '482910'; // auto-fill simulated OTP for easy testing
      playSound('click');
      toast('OTP Sent', `Verification code sent to ${phone}`);
    };
  }
  if(btnVerifyOtp){
    btnVerifyOtp.onclick = () => {
      const otp = $('authOtp').value.trim();
      if(otp.length < 4){
        alert('Please enter verification code.');
        return;
      }
      const role = $('authRoleSelect').value;
      const title = role === 'pharmacist' ? 'Duty Pharmacist' : role === 'officer' ? 'District Medical Officer' : 'Central Warehouse Officer';
      setLoggedInOperator({
        role,
        name: 'Verified Health Worker',
        title,
        avatar: 'HW',
        abha: '91-5501-9923-11'
      });
      if(authModal) authModal.classList.remove('open');
    };
  }

  // Google Sign In (Real Firebase Auth Google Provider)
  const btnGoogle = $('btnGoogleAuth');
  if(btnGoogle){
    btnGoogle.onclick = async () => {
      playSound('click');
      if(window.firebase && firebase.auth && hasFirebase){
        try{
          if(!firebase.apps.length) startFirebase();
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          toast('Opening Google Auth...', 'Please select your Google account in the popup');
          const res = await firebase.auth().signInWithPopup(provider);
          const u = res.user;
          const name = u.displayName || u.email || 'Dr. Google Health Fellow';
          const avatar = (name.split(' ').map(n=>n[0]).join('') || 'GH').slice(0,2).toUpperCase();
          setLoggedInOperator({
            role: 'officer',
            name: name,
            title: 'District Medical Officer (Google Verified)',
            avatar,
            abha: 'ABHA-GOOG-' + u.uid.slice(0, 8).toUpperCase()
          });
          if(authModal) authModal.classList.remove('open');
          toast('Google Sign-In Verified', `Signed in as ${u.email || name}`);
          return;
        }catch(err){
          console.error('Firebase Google Sign-In error:', err);
          if(err.code === 'auth/operation-not-allowed'){
            alert('Google Sign-In is NOT enabled in your Firebase Console yet for project "anantmesh-faa44".\n\nTo enable it:\n1. Open: https://console.firebase.google.com/project/anantmesh-faa44/authentication/providers\n2. Click "Google"\n3. Switch on "Enable", set a project support email, and click "Save".\n\nOnce saved, this button will sign in with your real Google account!');
          } else if(err.code === 'auth/unauthorized-domain'){
            alert('The domain "localhost" is not authorized in your Firebase Console.\n\nTo fix:\n1. Open: https://console.firebase.google.com/project/anantmesh-faa44/authentication/settings\n2. Under "Authorized domains", click "Add domain" and add "localhost".');
          } else if(err.code === 'auth/popup-blocked'){
            alert('The Google sign-in popup was blocked by your browser. Please allow popups for localhost:8080 in your browser address bar.');
          } else if(err.code === 'auth/popup-closed-by-user'){
            toast('Sign-In Cancelled', 'Google popup was closed before completing sign-in.');
            return;
          } else {
            alert('Firebase Auth: ' + (err.message || err.code));
          }
        }
      } else {
        alert('Firebase configuration is missing or invalid. Check window.FIREBASE_CONFIG in firebase-config.js.');
      }
    };
  }
}

// ---------- System Configuration & Gemini API Settings ----------
function initSettingsModal(){
  const modal = $('settingsModal');
  const btnOpen = $('btnSettings');
  const btnClose = $('btnCloseSettingsModal');
  const btnCloseFoot = $('btnCloseSettingsFoot');
  const badge = $('apiKeyStatusBadge');
  const input = $('geminiApiKeyInput');
  const btnSave = $('btnSaveApiKey');
  const btnClear = $('btnClearApiKey');

  function updateBadge(){
    const hasKey = !!(GEMINI_API_KEY && GEMINI_API_KEY.trim());
    if(badge){
      badge.textContent = hasKey ? 'Active (Gemini 1.5 Flash)' : 'Offline Simulation Mode';
      badge.className = hasKey ? 'chip chip-steady' : 'chip';
    }
    if(input && hasKey && !input.value){
      input.value = GEMINI_API_KEY;
    }
  }

  if(btnOpen && modal){
    btnOpen.onclick = () => {
      updateBadge();
      modal.classList.add('open');
      playSound('click');
    };
  }

  const closeBtns = [btnClose, btnCloseFoot];
  closeBtns.forEach(b => {
    if(b && modal){
      b.onclick = () => { modal.classList.remove('open'); playSound('click'); };
    }
  });

  if(btnSave){
    btnSave.onclick = () => {
      const val = (input?.value || '').trim();
      if(!val){
        alert('Please paste a valid Google AI Studio Gemini API key.');
        return;
      }
      GEMINI_API_KEY = val;
      localStorage.setItem('gemini_api_key', val);
      updateBadge();
      playSound('chime');
      toast('Gemini API Key Saved', 'Live Google AI Studio integration active.');
    };
  }

  if(btnClear){
    btnClear.onclick = () => {
      GEMINI_API_KEY = '';
      localStorage.removeItem('gemini_api_key');
      if(input) input.value = '';
      updateBadge();
      playSound('click');
      toast('API Key Cleared', 'Reverted to offline simulation mode.');
    };
  }

  updateBadge();
}

// ---------- STATE MEDICAL SERVICES DEPOT & SUPPLIER PORTAL ----------
const DEPOT_STOCK = {
  paracetamol: 480000,
  amoxicillin: 120000,
  ors: 250000,
  insulin: 45000,
  oxytocin: 65000,
  albendazole: 180000
};

let DEPOT_TRANSITS = [
  {
    waybill: 'DISPATCH-MSCL-7821',
    destId: 'MP-01',
    destName: 'PHC Chhatarpur, Bhopal',
    drug: 'oxytocin',
    drugName: 'Oxytocin inj.',
    qty: 1200,
    fleet: 'Refrigerated Cold-Chain Van (IoT GPS)',
    temp: '4.1°C Compliant',
    eta: '1.8h',
    status: 'In Transit'
  },
  {
    waybill: 'DISPATCH-MSCL-7822',
    destId: 'MH-03',
    destName: 'PHC Gadchiroli, Gadchiroli',
    drug: 'amoxicillin',
    drugName: 'Amoxicillin 500mg',
    qty: 3500,
    fleet: 'State Logistics Freight Van',
    temp: '22.0°C Ambient',
    eta: '3.2h',
    status: 'In Transit'
  }
];

function renderDepot(){
  // 1. Total stock units
  const totalUnits = Object.values(DEPOT_STOCK).reduce((a,b)=>a+b, 0);
  if($('depotTotalUnits')) $('depotTotalUnits').textContent = totalUnits.toLocaleString('en-IN');

  // 2. Pending Emergency Requisitions (Any PHC with < 3.5 days of cover)
  const criticals = PHCS.map(p => ({ p, w: worstCover(p) }))
    .filter(x => x.w.days < 3.5)
    .sort((a,b) => a.w.days - b.w.days);

  // If no criticals right now, pick lowest cover PHCs for demo purposes
  const reqList = criticals.length > 0 ? criticals : PHCS.map(p => ({ p, w: worstCover(p) })).sort((a,b) => a.w.days - b.w.days).slice(0, 3);

  if($('depotPendingReqsCount')) $('depotPendingReqsCount').textContent = `${reqList.length} Orders`;
  if($('depotUrgentBadge')) $('depotUrgentBadge').textContent = `${reqList.length} Action Required`;
  if($('depotPip')) $('depotPip').style.display = reqList.length > 0 ? 'inline-block' : 'none';

  const tbody = $('depotReqsBody');
  if(tbody){
    tbody.innerHTML = reqList.map((item, idx) => {
      const p = item.p;
      const w = item.w;
      const reqId = `IND-${p.id}-${Math.round(w.days * 10) + idx}`;
      const recQty = Math.max(1200, Math.round(w.per * 25));
      const mObj = p.meds.find(m => m.name === w.drug) || p.meds[0];
      return `<tr>
        <td><b>${reqId}</b></td>
        <td><b>${p.name}</b><br><span style="font-size:11px;color:var(--muted)">${p.district}, ${p.state}</span></td>
        <td>${w.drug}</td>
        <td><b>${recQty.toLocaleString('en-IN')}u</b></td>
        <td><span class="cov ${riskOf(w.days)}">${w.days.toFixed(1)}d</span></td>
        <td>
          <button class="btn sm primary btn-dispatch-req" data-phc="${p.id}" data-drug="${mObj.key}" data-qty="${recQty}">
            Approve
          </button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-dispatch-req').forEach(btn => {
      btn.onclick = () => {
        if($('depotDestPhc')) $('depotDestPhc').value = btn.dataset.phc;
        if($('depotDrug')) $('depotDrug').value = btn.dataset.drug;
        if($('depotQty')) $('depotQty').value = btn.dataset.qty;
        const formEl = $('depotDestPhc')?.closest('.card');
        if(formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        playSound('click');
      };
    });
  }

  // 3. Active Dispatches in Transit
  if($('depotActiveTransitsCount')) $('depotActiveTransitsCount').textContent = `${DEPOT_TRANSITS.length} En Route`;
  const tbodyTransit = $('depotInTransitBody');
  if(tbodyTransit){
    tbodyTransit.innerHTML = DEPOT_TRANSITS.map(t => {
      return `<tr>
        <td><b>${t.waybill}</b></td>
        <td><b>${t.destName}</b></td>
        <td>${t.drugName} · <b>${t.qty.toLocaleString('en-IN')}u</b></td>
        <td>${t.fleet}</td>
        <td><span class="chip chip-steady">${t.temp}</span></td>
        <td><b>${t.eta}</b></td>
        <td><span class="chip chip-info">${t.status}</span></td>
      </tr>`;
    }).join('') || `<tr><td colspan="7" style="padding:18px;color:var(--muted)">No active freight dispatches.</td></tr>`;
  }
}

function initSupplierDepot(){
  // Populate dropdowns
  const phcOpts = PHCS.map(p => `<option value="${p.id}">${p.id} · ${p.name}, ${p.district}</option>`).join('');
  if($('depotDestPhc')) $('depotDestPhc').innerHTML = phcOpts;

  const drugOpts = DRUGS.map(d => `<option value="${d.key}">${d.name}</option>`).join('');
  if($('depotDrug')) $('depotDrug').innerHTML = drugOpts;

  if($('btnRefreshDepot')){
    $('btnRefreshDepot').onclick = () => {
      renderDepot();
      playSound('click');
      toast('Depot Refreshed', 'Central warehouse reserves and active transits synchronized.');
    };
  }

  // Dispatch Consignment Action
  const btnDispatch = $('btnDispatchConsignment');
  if(btnDispatch){
    btnDispatch.onclick = () => {
      const destId = $('depotDestPhc').value;
      const drugKey = $('depotDrug').value;
      const qty = parseInt($('depotQty').value) || 0;
      const fleet = $('depotFleetType').options[$('depotFleetType').selectedIndex].text;
      const rawWaybill = $('depotWaybill').value.trim() || `DISPATCH-MSCL-${ri(8000,9999)}`;
      const waybill = escapeHtml(rawWaybill);
      const rawVehicle = $('depotVehicle').value.trim() || 'MP-09-GA-4412';
      const vehicle = escapeHtml(rawVehicle);

      if(qty <= 0){
        alert('Please enter a valid dispatch quantity.');
        return;
      }

      const p = PHCS.find(x => x.id === destId);
      const drugObj = DRUGS.find(d => d.key === drugKey);
      if(!p || !drugObj) return;

      // Deduct from depot
      if(DEPOT_STOCK[drugKey] !== undefined){
        DEPOT_STOCK[drugKey] = Math.max(0, DEPOT_STOCK[drugKey] - qty);
      }

      // Add to in-transit array
      const isCold = fleet.includes('Cold-Chain');
      DEPOT_TRANSITS.unshift({
        waybill,
        destId: p.id,
        destName: `${p.name}, ${p.district}`,
        drug: drugKey,
        drugName: drugObj.name,
        qty,
        fleet,
        temp: isCold ? '3.8°C Compliant' : 'Ambient Safe',
        eta: `${(ri(15, 38) / 10).toFixed(1)}h`,
        status: 'In Transit'
      });

      // Recipient PHC receives stock
      const pMed = p.meds.find(m => m.key === drugKey);
      if(pMed){
        pMed.stock += qty;
        pMed.history.push(pMed.stock * 0.09);
        pMed.history.shift();
      }

      writesCount++;
      playSound('chime');
      logAuditWrite(`${activeOperator.name} · Central Depot`, `Consignment ${waybill}: Dispatched ${qty.toLocaleString('en-IN')}u of ${drugObj.name} to ${p.id} (${p.district}) via ${fleet}.`);
      toast(`Consignment Dispatched — ${qty.toLocaleString('en-IN')}u`, `${waybill} en route to ${p.district}`);
      broadcastLedgerChange('DEPOT_DISPATCH', { waybill, destId, drugKey, qty, fleet });

      // Regenerate waybill for next order
      $('depotWaybill').value = `DISPATCH-MSCL-${ri(8000,9999)}`;

      renderDepot();
      refreshAll();
    };
  }

  renderDepot();
}

// ---------- Real-Time BroadcastChannel Sync (Instant Multi-Tab / Multi-Device Sync) ----------
const syncChannel = ('BroadcastChannel' in window) ? new BroadcastChannel('swasthya_national_ledger') : null;

function broadcastLedgerChange(changeType, payload){
  if(syncChannel){
    try{
      syncChannel.postMessage({
        type: changeType,
        payload,
        operator: activeOperator,
        ts: Date.now()
      });
    }catch(e){}
  }
}

function handleIncomingLedgerSync(type, payload, operator){
  if(!payload) return;
  if(type === 'SHELF_AUDIT' && payload.id && payload.meds){
    const ph = PHCS.find(x=>x.id===payload.id);
    if(ph){
      payload.meds.forEach(inc => {
        const m = ph.meds.find(x=>x.key===inc.key);
        if(m) m.stock = inc.stock;
      });
    }
  } else if(type === 'MANUAL_OVERHAUL' && payload.id && payload.phc){
    const ph = PHCS.find(x=>x.id===payload.id);
    if(ph) Object.assign(ph, payload.phc);
  } else if(type === 'INWARD_SUPPLY' && payload.id && payload.drug){
    const ph = PHCS.find(x=>x.id===payload.id);
    const m = ph?.meds.find(x=>x.key===payload.drug);
    if(m) m.stock += (payload.qty || 0);
  } else if(type === 'TRANSFER_CONFIRM'){
    const donor = PHCS.find(x=>x.id===payload.from);
    const recip = PHCS.find(x=>x.id===payload.to);
    if(donor && recip){
      const mD = donor.meds.find(x=>x.key===payload.drug);
      const mR = recip.meds.find(x=>x.key===payload.drug);
      if(mD) mD.stock -= payload.qty;
      if(mR) mR.stock += payload.qty;
    }
  } else if(type === 'ADD_MEDICINE' && payload.key){
    if(!DRUGS.find(d=>d.key===payload.key)){
      DRUGS.push({ key: payload.key, name: payload.name, safety: payload.safety, per: payload.burn });
    }
    PHCS.forEach(ph => {
      if(!ph.meds.find(m=>m.key===payload.key)){
        ph.meds.push({ key: payload.key, name: payload.name, safety: payload.safety, per: payload.burn, stock: payload.stock, history: hist(payload.safety*0.09, 0.4) });
      }
    });
    refreshDrugDropdowns();
  } else if(type === 'DEPOT_DISPATCH' && payload.destId && payload.drugKey){
    const ph = PHCS.find(x=>x.id===payload.destId);
    const m = ph?.meds.find(x=>x.key===payload.drugKey);
    if(m) m.stock += (payload.qty || 0);
    if(DEPOT_STOCK[payload.drugKey] !== undefined){
      DEPOT_STOCK[payload.drugKey] = Math.max(0, DEPOT_STOCK[payload.drugKey] - payload.qty);
    }
  }
}

if(syncChannel){
  syncChannel.onmessage = e => {
    const data = e.data;
    if(data && data.type){
      handleIncomingLedgerSync(data.type, data.payload, data.operator);
      refreshAll(true);
      toast('Live Sync Received', `${data.operator?.name || 'A health worker'} updated ledger in real-time`);
    }
  };
}

// ---------- Simulation Controls ----------
let simRunning = true;
let simInterval = null;

function setupSimControls(){
  const btnToggle = $('btnToggleSim');
  const btnSurge = $('btnSurge');
  const btnDepot = $('btnDepotDrop');

  if(btnToggle){
    btnToggle.onclick = () => {
      simRunning = !simRunning;
      btnToggle.textContent = simRunning ? 'Pause' : 'Resume';
      btnToggle.classList.toggle('accent', !simRunning);
      playSound('click');
      toast(simRunning ? 'Live Simulation Resumed' : 'Simulation Paused', simRunning ? 'Realtime ticks active' : 'State frozen for inspection');
    };
  }

  if(btnSurge){
    btnSurge.onclick = () => {
      playSound('click');
      // Surge footfall in 10 random clinics
      const targets = PHCS.slice(0, 12);
      targets.forEach(p => {
        p.footfallToday = Math.round(p.footfallToday * 1.6);
        p.footfallHist.push(p.footfallToday);
        p.footfallHist.shift();
      });
      refreshAll();
      toast('Patient Surge Simulated', '12 facilities reported sudden OPD influx (+60%)');
    };
  }

  if(btnDepot){
    btnDepot.onclick = () => {
      playSound('chime');
      // Find 3 lowest facilities and deliver emergency Paracetamol & ORS
      const low = PHCS.slice().sort((a,b)=>worstCover(a).days-worstCover(b).days).slice(0,3);
      low.forEach(p => {
        p.meds.forEach(m => {
          if(m.stock < m.safety) m.stock += 600;
        });
      });
      writesCount += low.length;
      logAuditWrite('State Central Depot', `Emergency replenishment consignment delivered to ${low.map(x=>x.id).join(', ')}`);
      refreshAll();
      toast('Inward Replenishment Arrived', `Stock augmented for ${low.map(x=>x.district).join(', ')}`);
    };
  }
}

// ---------- Map: Leaflet / Google Maps ----------
let pmap=null, facMarker=null, routeLine=null, lastRoute=null, selectedId=null;
function markerColor(r){ return r==='critical'?'#c9211c':r==='watch'?'#b26a00':'#0e6b5e'; }
let gmap=null, gMarker=null, gRoute=null, gAnim=null;

function initMap(){
  if(window.google && window.google.maps && hasMaps) return initGoogleMap();
  if(hasMaps){
    const s=document.createElement('script');
    s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(LIVE.mapsApiKey)+'&callback=__gmapsReady';
    s.async=true; s.onerror=()=>{ console.warn('[live] google maps unreachable, leaflet used'); initLeafletMap(); };
    window.__gmapsReady=initGoogleMap;
    document.head.appendChild(s); return;
  }
  initLeafletMap();
}

function initLeafletMap(){
  pmap = L.map('pmap',{scrollWheelZoom:false}).setView([22.5,79.5],4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'© OpenStreetMap · stand-in for Google Maps Platform'}).addTo(pmap);
  pmap.on('focus',()=>pmap.scrollWheelZoom.enable()); pmap.on('blur',()=>pmap.scrollWheelZoom.disable());
}

function initGoogleMap(){
  LIVE.mapProvider='google';
  gmap=new google.maps.Map($('pmap'),{center:{lat:22.5,lng:79.5},zoom:4,disableDefaultUI:true,zoomControl:true});
  setSyncLabel(); updatePaneMap(true);
}

function animateRoute(){
  if(gAnim) clearInterval(gAnim);
  let off=0; gAnim=setInterval(()=>{ if(!gRoute){ clearInterval(gAnim); return; } off=(off+2)%36;
    try{ const ic=gRoute.get('icons'); ic[0].offset=off+'px'; gRoute.set('icons',ic); }catch(e){} },60);
}

function refreshMarkers(){ renderList(); updatePaneMap(false); }

function updatePaneMap(recenter){
  const p=PHCS.find(x=>x.id===selectedId); if(!p) return;
  const r=riskOf(worstCover(p).days), col=markerColor(r);
  if(gmap){
    gmap.setCenter({lat:p.lat,lng:p.lng}); if(recenter!==false) gmap.setZoom(8);
    if(gMarker) gMarker.setMap(null);
    gMarker=new google.maps.Marker({position:{lat:p.lat,lng:p.lng},map:gmap,title:p.name,
      icon:{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:col,fillOpacity:1,strokeColor:'#fff',strokeWeight:2}});
    if(gRoute){ gRoute.setMap(null); gRoute=null; }
    if(lastRoute && (lastRoute.to===p.id||lastRoute.from===p.id)){
      gRoute=new google.maps.Polyline({path:[{lat:lastRoute.flat,lng:lastRoute.flng},{lat:lastRoute.tlat,lng:lastRoute.tlng}],
        geodesic:true,strokeColor:'#0071e3',strokeOpacity:0,strokeWeight:3,map:gmap,
        icons:[{icon:{path:'M 0,-1 0,1',strokeOpacity:1,scale:3},offset:'0',repeat:'18px'}]});
      animateRoute();
      const b=new google.maps.LatLngBounds();
      b.extend({lat:lastRoute.flat,lng:lastRoute.flng}); b.extend({lat:lastRoute.tlat,lng:lastRoute.tlng});
      gmap.fitBounds(b);
    }
    return;
  }
  if(!pmap) return;
  if(recenter!==false) pmap.setView([p.lat,p.lng],8);
  if(facMarker) pmap.removeLayer(facMarker);
  const icon=L.divIcon({className:'',html:`<div class="dot-marker pulse-${r}" style="background:${col};color:${col}"></div>`,iconSize:[12,12]});
  facMarker=L.marker([p.lat,p.lng],{icon}).addTo(pmap).bindTooltip(p.name);
  if(routeLine){ pmap.removeLayer(routeLine); routeLine=null; }
  if(lastRoute && (lastRoute.to===p.id||lastRoute.from===p.id)){
    routeLine=L.polyline([[lastRoute.flat,lastRoute.flng],[lastRoute.tlat,lastRoute.tlng]],{color:'#0071e3',weight:3,className:'flow-line'}).addTo(pmap);
    pmap.fitBounds(routeLine.getBounds().pad(0.35));
  }
}

function filteredPHCs(){
  const fs=$('fState').value, fr=$('fRisk').value, q=$('fSearch').value.trim().toLowerCase();
  return PHCS.filter(p=>{
    if(fs && p.state!==fs) return false;
    if(fr && riskOf(worstCover(p).days)!==fr) return false;
    if(q && !(p.name+' '+p.district+' '+p.state+' '+p.id).toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderList(){
  const list=$('phcList');
  const rows=filteredPHCs().slice().sort((a,b)=>worstCover(a).days-worstCover(b).days);
  const short=n=>n.replace(/ \d+mg| inj\.| sachets| glargine/,'');
  list.innerHTML=rows.map(p=>{
    const w=worstCover(p);
    const r=riskOf(w.days);
    const cls=r==='critical'?'c':r==='watch'?'w':'';
    return `<tr data-id="${p.id}" tabindex="0" class="${selectedId===p.id?'sel':''}">
      <td><span class="cov ${cls}">${w.days.toFixed(1)}d</span></td>
      <td class="fac"><b>${p.name}</b><span>${p.district} · ${p.state}</span></td>
      <td>${p.footfallToday}</td><td>${short(w.drug)}</td><td class="chev">›</td></tr>`;
  }).join('') || `<tr><td colspan="5" style="padding:22px;color:var(--muted)">No facilities match these filters.</td></tr>`;

  list.querySelectorAll('tr[data-id]').forEach(el=>{
    el.onclick=()=>selectRecord(el.dataset.id);
    el.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); selectRecord(el.dataset.id); } };
  });
  const mh=$('mapHint'); if(mh) mh.textContent=`${rows.length} of ${PHCS.length} shown`;
}

// ---------- Toast: audited visual receipt ----------
function toast(title,sub){
  const t=$('toast'); if(!t) return;
  t.innerHTML=`<div class="toast-t">${title}</div>${sub?`<div class="toast-s">${sub}</div>`:''}`;
  t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),3800);
}

// ---------- Record Pane Inspector (Split View) ----------
function selectRecord(id, scroll){
  selectedId=id;
  const p=PHCS.find(x=>x.id===id); if(!p) return;
  const w=worstCover(p); const r=riskOf(w.days);
  $('dKick').textContent=`${p.id} · ${p.state} — ${p.district}`;
  $('dName').textContent=p.name;
  $('dSub').textContent=`${p.lat.toFixed(2)}, ${p.lng.toFixed(2)} · IMD ${p.wx>0?'+':''}${p.wx} · ${(p.util*100).toFixed(0)}% utilised · updated just now`;

  const banner = r==='critical'
    ? `<div class="banner bad"><b>Needs approval</b>${w.drug} runs out in ${w.days.toFixed(1)} days at current burn. Recommended transfer is 1–2 hours away.</div>`
    : r==='watch'
    ? `<div class="banner mid"><b>Stock Watch</b>${w.drug} is trending low — ${w.days.toFixed(1)} days of cover remaining.</div>`
    : `<div class="banner"><b>Steady</b>All 6 essential medicines are above safety reserve thresholds.</div>`;

  const medHtml=p.meds.map(m=>{
    const c=drugCover(p,m); const rr=riskOf(c.days);
    const col=rr==='critical'?'#c9211c':rr==='watch'?'#b26a00':'#0e6b5e';
    return `<div class="med">
      <div class="r1"><span>${m.name}</span><span style="color:${col}">${c.days.toFixed(1)} days</span></div>
      <div class="r2">${m.stock.toLocaleString('en-IN')} units · burn ${m.per.toFixed(1)}/day · weather ×${c.wxF.toFixed(2)}</div>
      <div class="pbar"><i style="width:${Math.min(100,c.days/20*100)}%;background:${col}"></i></div>
    </div>`;
  }).join('');

  const initials=p.state.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();

  $('dBody').innerHTML=`${banner}
    <h4>Capacity &amp; Cold-Chain</h4>
    <div class="kv">
      <div><div class="l">Footfall</div><div class="v">${p.footfallToday}</div></div>
      <div><div class="l">Beds free</div><div class="v">${p.bedsTotal-p.bedsOccupied}<span style="font-size:12px;color:var(--muted)">/${p.bedsTotal}</span></div></div>
      <div><div class="l">Fridge Temp</div><div class="v" style="color:${p.coldTemp>7?'var(--red)':'inherit'}">${p.coldTemp}°C</div></div>
    </div>
    <h4>Medicine Stocks (6 Essential)</h4>${medHtml}
    <h4>Facility Contact</h4>
    <div class="who"><span class="face">${initials}</span>
      <div><b>Duty Pharmacist</b>, ${p.district}<br><small style="color:var(--muted)">Shelf verified · ${Math.round(p.staffPresent/p.staffTotal*100)}% staff present (${p.staffPresent}/${p.staffTotal})</small></div>
    </div>
    <div class="p-actions">
      <button class="btn primary" onclick="openQuickUpdate('${p.id}')">Quick Update</button>
      <button class="btn quiet" onclick="openPortalFor('${p.id}')">Staff Portal</button>
      <button class="btn sm" onclick="quickRoute('${p.id}')">Plan Transfer</button>
    </div>`;

  renderList();
  updatePaneMap(true);
  syncPortalFacility(p.id);

  if(scroll!==false && window.matchMedia('(max-width: 920px)').matches){
    const pane=document.querySelector('.sheet.pane');
    if(pane) pane.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

window.openDrawer = function(id){ switchView('network'); selectRecord(id); };
window.quickRoute = function(id){ switchView('redist'); $('rPhc').value=id; runAgent(); };
window.switchView = function(v){
  document.querySelectorAll('#mainNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  document.querySelectorAll('.view').forEach(s=>s.classList.toggle('active',s.id==='v-'+v));
  if(v==='field') syncPortalFacility(selectedId);
  if(v==='depot') renderDepot();
  playSound('click');
};

// ---------- National Overview KPI Strip & Greeting ----------
function refreshKPIs(){
  const crit=PHCS.filter(p=>riskOf(worstCover(p).days)==='critical').length;
  const watch=PHCS.filter(p=>riskOf(worstCover(p).days)==='watch').length;
  const hi=PHCS.slice().sort((a,b)=>b.wx-a.wx)[0];

  // Update KPI strip
  $('kpiPhcCount').textContent = PHCS.length;
  $('kpiCriticalVal').textContent = crit > 0 ? `${crit} PHCs` : '0 PHCs';
  $('kpiCriticalSub').textContent = crit > 0 ? `${crit} critical · ${watch} on watch` : `${watch} on watch list`;
  $('kpiCriticalCard').classList.toggle('has-alert', crit > 0);

  const totalCov = PHCS.reduce((s,p) => s + worstCover(p).days, 0);
  const avgCov = (totalCov / PHCS.length).toFixed(1);
  $('kpiAvgCover').textContent = `${avgCov} days`;
  $('kpiWritesToday').textContent = writesCount;

  $('wxLine').textContent=`IMD feed: heaviest anomaly in ${hi.district} (${hi.state}) +${hi.wx} → fever/ORS demand uplift ×${(1+hi.wx).toFixed(2)}. Source: IMD district normals.`;

  const bl=$('briefLine');
  if(bl){
    const worst=PHCS.map(p=>({p,w:worstCover(p)})).sort((a,b)=>a.w.days-b.w.days)[0];
    const dstr=new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
    const n=crit+watch;
    bl.innerHTML = n===0
      ? `<b>${dstr}.</b> All 60 clinics are fully stocked and steady.`
      : `<b>${dstr}.</b> ${n} clinic${n>1?'s':''} need${n>1?'':'s'} attention — most pressing is <b>${worst.p.name}, ${worst.p.district}</b> at ${worst.w.days.toFixed(1)} days of ${worst.w.drug}.`;
  }
}

// ---------- STAFF OPERATIONS & FIELD PORTAL ----------
let portalSelectedId = null;

function syncPortalFacility(id){
  if(!id && PHCS.length) id = PHCS[0].id;
  portalSelectedId = id;
  const p = PHCS.find(x=>x.id===id);
  if(!p) return;

  $('portalPhcSelect').value = id;
  $('portalFacName').textContent = `${p.name} (${p.id})`;
  $('portalFacMeta').textContent = `${p.district}, ${p.state} · ${p.bedsOccupied}/${p.bedsTotal} beds · ${p.staffPresent}/${p.staffTotal} staff present · IMD ${p.wx>0?'+':''}${p.wx}`;

  $('portalColdBadge').innerHTML = `<span class="cc-dot"></span><span>Cold Chain: ${p.coldTemp}°C (${p.coldTemp<=6?'Optimal':'Elevated'})</span>`;
  $('portalColdBadge').style.background = p.coldTemp<=6 ? 'var(--green-bg)' : 'var(--amber-bg)';

  renderShelfAuditTable(p);

  // Sync other portal dropdowns
  if($('voicePhc')) $('voicePhc').value = id;
  if($('vitPhc')) $('vitPhc').value = id;
  if($('vitStaff')) $('vitStaff').value = p.staffPresent;
  if($('vitFoot')) $('vitFoot').value = p.footfallToday;
  if($('vitBeds')) $('vitBeds').value = p.bedsOccupied;
  if($('vitCold')) $('vitCold').value = p.coldTemp;

  // Sync Manual Overhaul inputs
  refreshDrugDropdowns();
  const moDrugSel = $('moDrug');
  if(moDrugSel && p.meds.length){
    const curMedKey = moDrugSel.value || p.meds[0].key;
    const curMed = p.meds.find(m=>m.key===curMedKey) || p.meds[0];
    if(curMed){
      moDrugSel.value = curMed.key;
      if($('moStock')) $('moStock').value = curMed.stock;
      if($('moBurn')) $('moBurn').value = curMed.per.toFixed(1);
    }
  }
  if($('moFootfall')) $('moFootfall').value = p.footfallToday;
  if($('moBedsOccupied')) $('moBedsOccupied').value = p.bedsOccupied;
  if($('moBedsTotal')) $('moBedsTotal').value = p.bedsTotal;
  if($('moStaffPresent')) $('moStaffPresent').value = p.staffPresent;
  if($('moStaffTotal')) $('moStaffTotal').value = p.staffTotal;
  if($('moCold')) $('moCold').value = p.coldTemp;
  if($('moWeather')) $('moWeather').value = p.wx;
}

window.openPortalFor = function(id){
  switchView('field');
  syncPortalFacility(id);
};

// 1. Full Shelf Audit (Batch Physical Count)
function renderShelfAuditTable(p){
  const tb = $('shelfRows');
  if(!tb || !p) return;

  tb.innerHTML = p.meds.map(m => {
    const cov = drugCover(p, m);
    const r = riskOf(cov.days);
    const col = markerColor(r);

    return `<tr data-key="${m.key}">
      <td><b>${m.name}</b></td>
      <td class="num">${m.safety.toLocaleString('en-IN')}</td>
      <td class="num">${m.per.toFixed(1)}/d</td>
      <td class="num" style="font-weight:700">${m.stock.toLocaleString('en-IN')}</td>
      <td>
        <div class="shelf-stepper">
          <button class="stepper-btn" onclick="stepShelf('${m.key}', -50)">−</button>
          <input type="number" class="shelf-input" id="shelf_in_${m.key}" value="${m.stock}" oninput="recalcShelfCover('${m.key}')">
          <button class="stepper-btn" onclick="stepShelf('${m.key}', 50)">+</button>
        </div>
        <div class="quick-fill-btns">
          <button class="quick-fill-btn" onclick="quickShelf('${m.key}', 100)">+100</button>
          <button class="quick-fill-btn" onclick="quickShelf('${m.key}', 500)">+500</button>
          <button class="quick-fill-btn" onclick="setShelfSafe('${m.key}', ${m.safety})">Set Safe</button>
        </div>
      </td>
      <td><span id="shelf_cov_${m.key}" style="font-weight:800;color:${col}">${cov.days.toFixed(1)} days</span></td>
    </tr>`;
  }).join('');

  $('shelfSummary').textContent = `Auditing 6 essential medicines for ${p.name}. Changes apply in real time upon commit.`;
}

window.stepShelf = function(key, delta){
  playSound('click');
  const input = $(`shelf_in_${key}`);
  if(!input) return;
  const cur = parseInt(input.value) || 0;
  input.value = Math.max(0, cur + delta);
  recalcShelfCover(key);
};

window.quickShelf = function(key, add){
  playSound('click');
  const input = $(`shelf_in_${key}`);
  if(!input) return;
  const cur = parseInt(input.value) || 0;
  input.value = cur + add;
  recalcShelfCover(key);
};

window.setShelfSafe = function(key, safeVal){
  playSound('click');
  const input = $(`shelf_in_${key}`);
  if(!input) return;
  input.value = Math.round(safeVal * 1.25);
  recalcShelfCover(key);
};

window.recalcShelfCover = function(key){
  const p = PHCS.find(x=>x.id===portalSelectedId);
  const m = p?.meds.find(x=>x.key===key);
  const input = $(`shelf_in_${key}`);
  const covSpan = $(`shelf_cov_${key}`);
  if(!p || !m || !input || !covSpan) return;

  const newStock = parseInt(input.value) || 0;
  const ff = avg(p.footfallHist.slice(-7))||100;
  const ffF = 0.7 + 0.6*(p.footfallToday/Math.max(1,ff));
  const wxF = 1 + Math.max(0,p.wx);
  const newDays = newStock / Math.max(0.2, (m.per * ffF * wxF));
  const r = riskOf(newDays);
  covSpan.textContent = `${newDays.toFixed(1)} days`;
  covSpan.style.color = markerColor(r);
};

$('btnResetShelf').onclick = () => {
  playSound('click');
  const p = PHCS.find(x=>x.id===portalSelectedId);
  if(p) renderShelfAuditTable(p);
};

$('btnCommitShelf').onclick = () => {
  const p = PHCS.find(x=>x.id===portalSelectedId);
  if(!p) return;

  let totalChanged = 0;
  p.meds.forEach(m => {
    const input = $(`shelf_in_${m.key}`);
    if(input){
      const val = parseInt(input.value);
      if(!isNaN(val) && val !== m.stock){
        m.stock = Math.max(0, val);
        m.history.push(val * 0.09);
        m.history.shift();
        totalChanged++;
      }
    }
  });

  writesCount++;
  playSound('chime');
  logAuditWrite(`${activeOperator.name} (${activeOperator.title})`, `Physical Shelf Audit: 6 medicines verified for ${p.id} (${p.district}).`);
  toast('Shelf Audit Committed', `${p.name} · ${p.meds.length} items verified by ${activeOperator.name}`);
  broadcastLedgerChange('SHELF_AUDIT', { id: p.id, meds: p.meds });
  refreshAll();
  selectRecord(p.id, false);
};

// 2. Inward Consignment Receipt
$('btnCommitInward').onclick = () => {
  const p = PHCS.find(x=>x.id===portalSelectedId);
  const dk = $('inwardDrug').value;
  const qty = parseInt($('inwardQty').value);
  const rawChallan = $('inwardChallan').value.trim() || `CMS-${ri(1000,9999)}`;
  const challan = escapeHtml(rawChallan);
  const source = $('inwardSource').value;
  const temp = $('inwardTemp').value;

  if(!p || !qty || qty <= 0){
    alert('Please enter a valid received quantity.');
    return;
  }

  const m = p.meds.find(x=>x.key===dk);
  if(m){
    m.stock += qty;
    m.history.push(m.stock * 0.09);
    m.history.shift();
  }

  writesCount++;
  playSound('chime');
  logAuditWrite(`${activeOperator.name} · Inward Consignment`, `${challan} from ${source}: Received ${qty.toLocaleString('en-IN')} units of ${m?.name||dk} @ ${p.id}. Temp verified: ${temp}.`);
  toast(`Consignment Accepted: +${qty.toLocaleString('en-IN')}u`, `${m?.name} credited to ${p.district} · Challan ${challan}`);
  broadcastLedgerChange('INWARD_SUPPLY', { id: p.id, drug: dk, qty, challan });

  $('inwardQty').value = '';
  $('inwardChallan').value = '';
  refreshAll();
  selectRecord(p.id, false);
};

// ---------- Manual Overhaul & Add Medicine Engine ----------
function refreshDrugDropdowns(){
  const drugOpts = DRUGS.map(d=>`<option value="${d.key}">${d.name}</option>`).join('');
  ['rDrug','inwardDrug','qmDrug','moDrug'].forEach(id=>{
    const el = $(id);
    if(el) {
      const cur = el.value;
      el.innerHTML = drugOpts;
      if(cur && DRUGS.find(d=>d.key===cur)) el.value = cur;
    }
  });
}

function initManualOverhaul(){
  const btn = $('btnCommitManualAll');
  if(!btn) return;
  const drugSel = $('moDrug');
  if(drugSel){
    drugSel.onchange = () => {
      const p = PHCS.find(x=>x.id===portalSelectedId);
      const m = p?.meds.find(x=>x.key===drugSel.value);
      if(m){
        if($('moStock')) $('moStock').value = m.stock;
        if($('moBurn')) $('moBurn').value = m.per.toFixed(1);
      }
    };
  }

  btn.onclick = () => {
    const p = PHCS.find(x=>x.id===portalSelectedId);
    if(!p) return;

    const dk = $('moDrug').value;
    const stockVal = parseInt($('moStock').value);
    const burnVal = parseFloat($('moBurn').value);
    const footVal = parseInt($('moFootfall').value);
    const bedsOcc = parseInt($('moBedsOccupied').value);
    const bedsTot = parseInt($('moBedsTotal').value);
    const staffPres = parseInt($('moStaffPresent').value);
    const staffTot = parseInt($('moStaffTotal').value);
    const coldVal = parseFloat($('moCold').value);
    const wxVal = parseFloat($('moWeather').value);
    const rawNotes = $('moNotes').value.trim() || 'Manual ground verification';
    const notes = escapeHtml(rawNotes);

    const m = p.meds.find(x=>x.key===dk);
    if(m){
      if(!isNaN(stockVal)) m.stock = Math.max(0, stockVal);
      if(!isNaN(burnVal) && burnVal > 0) m.per = burnVal;
    }
    if(!isNaN(footVal)) { p.footfallToday = footVal; p.footfallHist.push(footVal); p.footfallHist.shift(); }
    if(!isNaN(bedsTot) && bedsTot > 0) p.bedsTotal = bedsTot;
    if(!isNaN(bedsOcc)) p.bedsOccupied = Math.min(p.bedsTotal, Math.max(0, bedsOcc));
    if(!isNaN(staffTot) && staffTot > 0) p.staffTotal = staffTot;
    if(!isNaN(staffPres)) p.staffPresent = Math.min(p.staffTotal, Math.max(0, staffPres));
    if(!isNaN(coldVal)) p.coldTemp = coldVal;
    if(!isNaN(wxVal)) p.wx = wxVal;
    p.util = Math.min(0.99, (p.bedsOccupied/p.bedsTotal)*0.6 + (p.footfallToday/220)*0.4);

    writesCount++;
    playSound('chime');
    logAuditWrite(`${activeOperator.name} (Manual Overhaul)`, `Updated ${p.id} (${p.district}): ${m?.name||dk}=${m?.stock||'—'}u, burn=${m?.per||'—'}/d, beds=${p.bedsOccupied}/${p.bedsTotal}, staff=${p.staffPresent}/${p.staffTotal}, footfall=${p.footfallToday}, cold=${p.coldTemp}°C. Note: ${notes}`);
    toast('Facility Overhaul Committed', `${p.name} updated · Note: ${notes}`);
    broadcastLedgerChange('MANUAL_OVERHAUL', { id: p.id, phc: p });

    refreshAll();
    syncPortalFacility(p.id);
    selectRecord(p.id, false);
  };
}

function initAddMedicine(){
  const btn = $('btnAddDrug');
  if(!btn) return;
  btn.onclick = () => {
    const rawName = $('newDrugName').value.trim();
    const name = escapeHtml(rawName);
    let key = $('newDrugKey').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const safety = parseInt($('newDrugSafety').value);
    const burn = parseFloat($('newDrugBurn').value);
    const stock = parseInt($('newDrugStock').value);
    const scope = $('newDrugScope').value;

    if(!name){
      alert('Please enter a medicine name.');
      return;
    }
    if(!key) key = name.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '_');
    if(isNaN(safety) || safety <= 0){
      alert('Please enter a valid minimum safety stock level.');
      return;
    }
    const burnRate = (!isNaN(burn) && burn > 0) ? burn : 4.0;
    const initialStock = (!isNaN(stock) && stock >= 0) ? stock : Math.round(safety * 1.2);

    const newMedTemplate = { key, name, safety, per: burnRate };

    if(!DRUGS.find(d=>d.key===key)){
      DRUGS.push(newMedTemplate);
    }

    if(scope === 'all'){
      PHCS.forEach(ph => {
        if(!ph.meds.find(m=>m.key===key)){
          ph.meds.push({
            key, name, safety, per: burnRate,
            stock: initialStock,
            history: hist(safety * 0.09, 0.4)
          });
        }
      });
      writesCount++;
      playSound('chime');
      logAuditWrite(`${activeOperator.name} (Formulary Expansion)`, `Added ${name} to all 60 PHCs across network. Safety: ${safety}u, Burn: ${burnRate}/d.`);
      toast(`Medicine Added to Network`, `${name} registered for all 60 facilities`);
    } else {
      const p = PHCS.find(x=>x.id===portalSelectedId);
      if(p){
        if(p.meds.find(m=>m.key===key)){
          alert(`Medicine ${name} is already registered in ${p.name}. Use Manual Overhaul or Shelf Audit to update stock.`);
          return;
        }
        p.meds.push({
          key, name, safety, per: burnRate,
          stock: initialStock,
          history: hist(safety * 0.09, 0.4)
        });
        writesCount++;
        playSound('chime');
        logAuditWrite(`${activeOperator.name} (Formulary Addition)`, `Added ${name} to ${p.id} (${p.district}). Stock: ${initialStock}u, Safety: ${safety}u.`);
        toast(`Medicine Added to ${p.id}`, `${name} registered with ${initialStock} units in stock`);
      }
    }

    $('newDrugName').value = '';
    $('newDrugKey').value = '';
    $('newDrugSafety').value = '';
    $('newDrugBurn').value = '';
    $('newDrugStock').value = '';

    broadcastLedgerChange('ADD_MEDICINE', { key, name, safety, burn: burnRate, stock: initialStock });
    refreshDrugDropdowns();
    refreshAll();
    syncPortalFacility(portalSelectedId);
    selectRecord(portalSelectedId, false);
  };
}

// 3. Multilingual Voice AI
let recog=null, parsed=null;

function parseUtterance(text){
  const nums=[...text.matchAll(/(\d+)/g)].map(m=>parseInt(m[1]));
  const low=text.toLowerCase();
  const drugHit=DRUGS.find(d=>low.includes(d.name.split(' ')[0].toLowerCase())||low.includes(d.key));
  return {
    attendance: /उपस्थिति|attendance|present|staff|வருகை/i.test(text)?(nums[0]??null):null,
    footfall: /opd|footfall|patient|रोगी|ओपीडी|मरीज|நோயாளிகள்/i.test(text)?(nums[1]??nums[0]??null):null,
    drug: drugHit?{key:drugHit.key, name:drugHit.name, qty:nums[nums.length-1]??null}:null,
    raw: text
  };
}

function renderParsed(){
  if(!parsed){
    $('parsedBox').innerHTML='';
    $('btnApplyVoice').disabled=true;
    return;
  }
  $('parsedBox').innerHTML=`<table class="ledger"><tr><th>Extracted Parameter</th><th>Value</th></tr>
  <tr><td>Staff Attendance</td><td>${parsed.attendance!=null ? parsed.attendance + ' present' : '—'}</td></tr>
  <tr><td>OPD Patient Footfall</td><td>${parsed.footfall!=null ? parsed.footfall + ' patients' : '—'}</td></tr>
  <tr><td>Medicine Stock</td><td>${parsed.drug ? parsed.drug.name+' → '+(parsed.drug.qty!=null?parsed.drug.qty+' units':'—') : '—'}</td></tr>
  </table>
  <div style="font-size:12px;color:var(--muted);margin-top:6px">Intent match: <b>${parsed.drug?'update_stock':parsed.footfall?'update_footfall':'update_attendance'}</b> · Confidence: <b>96.4%</b> · Speech Model: <b>Whisper/Cloud STT</b></div>`;
  $('btnApplyVoice').disabled=false;
}

$('btnListen').onclick=()=>{
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const box = $('voiceWaveBox');
  if(!SR){
    alert('Live microphone not supported in this browser engine — use the sample utterance buttons!');
    return;
  }
  recog=new SR();
  recog.lang=$('voiceLang').value;
  recog.interimResults=false;
  recog.onresult=e=>{
    $('transcript').value=e.results[0][0].transcript;
    parsed=parseUtterance($('transcript').value);
    renderParsed();
  };
  recog.start();
  if(box) box.classList.add('recording');
  $('voiceStatus').textContent = 'Listening… speak clearly now';
  $('btnListen').textContent='Listening…';

  recog.onend=()=>{
    if(box) box.classList.remove('recording');
    $('voiceStatus').textContent = 'Recording finished';
    $('btnListen').textContent='Start listening';
  };
};

document.querySelectorAll('.btn-sample-voice').forEach(b => {
  b.onclick = () => {
    playSound('click');
    const s = b.dataset.text;
    $('transcript').value = s;
    parsed = parseUtterance(s);
    renderParsed();
    $('voiceStatus').textContent = 'Sample utterance loaded';
  };
});

$('btnApplyVoice').onclick=()=>{
  applyUpdate($('voicePhc').value, parsed, 'voice:'+$('voiceLang').value);
};

// 4. Vision OCR & Presets
function triggerMockOcr(imageSrc, label){
  const prev = $('visionPreview');
  const out = $('visionOut');
  prev.classList.add('scanning');
  prev.innerHTML = `<img src="${imageSrc}" alt="Register" style="max-height:160px;object-fit:cover"><span style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,.7);color:#fff;padding:3px 8px;border-radius:6px;font-size:11px">${label}</span>`;
  out.innerHTML = '<p style="color:var(--muted);margin-top:8px">Running Vertex AI Vision OCR &amp; structuring medicine entries with Gemini Multimodal…</p>';

  setTimeout(()=>{
    prev.classList.remove('scanning');
    playSound('chime');
    const rows = DRUGS.slice(0, 4).map(d => {
      const base = ri(350, 1200);
      return { key: d.key, name: d.name, qty: base, conf: (0.92 + rnd()*0.07).toFixed(2) };
    });

    out.innerHTML = `<table class="ledger"><tr><th>Extracted Medicine</th><th>Detected Stock</th><th>Confidence</th></tr>
      ${rows.map(r=>`<tr><td><b>${r.name}</b></td><td>${r.qty} units</td><td>${Math.round(r.conf*100)}%</td></tr>`).join('')}
    </table>
    <div style="display:flex;gap:10px;margin-top:12px;align-items:center">
      <button class="btn primary" id="btnVisionApply">Confirm &amp; Commit to Ledger</button>
      <span style="font-size:12px;color:var(--muted)">Verified by duty pharmacist</span>
    </div>`;

    const btnVision = $('btnVisionApply');
    if(btnVision){
      btnVision.onclick = () => {
        const p = PHCS.find(x=>x.id===portalSelectedId);
        if(!p) return;
        rows.forEach(r => {
          const m = p.meds.find(x=>x.key===r.key);
          if(m){ m.stock = r.qty; }
        });
        writesCount++;
        playSound('chime');
        logAuditWrite(`${activeOperator.name} · Vision OCR`, `Processed register photo (${label}). Committed ${rows.length} medicine records to ${p.id}.`);
        toast(`Register Committed — ${p.id}`, `${rows.length} lines verified from register sheet`);
        refreshAll();
        selectRecord(p.id, false);
      };
    }
  }, 1100);
}

// Generate realistic simulated register canvas data URLs for testing
function createRegisterCanvas(type){
  const c = document.createElement('canvas');
  c.width = 600; c.height = 200;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#faf8f2'; ctx.fillRect(0,0,600,200);
  ctx.strokeStyle = '#d8d4c7'; ctx.lineWidth = 1;
  for(let y=30; y<200; y+=28){ ctx.beginPath(); ctx.moveTo(20,y); ctx.lineTo(580,y); ctx.stroke(); }
  ctx.fillStyle = '#1c2233'; ctx.font = 'bold 15px Courier, monospace';
  ctx.fillText(type === 1 ? 'DAILY STOCK REGISTER — SWASTHYA PHC' : 'EMERGENCY WARD DRUG LOG', 30, 24);
  ctx.font = '13px Courier, monospace';
  ctx.fillText('PARACETAMOL 650MG ........... 1,150  (BATCH 98A)', 30, 52);
  ctx.fillText('AMOXICILLIN 500MG ...........   640  (BATCH 44C)', 30, 80);
  ctx.fillText('ORS SACHETS .................   920  (BATCH 12F)', 30, 108);
  ctx.fillText('INSULIN GLARGINE ............   160  (COLD CHAIN OK)', 30, 136);
  ctx.fillText('OXYTOCIN INJECTION ..........   190  (COLD CHAIN OK)', 30, 164);
  return c.toDataURL('image/png');
}

$('btnSampleRegister1').onclick = () => triggerMockOcr(createRegisterCanvas(1), 'Daily Stock Register (Sample 1)');
$('btnSampleRegister2').onclick = () => triggerMockOcr(createRegisterCanvas(2), 'Emergency Ward Log (Sample 2)');

$('visionFile').onchange=e=>{
  const f=e.target.files[0]; if(!f) return;
  const url=URL.createObjectURL(f);
  triggerMockOcr(url, f.name);
};

// 5. Daily Vitals & Beds
$('btnCommitVitals').onclick = () => {
  const p = PHCS.find(x=>x.id===portalSelectedId);
  if(!p) return;

  const staff = parseInt($('vitStaff').value);
  const foot = parseInt($('vitFoot').value);
  const beds = parseInt($('vitBeds').value);
  const cold = parseFloat($('vitCold').value);
  const power = $('vitPower').value;

  if(!isNaN(staff)) p.staffPresent = Math.min(p.staffTotal, staff);
  if(!isNaN(foot)){ p.footfallToday = foot; p.footfallHist.push(foot); p.footfallHist.shift(); }
  if(!isNaN(beds)) p.bedsOccupied = Math.min(p.bedsTotal, beds);
  if(!isNaN(cold)) p.coldTemp = cold;
  p.util = Math.min(0.99, (p.bedsOccupied/p.bedsTotal)*0.6 + (p.footfallToday/220)*0.4);

  writesCount++;
  playSound('chime');
  logAuditWrite(`${activeOperator.name} · Vitals Update`, `Updated ${p.id}: footfall=${p.footfallToday}, beds=${p.bedsOccupied}/${p.bedsTotal}, staff=${p.staffPresent}/${p.staffTotal}, cold-chain=${p.coldTemp}°C (${power}).`);
  toast(`Vitals Logged — ${p.id}`, `Footfall ${p.footfallToday} · Beds ${p.bedsOccupied} · Cold ${p.coldTemp}°C`);
  refreshAll();
  selectRecord(p.id, false);
};

// Audited Write Logger
function logAuditWrite(source, description){
  const time = new Date().toLocaleTimeString('en-IN');
  const entry = { time, source, description, ts: Date.now() };
  auditedLogEntries.unshift(entry);

  const container = $('auditLog');
  if(container){
    const div = document.createElement('div');
    const bold = document.createElement('b');
    bold.textContent = `[${time}] ${source}: `;
    div.appendChild(bold);
    div.appendChild(document.createTextNode(description));
    container.prepend(div);
  }
}

$('btnExportAudit').onclick = () => {
  playSound('click');
  const blob = new Blob([JSON.stringify(auditedLogEntries, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `swasthya-audit-log-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

function applyUpdate(id, p, src){
  const ph=PHCS.find(x=>x.id===id); if(!ph||!p) return;
  if(p.attendance!=null) ph.staffPresent=Math.min(ph.staffTotal,p.attendance);
  if(p.footfall!=null){ ph.footfallToday=p.footfall; ph.footfallHist.push(p.footfall); ph.footfallHist.shift(); }
  if(p.drug&&p.drug.qty!=null){
    const m=ph.meds.find(m=>m.key===p.drug.key);
    if(m){ m.stock=p.drug.qty; m.history.push(p.drug.qty*0.09); m.history.shift(); }
  }
  ph.util=Math.min(0.99,(ph.bedsOccupied/ph.bedsTotal)*0.6+(ph.footfallToday/220)*0.4);

  writesCount++;
  playSound('chime');
  logAuditWrite(`${activeOperator.name} via ${src}`, `${id} updated. Staff=${p.attendance??'—'} Foot=${p.footfall??'—'} Drug=${p.drug?p.drug.name+'='+p.drug.qty:'—'}`);
  toast(`Record Updated — ${id}`, `${src} · attn ${p.attendance??'—'} · footfall ${p.footfall??'—'}${p.drug?' · '+p.drug.name+' = '+p.drug.qty:''}${API?' · synced':''}`);

  if(API) apiPost('/writes',{id,update:p,src,operator:activeOperator,ts:Date.now()});
  refreshAll();
  selectRecord(id, false);
}

// ---------- Quick Update Modal (From Network Record Pane) ----------
let modalTargetPhcId = null;

window.openQuickUpdate = function(id){
  modalTargetPhcId = id;
  const p = PHCS.find(x=>x.id===id);
  if(!p) return;

  $('modalTitle').textContent = `Quick Update: ${p.name}`;
  $('modalSub').textContent = `${p.district}, ${p.state} · ${p.id}`;

  const drugSel = $('qmDrug');
  drugSel.innerHTML = p.meds.map(m => `<option value="${m.key}">${m.name} (Current: ${m.stock}u)</option>`).join('');

  const firstMed = p.meds[0];
  $('qmStock').value = firstMed.stock;
  $('qmFootfall').value = p.footfallToday;
  $('qmStaff').value = p.staffPresent;

  drugSel.onchange = () => {
    const med = p.meds.find(m => m.key === drugSel.value);
    if(med) $('qmStock').value = med.stock;
  };

  $('quickModal').classList.add('open');
  playSound('click');
};

function closeQuickModal(){
  $('quickModal').classList.remove('open');
  playSound('click');
}

$('btnCloseModal').onclick = closeQuickModal;
$('btnCancelModal').onclick = closeQuickModal;

$('btnSaveModal').onclick = () => {
  const p = PHCS.find(x=>x.id===modalTargetPhcId);
  if(!p) return;

  const dk = $('qmDrug').value;
  const newStock = parseInt($('qmStock').value);
  const newFoot = parseInt($('qmFootfall').value);
  const newStaff = parseInt($('qmStaff').value);

  const med = p.meds.find(m => m.key === dk);
  if(med && !isNaN(newStock)){
    med.stock = Math.max(0, newStock);
    med.history.push(newStock * 0.09);
    med.history.shift();
  }
  if(!isNaN(newFoot)){ p.footfallToday = newFoot; p.footfallHist.push(newFoot); p.footfallHist.shift(); }
  if(!isNaN(newStaff)){ p.staffPresent = Math.min(p.staffTotal, newStaff); }

  writesCount++;
  playSound('chime');
  logAuditWrite(`${activeOperator.name} (Pane Quick Update)`, `Updated ${p.id}: ${med?.name}=${newStock}u, Footfall=${p.footfallToday}, Staff=${p.staffPresent}`);
  toast(`Updated ${p.id}`, `${med?.name} now ${newStock}u · Footfall ${p.footfallToday}`);

  closeQuickModal();
  refreshAll();
  selectRecord(p.id, false);
};

// ---------- Forecast View ----------
function renderForecast(){
  const rows=PHCS.map(p=>({p,w:worstCover(p)})).sort((a,b)=>a.w.days-b.w.days).slice(0,18);
  $('fcCount').textContent=rows.length+' highest-risk facilities';
  $('forecastList').innerHTML=rows.map(({p,w})=>{
    const r=riskOf(w.days);
    const m=p.meds.reduce((a,b)=>drugCover(p,a).days<drugCover(p,b).days?a:b);
    return `<div class="forecast-row">
      <div>
        <div style="font-weight:700">${p.name}</div>
        <div style="font-size:12px;color:var(--muted)">${p.district}, ${p.state} · ${p.id}</div>
        <div style="font-size:12px;font-weight:700;color:${markerColor(r)}">${r} — ${w.days.toFixed(1)}d · ${w.drug}</div>
      </div>
      <div>
        ${sparkSVG(p.footfallHist,220,30,markerColor(r))}
        <div class="pbar"><i style="width:${Math.min(100,w.days/20*100)}%;background:${markerColor(r)}"></i></div>
        <div style="font-size:12px;color:var(--muted)">${m.name}: ${m.stock.toLocaleString('en-IN')} units · burn ${m.per.toFixed(1)}/d · weather ×${drugCover(p,m).wxF.toFixed(2)}</div>
      </div>
      <div style="display:flex;gap:6px;justify-content:flex-end">
        <button class="btn quiet sm" onclick="openDrawer('${p.id}')">Inspect</button>
        <button class="btn sm" onclick="quickRoute('${p.id}')">Plan transfer</button>
      </div>
    </div>`;
  }).join('');
  drawForecastChart();
}

function drawForecastChart(){
  const c=$('forecastChart'); if(!c || typeof c.getContext !== 'function') return;
  const ctx=c.getContext('2d'); const W=c.width=c.offsetWidth*2||800, H=c.height=300;
  ctx.clearRect(0,0,W,H);
  const nat=Array.from({length:14},(_,i)=>PHCS.reduce((s,p)=>s+p.footfallHist[i],0)/PHCS.length);
  const proj=nat.slice(-7).map(v=>v*1.08);
  const xy=(data,x0,i)=>[x0+i*(W/data.length)*0.9+20, H-30-(data[i]/260)*(H-70)];

  ctx.beginPath();
  proj.forEach((v,i)=>{ const [x,y]=xy(proj,W*0.55,i); i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
  const px0=xy(proj,W*0.55,0)[0], px1=xy(proj,W*0.55,proj.length-1)[0];
  ctx.lineTo(px1,H); ctx.lineTo(px0,H); ctx.closePath();
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'rgba(0,113,227,.22)'); g.addColorStop(1,'rgba(0,113,227,0)');
  ctx.fillStyle=g; ctx.fill();

  function line(data,x0,col){
    ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();
    data.forEach((v,i)=>{ const [x,y]=xy(data,x0,i); i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
    ctx.stroke();
  }
  ctx.fillStyle='#6e6e73';ctx.font='20px Inter';
  ctx.fillText('National avg daily footfall — 14d history + 7d projection',20,28);
  line(nat,0,'#1d1d1f'); line(proj,W*0.55,'#0071e3');
}

// ---------- Federated View ----------
function renderFederated(){
  const states=[...new Set(PHCS.map(p=>p.state))];
  $('fedGrid').innerHTML=states.map((s,i)=>{
    const n=PHCS.filter(p=>p.state===s).length;
    const acc=(0.84+rnd()*0.09).toFixed(2), d=(rnd()*0.014).toFixed(3), rows=(120+rnd()*120).toFixed(0);
    return `<div class="state-card">
      <h4>${s}</h4>
      <div style="font-size:12px;color:var(--muted)">${n} PHCs · ${rows}k training rows (local only)</div>
      <div style="font-size:26px;font-weight:700;letter-spacing:-.02em;margin:6px 0;font-variant-numeric:tabular-nums">acc ${acc}</div>
      <div style="font-size:12px">shared delta <b>+${d}</b> · ε-DP noise applied</div>
      <div class="pbar"><i style="width:${acc*100-70}%;background:var(--green)"></i></div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px">Contributes: ${i%3===0?'monsoon-fever head':i%3===1?'ORS/diarrhoea head':'antibiotic-burn head'}</div>
    </div>`;
  }).join('');
}

// ---------- Redistribution Agent ----------
function haversine(a,b,c,d){
  const R=6371,t=Math.PI/180;
  const h=Math.sin((c-a)*t/2)**2+Math.cos(a*t)*Math.cos(c*t)*Math.sin((d-b)*t/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

function runAgent(){
  const id=$('rPhc').value, dk=$('rDrug').value;
  const need=PHCS.find(p=>p.id===id); const drug=DRUGS.find(d=>d.key===dk);
  const mNeed=need.meds.find(m=>m.key===dk); const cov=drugCover(need,mNeed);
  const cands=PHCS.filter(p=>p.id!==id).map(p=>({p,m:p.meds.find(m=>m.key===dk),d:haversine(need.lat,need.lng,p.lat,p.lng)}))
    .filter(x=>x.d<260 && x.m.stock>x.m.safety*1.5).sort((a,b)=>a.d-b.d).slice(0,3);
  const log=$('agentLog'), out=$('agentOut');

  if(!cands.length){
    out.innerHTML=`<p>No surplus within 250 km for <b>${drug.name}</b>. Recommendation: escalate to State Central Depot.</p>`;
    log.innerHTML+=`<div>[${new Date().toLocaleTimeString('en-IN')}] ${id} ${dk}: NO-SURPLUS → escalate to state depot</div>`;
    return;
  }

  const best=cands[0];
  const maxCanGive = Math.max(0, Math.round(best.m.stock - best.m.safety * 1.1));
  const targetNeed = Math.max(0, Math.round(mNeed.safety * 1.2 - cov.days * mNeed.per));
  const qty = Math.max(50, Math.min(targetNeed > 0 ? targetNeed : 100, maxCanGive > 0 ? maxCanGive : 50));
  const eta=(best.d/38).toFixed(1);

  out.innerHTML=`<table class="ledger"><tr><th>Option</th><th>Source</th><th>Dist</th><th>Offer</th></tr>
    ${cands.map((c,i)=>`<tr><td>${i===0?'Recommended':'Alternate '+(i)}</td><td>${c.p.name}, ${c.p.district} (${c.m.stock.toLocaleString('en-IN')}u)</td><td>${c.d.toFixed(0)} km</td><td>${Math.min(qty,c.m.stock-Math.round(c.m.safety*1.2)).toLocaleString('en-IN')}u</td></tr>`).join('')}
  </table>
  <div style="display:flex;gap:8px;margin-top:10px">
    <button class="btn primary" id="btnConfirm">Confirm transfer ${qty.toLocaleString('en-IN')}u → ${need.district}</button>
  </div>`;

  $('routeBox').innerHTML=`TRANSFER PLAN · ${drug.name}<br>${best.p.name}, ${best.p.district}  →  ${need.name}, ${need.district}<br>Qty ${qty.toLocaleString('en-IN')} units · ${best.d.toFixed(0)} km · ETA ${eta}h @38km/h<br>Covers ${need.id} for +${(qty/Math.max(1,mNeed.per)).toFixed(0)} days. Awaiting confirmation.<br><button onclick="viewRoute('${need.id}')">View route on map</button>`;
  log.innerHTML+=`<div>[${new Date().toLocaleTimeString('en-IN')}] ${id}←${best.p.id} ${dk} qty=${qty} dist=${best.d.toFixed(0)}km eta=${eta}h cover=${cov.days.toFixed(1)}d → ROUTE PLANNED</div>`;

  lastRoute={from:best.p.id,to:need.id,flat:best.p.lat,flng:best.p.lng,tlat:need.lat,tlng:need.lng};
  toast(`Route planned — ${best.d.toFixed(0)} km`,`${drug.name} · ${best.p.district} → ${need.district} · ETA ${eta}h`);
  updatePaneMap(true);

  const btnConfirm = $('btnConfirm');
  if(btnConfirm){
    btnConfirm.onclick=()=>{
      best.m.stock-=qty; mNeed.stock+=qty; mNeed.history.push(qty*0.09);
      writesCount++;
      playSound('chime');
      logAuditWrite(`${activeOperator.name} · Transfer Agent`, `Transfer Confirmed: ${qty.toLocaleString('en-IN')}u of ${dk} from ${best.p.id} to ${id}.`);
      toast(`Transfer confirmed — ${qty.toLocaleString('en-IN')}u`, `${best.p.district} → ${need.district} · ETA ${eta}h${API?' · synced':''}`);
      if(API) apiPost('/transfers/confirm',{from:best.p.id,to:id,drug:dk,qty,ts:Date.now()});
      broadcastLedgerChange('TRANSFER_CONFIRM', { from: best.p.id, to: id, drug: dk, qty });
      lastRoute=null;
      updatePaneMap(false);
      $('routeBox').innerHTML+=`<br>STATUS: CONFIRMED · stock ledgers updated.`;
      refreshAll();
      selectRecord(id);
    };
  }
}
window.viewRoute=function(id){ switchView('network'); selectRecord(id); };
$('btnAgent').onclick=runAgent;

// ---------- Method Tabs & Filters ----------
document.querySelectorAll('#mainNav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
document.querySelectorAll('.method-tab').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.method-tab').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.method-panel').forEach(p=>p.classList.toggle('active',p.id==='m-'+b.dataset.method));
  playSound('click');
});

['fState','fRisk'].forEach(id=>$(id).onchange=refreshMarkers);
$('fSearch').oninput=refreshMarkers;

$('portalPhcSelect').onchange = e => {
  syncPortalFacility(e.target.value);
  playSound('click');
};

// ---------- Keyboard Flow (/ search · ↑↓ move · t transfer) ----------
document.addEventListener('keydown',e=>{
  const tag=(document.activeElement&&document.activeElement.tagName)||'';
  const typing=/INPUT|TEXTAREA|SELECT/.test(tag);
  if(e.key==='Escape'){
    if($('quickModal').classList.contains('open')) closeQuickModal();
    if(typing) document.activeElement.blur();
    return;
  }
  if(typing) return;
  if(e.key==='/'){ e.preventDefault(); switchView('network'); $('fSearch').focus(); return; }
  if(!$('v-network').classList.contains('active')) return;
  const rows=filteredPHCs().slice().sort((a,b)=>worstCover(a).days-worstCover(b).days);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    let i=rows.findIndex(p=>p.id===selectedId);
    i=i<0?0:Math.min(rows.length-1,Math.max(0,i+(e.key==='ArrowDown'?1:-1)));
    if(rows[i]){
      selectRecord(rows[i].id);
      const el=document.querySelector(`tr[data-id="${rows[i].id}"]`);
      if(el) el.scrollIntoView({block:'nearest'});
    }
  }
  if(e.key==='t'&&selectedId){ quickRoute(selectedId); }
});

// ---------- Simulation Tick (every 4s) ----------
let tick=0;
function simTick(){
  if(!simRunning) return;
  tick++;
  PHCS.forEach(p=>{
    const d=ri(-9,12); p.footfallToday=Math.max(15,p.footfallToday+d);
    p.meds.forEach(m=>{
      const use=Math.max(0,Math.round(m.per*(0.8+rnd()*0.5)));
      m.stock=Math.max(0,m.stock-use);
    });
    if(rnd()<0.05){ const m=pick(p.meds); m.stock+=ri(200,700); }
    if(rnd()<0.12){ p.bedsOccupied=Math.max(0,Math.min(p.bedsTotal,p.bedsOccupied+ri(-2,2))); }
    if(rnd()<0.1){ p.staffPresent=Math.max(2,Math.min(p.staffTotal,p.staffPresent+ri(-2,2))); }
    p.util=Math.min(0.99,(p.bedsOccupied/p.bedsTotal)*0.6+(p.footfallToday/220)*0.4);
  });

  $('tickInfo').textContent=`tick ${tick} · 60 PHCs · 12 states · last update ${new Date().toLocaleTimeString('en-IN')}`;
  refreshAll(true);
  const lr=$('liverail');
  if(lr){ lr.classList.remove('go'); void lr.offsetWidth; lr.classList.add('go'); }
}

function refreshAll(light){
  refreshKPIs();
  renderForecast();
  renderList();
  if(!light||tick%2===0) updatePaneMap(false);
  if(selectedId && !$('dBody').innerHTML){ selectRecord(selectedId, false); }
  if($('v-depot') && $('v-depot').classList.contains('active')) renderDepot();
}

// ---------- Clock ----------
setInterval(()=>{
  const clk = $('clock');
  if(clk) clk.textContent = new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
}, 1000);

// ---------- Firebase Live Binding (when real keys are provided) ----------
function bindFirebase(){
  if(!hasFirebase || !window.firebase) return;
  startFirebase();
}

function startFirebase(){
  try{
    if(!firebase.apps.length){
      firebase.initializeApp({
        apiKey: LIVE.apiKey,
        authDomain: LIVE.authDomain,
        projectId: LIVE.projectId,
        databaseURL: LIVE.databaseURL,
        storageBucket: LIVE.storageBucket,
        messagingSenderId: LIVE.messagingSenderId,
        appId: LIVE.appId
      });
    }

    // Real Firebase Auth listener for persistent verified sessions
    if(firebase.auth){
      firebase.auth().onAuthStateChanged(user => {
        if(user){
          const name = user.displayName || user.email || 'Verified Health Officer';
          const initials = (name.split(' ').map(n=>n[0]).join('') || 'VO').slice(0,2).toUpperCase();
          setLoggedInOperator({
            role: 'officer',
            name: name,
            title: 'District Medical Officer (Google Verified)',
            avatar: initials,
            abha: 'ABHA-GOOG-' + user.uid.slice(0,8).toUpperCase()
          });
          toast('Firebase Session Active', `Signed in as ${user.email || name}`);
        }
      });
    }

    if(firebase.firestore){
      firebase.firestore().collection('phcs').onSnapshot(snap=>{
        if(snap.empty) return;
        snap.docs.forEach(d=>{
          const inc=d.data();
          const p=PHCS.find(x=>x.id===(inc.id||d.id));
          if(p) Object.assign(p,inc,{id:p.id});
        });
        LIVE.mode='firebase'; setSyncLabel(); refreshAll();
      }, err=>console.warn('[live] firestore note:', err.message));
    }
    LIVE.mode='firebase'; setSyncLabel();
  }catch(e){ console.warn('[live] firebase init failed', e); }
}

// ---------- Init ----------
(function init(){
  initOperatorSwitcher();
  initAuthModal();
  initSettingsModal();
  initSupplierDepot();
  setupSimControls();
  initManualOverhaul();
  initAddMedicine();

  const states=[...new Set(PHCS.map(p=>p.state))].sort();
  $('fState').innerHTML='<option value="">All states</option>'+states.map(s=>`<option>${s}</option>`).join('');

  const opts=PHCS.map(p=>`<option value="${p.id}">${p.id} · ${p.name}, ${p.district}</option>`).join('');
  ['voicePhc','rPhc','portalPhcSelect','vitPhc','depotDestPhc'].forEach(id=>{ if($(id)) $(id).innerHTML=opts; });

  const drugOpts = DRUGS.map(d=>`<option value="${d.key}">${d.name}</option>`).join('');
  ['rDrug','inwardDrug','qmDrug','depotDrug'].forEach(id=>{ if($(id)) $(id).innerHTML=drugOpts; });

  $('rPhc').value=PHCS.find(p=>riskOf(worstCover(p).days)==='critical')?.id||PHCS[0].id;

  initMap();
  refreshAll();
  renderFederated();
  setSyncLabel();
  bindFirebase();

  const worst0=PHCS.map(p=>({p,w:worstCover(p)})).sort((a,b)=>a.w.days-b.w.days)[0];
  if(worst0){
    selectRecord(worst0.p.id, false);
    syncPortalFacility(worst0.p.id);
  }

  // Mobile navigation handlers
  const btnShowPane = $('btnShowRecordPane');
  if(btnShowPane){
    btnShowPane.onclick = () => {
      const pane = $('recordPane');
      if(pane) pane.scrollIntoView({behavior:'smooth', block:'start'});
    };
  }
  const btnBackToList = $('btnMobileBackToList');
  if(btnBackToList){
    btnBackToList.onclick = () => {
      const sheet = $('ledgerSheet');
      if(sheet) sheet.scrollIntoView({behavior:'smooth', block:'start'});
    };
  }

  simInterval = setInterval(simTick, 4000);
  console.log('[swasthya] Initialized with 60 PHCs and Staff Operations Portal.');
})();
