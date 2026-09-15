import {
  initializeApp,
  getApps,
  getApp,
  deleteApp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDiWywCYMNGfrdbwvVLpUrbM_j7Oe8v8gE",
  authDomain: "sales-iq-201db.firebaseapp.com",
  projectId: "sales-iq-201db",
  storageBucket: "sales-iq-201db.firebasestorage.app",
  messagingSenderId: "89794734654",
  appId: "1:89794734654:web:5737f736124d8b9dac7f6f",
  measurementId: "G-4R3ZMRHE0V",
};

// SECURITY: Never hardcode a Gemini API key here — it would be visible to
// anyone via DevTools / view-source and committed to git.
// Each admin enters their own key once on the AI Insights page; it is stored
// only in that browser's localStorage (never in Firestore/repo).
// For production, set GEMINI_PROXY_URL to a backend/Cloud Function that holds
// the key server-side and forwards requests, so browsers never see the key.
// gemini-1.5-flash was retired by Google (2.0 shut down Jun 2026).
// Use a current GA model. 2.5-flash retires Oct 20 2026 -> 3.5-flash is the long-term replacement.
export const GEMINI_MODEL = "gemini-2.5-flash";
export const GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
];
export const GEMINI_PROXY_URL = ""; // e.g. "https://your-worker.dev/gemini"

const GEMINI_KEY_STORAGE = "salesiq_gemini_key";

export function getGeminiKey() {
  try {
    return (localStorage.getItem(GEMINI_KEY_STORAGE) || "").trim();
  } catch {
    return "";
  }
}

export function setGeminiKey(key) {
  const clean = (key || "").trim();
  try {
    if (clean) localStorage.setItem(GEMINI_KEY_STORAGE, clean);
    else localStorage.removeItem(GEMINI_KEY_STORAGE);
  } catch {}
  return clean;
}

export function hasGeminiKey() {
  return getGeminiKey().length > 0;
}

// Backwards-compat: older imports used GEMINI_API_KEY constant.
// Keep the name but resolve it dynamically so no secret is committed.
export const GEMINI_API_KEY = getGeminiKey();

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
setPersistence(auth, browserLocalPersistence).catch(() => {});

export {
  initializeApp,
  deleteApp,
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  signOut,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
};
