/**
 * User Profile Service
 * 
 * Manages user profiles in Firestore including:
 * - Profile creation
 * - Profile updates
 * - Online status
 * - Last seen timestamp
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserProfile, CreateUserData, UpdateUserData } from '../../types/user';

/**
 * Create a new user profile in Firestore
 */
export const createUserProfile = async (
  userId: string,
  userData: CreateUserData
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    const profileData = {
      uid: userId,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL || null,
      online: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    await setDoc(userRef, profileData);
    console.log('✅ User profile created:', userId);
  } catch (error: any) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    
    return null;
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Update user profile fields
 */
export const updateUserProfile = async (
  userId: string,
  updates: UpdateUserData
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, updates as any);
    console.log('✅ User profile updated:', userId);
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Update user's online status
 */
export const updateOnlineStatus = async (
  userId: string,
  online: boolean
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      online,
      lastSeen: serverTimestamp(),
    });
    console.log(`✅ User ${online ? 'online' : 'offline'}:`, userId);
  } catch (error: any) {
    console.error('Error updating online status:', error);
    throw error;
  }
};

/**
 * Update user's last seen timestamp
 */
export const updateLastSeen = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      lastSeen: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error updating last seen:', error);
    throw error;
  }
};

// Export as default object for easier importing
export const userService = {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  updateOnlineStatus,
  updateLastSeen,
};

