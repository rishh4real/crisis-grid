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
         serverTimestamp,
         where,
         updateDoc,
         doc,
         arrayUnion }     from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = getFirebaseConfig();
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);

// ── Deduplication Utility ──────────────────────────────────────────────────
async function saveReportWithDeduplication(reportData) {
  const reportsRef = collection(db, "reports");
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const q = query(
    reportsRef,
    where("location", "==", reportData.location),
    where("state", "==", reportData.state)
  );

  const snapshot = await getDocs(q);
  let existingDoc = null;

  snapshot.forEach((d) => {
    const data = d.data();
    const docTime = data.timestamp && data.timestamp.toDate ? data.timestamp.toDate() : new Date();
    if (docTime > twentyFourHoursAgo) {
      if (!existingDoc) {
        existingDoc = d;
      } else {
        const existingTime = existingDoc.data().timestamp && existingDoc.data().timestamp.toDate ? existingDoc.data().timestamp.toDate() : new Date(0);
        if (docTime > existingTime) {
          existingDoc = d;
        }
      }
    }
  });

  if (existingDoc) {
    const existingData = existingDoc.data();
    const docRef = doc(db, "reports", existingDoc.id);
    await updateDoc(docRef, {
      populationAffected: (existingData.populationAffected || 0) + (reportData.populationAffected || 0),
      urgencyScore: Math.max(existingData.urgencyScore || 0, reportData.urgencyScore || 0),
      updates: arrayUnion(reportData.rawText || "")
    });
    return existingDoc.id;
  } else {
    const docRef = await addDoc(reportsRef, {
      ...reportData,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  }
}

// ── Exports ───────────────────────────────────────────────────────────────
export { db, collection, addDoc, getDocs, onSnapshot, query, orderBy, serverTimestamp, where, updateDoc, doc, arrayUnion, saveReportWithDeduplication };
