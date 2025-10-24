/**
 * Firebase Configuration and Initialization
 * 
 * Initializes Firebase services for the MessageAI app:
 * - Authentication (Email/Password, Google Sign-In)
 * - Firestore (Document database for users, messages, conversations)
 * - Realtime Database (Presence tracking with onDisconnect support)
 * - Storage (Image uploads)
 * - Cloud Messaging (Push notifications)
 * 
 * Configuration values come from .env file
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

// Firebase configuration - hardcoded for now (TODO: fix .env loading)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBNS3er-mKEfwZPGgq8BDKqjlsExusCvUM',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'msg-ai-1.firebaseapp.com',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || 'https://msg-ai-1-default-rtdb.firebaseio.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'msg-ai-1',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'msg-ai-1.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1006898666705',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:1006898666705:android:f76c58eca5877bc36779f0',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
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
// Auth persistence is handled automatically by Firebase for React Native
export const auth = getAuth(app);

// Initialize Firestore with offline persistence
// This enables automatic caching and offline writes queuing
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

// Log Firestore initialization
if (__DEV__) {
  console.log('✅ Firestore initialized with offline persistence');
  console.log('📦 Local cache enabled for offline support');
}

export const storage = getStorage(app);

// Initialize Realtime Database for presence tracking
// Uses .info/connected and onDisconnect() for reliable disconnect detection
export const rtdb = getDatabase(app);

// Export the app instance if needed
export default app;

// Log successful initialization in development
if (__DEV__) {
  console.log('✅ Firebase initialized successfully');
  console.log('📦 Project ID:', firebaseConfig.projectId);
}

