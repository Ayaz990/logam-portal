import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase app is already initialized to avoid multiple instances
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore - this will reuse the same instance
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Log initialization (only in browser for debugging)
if (typeof window !== 'undefined') {
  console.log('Firebase initialized successfully');
}

export { db, storage };
export default app;