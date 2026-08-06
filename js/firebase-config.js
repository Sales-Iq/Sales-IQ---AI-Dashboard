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

// Warning: browser-only API keys are visible to users. Restrict this key in Groq Console before hosting.
export const GROQ_API_KEY =
  "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";

// Groq models - tried in order (currently supported as of 2024)
export const GROQ_MODELS = [
  "llama-3.1-8b-instant",      // Fast, good quality
  "llama-3.3-70b-versatile",   // Higher quality, slower
  "mixtral-8x7b-32768",        // Good alternative
];

// Default to first in chain
export const DEFAULT_GROQ_MODEL = GROQ_MODELS[0];

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
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
};
