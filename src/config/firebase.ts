/**
 * Firebase Configuration and Initialization
 * 
 * Initializes Firebase services for the MessageAI app:
 * - Authentication (Email/Password, Google Sign-In)
 * - Firestore (Real-time database)
 * - Storage (Image uploads)
 * - Cloud Messaging (Push notifications)
 * 
 * Configuration values come from .env file
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional: for Analytics
};

// Validate that all required config values are present
const validateConfig = () => {
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingKeys = requiredKeys.filter(
    (key) => !firebaseConfig[key as keyof typeof firebaseConfig]
  );

  if (missingKeys.length > 0) {
    console.error(
      '❌ Firebase configuration error: Missing environment variables:',
      missingKeys.map((key) => `EXPO_PUBLIC_FIREBASE_${key.toUpperCase()}`).join(', ')
    );
    throw new Error(
      'Firebase configuration incomplete. Please check your .env file.'
    );
  }
};

// Validate configuration on module load
validateConfig();

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export the app instance if needed
export default app;

// Log successful initialization in development
if (__DEV__) {
  console.log('✅ Firebase initialized successfully');
  console.log('📦 Project ID:', firebaseConfig.projectId);
}

