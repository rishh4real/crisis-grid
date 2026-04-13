/**
 * firebase.js — Firebase Firestore initialiser
 * Reads FIREBASE_CONFIG from window.__ENV (injected by env-config.js)
 * Falls back to placeholder so the page doesn't crash without config.
 */

// ── Default / placeholder config (replaced by env-config.js) ─────────────
const DEFAULT_FIREBASE_CONFIG = {
  apiKey:            "REPLACE_ME",
  authDomain:        "REPLACE_ME.firebaseapp.com",
  projectId:         "REPLACE_ME",
  storageBucket:     "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId:             "REPLACE_ME",
};

// ── Resolve config ────────────────────────────────────────────────────────
function getFirebaseConfig() {
  if (window.__ENV && window.__ENV.FIREBASE_CONFIG) {
    try {
      const raw = window.__ENV.FIREBASE_CONFIG;
      // Accept JSON string or already-parsed object
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      console.warn("[CrisisGrid] Could not parse FIREBASE_CONFIG:", e);
    }
  }
  console.warn("[CrisisGrid] Using placeholder Firebase config. Set FIREBASE_CONFIG in env-config.js.");
  return DEFAULT_FIREBASE_CONFIG;
}

// ── Initialise ────────────────────────────────────────────────────────────
import { initializeApp }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore,
         collection,
         addDoc,
         getDocs,
         onSnapshot,
         query,
         orderBy,
         serverTimestamp }     from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = getFirebaseConfig();
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);

// ── Exports ───────────────────────────────────────────────────────────────
export { db, collection, addDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp };
