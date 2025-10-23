/**
 * Authentication-related TypeScript types and interfaces
 */

import { User as FirebaseUser } from 'firebase/auth';

/**
 * Simplified user object for auth state
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Auth error structure for consistent error handling
 */
export interface AuthError {
  code: string;
  message: string;
}

/**
 * Auth context type for state management
 */
export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  error: string | null;
}

/**
 * Convert Firebase User to AuthUser
 */
export const toAuthUser = (firebaseUser: FirebaseUser | null): AuthUser | null => {
  if (!firebaseUser) return null;
  
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
};

