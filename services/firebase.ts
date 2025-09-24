import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// This configuration is populated by environment variables.
// Ensure your build environment is set up to provide these values.
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyArseSyVsclEckvJyKk0Hy5Dmoha-Pu77M",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "festflow-805bb.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "festflow-805bb",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "festflow-805bb.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "382784963863",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:382784963863:web:b521a8a0ae8ba6004ae352",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-CLPLYWPZ5K"
};

// Initialize Firebase only if it hasn't been initialized yet.
let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
