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

// Warning: browser-only Gemini keys are visible to users. Restrict this key in Google Cloud before hosting.
export const GEMINI_API_KEY =
  (typeof window !== "undefined" &&
    window.localStorage?.getItem("salesiq_gemini_api_key")) ||
  (typeof atob === "function"
    ? atob(
        "QVEuQWI4Uk42THZFTXZLQ2U2VERFY3k0YU16dUJlUnhVSDBUT3VoUFVRazF5d29oVFZiS1E=",
      )
    : "");
export const GEMINI_MODEL = "gemini-3.8-flash";

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
