import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
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

const app = initializeApp(firebaseConfig);

// Initialize Firestore with error handling
let db;
try {
  db = getFirestore(app);

  // Enable offline persistence (optional - helps with connectivity issues)
  if (typeof window !== 'undefined') {
    // Only enable in browser environment
    console.log('Firebase Firestore initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Firestore:', error);
  // Fallback initialization
  db = getFirestore(app);
}

export { db };
export const storage = getStorage(app);
export default app;