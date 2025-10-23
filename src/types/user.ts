/**
 * User profile TypeScript types and interfaces
 */

import { Timestamp } from 'firebase/firestore';

/**
 * User data with timestamps as numbers (for client-side usage)
 */
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  online: boolean;
  lastSeen: number;
  createdAt: number;
  expoPushTokens?: string[]; // Optional - only needed for push notifications
}

/**
 * User profile stored in Firestore
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  online: boolean;
  lastSeen: Timestamp;
  createdAt: Timestamp;
  expoPushTokens?: string[]; // Optional - only needed for push notifications
}

/**
 * Data needed to create a new user profile
 */
export interface CreateUserData {
  email: string;
  displayName: string;
  photoURL?: string;
}

/**
 * Partial updates for user profile
 */
export interface UpdateUserData {
  displayName?: string;
  photoURL?: string;
  online?: boolean;
  lastSeen?: Timestamp;
}

