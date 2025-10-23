/**
 * Authentication Persistence Service
 * 
 * Handles storing and retrieving authentication state using web-compatible storage
 * Works with Expo managed workflow without custom dev builds
 * Uses localStorage for web and AsyncStorage polyfill for React Native
 */

import { authService } from '../firebase/authService';
import { AuthUser } from '../../types/auth';
import { storage } from '../../utils/storage';

const AUTH_STORAGE_KEY = 'message_ai_auth_user';
const AUTH_TOKEN_KEY = 'message_ai_auth_token';

/**
 * Store authentication data in persistent storage
 * Works with web localStorage and React Native AsyncStorage
 */
export const storeAuthData = async (user: AuthUser, token?: string): Promise<void> => {
  try {
    console.log('[AuthPersistence] Storing auth data for user:', user.uid);
    
    // Store user data in persistent storage
    await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    
    // Store auth token if provided
    if (token) {
      await storage.setItem(AUTH_TOKEN_KEY, token);
    }
    
    console.log('[AuthPersistence] Auth data stored successfully');
  } catch (error) {
    console.error('[AuthPersistence] Error storing auth data:', error);
    throw error;
  }
};

/**
 * Retrieve authentication data from persistent storage
 * Works with web localStorage and React Native AsyncStorage
 */
export const getStoredAuthData = async (): Promise<AuthUser | null> => {
  try {
    console.log('[AuthPersistence] Retrieving stored auth data');
    
    // Retrieve user data from persistent storage
    const storedUser = await storage.getItem(AUTH_STORAGE_KEY);
    
    if (storedUser) {
      const user = JSON.parse(storedUser) as AuthUser;
      console.log('[AuthPersistence] Found stored user:', user.uid);
      return user;
    }
    
    console.log('[AuthPersistence] No stored auth data found');
    return null;
  } catch (error) {
    console.error('[AuthPersistence] Error retrieving auth data:', error);
    return null;
  }
};

/**
 * Clear authentication data from persistent storage
 * Works with web localStorage and React Native AsyncStorage
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    console.log('[AuthPersistence] Clearing stored auth data');
    
    // Clear user data from persistent storage
    await storage.removeItem(AUTH_STORAGE_KEY);
    await storage.removeItem(AUTH_TOKEN_KEY);
    
    console.log('[AuthPersistence] Auth data cleared successfully');
  } catch (error) {
    console.error('[AuthPersistence] Error clearing auth data:', error);
    throw error;
  }
};

/**
 * Check if stored authentication is still valid
 * Verifies with Firebase Auth that the user is still authenticated
 */
export const validateStoredAuth = async (): Promise<AuthUser | null> => {
  try {
    console.log('[AuthPersistence] Validating stored auth data');
    
    const storedUser = await getStoredAuthData();
    if (!storedUser) {
      return null;
    }
    
    // Check if Firebase Auth still has this user
    const currentUser = authService.getCurrentUser();
    
    if (currentUser && currentUser.uid === storedUser.uid) {
      console.log('[AuthPersistence] Stored auth is valid');
      return storedUser;
    }
    
    // If Firebase doesn't have the user, clear stored data
    console.log('[AuthPersistence] Stored auth is invalid, clearing data');
    await clearAuthData();
    return null;
  } catch (error) {
    console.error('[AuthPersistence] Error validating stored auth:', error);
    return null;
  }
};

/**
 * Force refresh authentication from Firebase and update storage
 */
export const refreshStoredAuth = async (): Promise<AuthUser | null> => {
  try {
    console.log('[AuthPersistence] Refreshing stored auth data');
    
    const currentUser = authService.getCurrentUser();
    
    if (currentUser) {
      // Update stored data with current Firebase user
      await storeAuthData(currentUser);
      console.log('[AuthPersistence] Stored auth data refreshed');
      return currentUser;
    } else {
      // No current user, clear stored data
      await clearAuthData();
      console.log('[AuthPersistence] No current user, cleared stored data');
      return null;
    }
  } catch (error) {
    console.error('[AuthPersistence] Error refreshing stored auth:', error);
    return null;
  }
};

// Export as default object for easier importing
export const authPersistenceService = {
  storeAuthData,
  getStoredAuthData,
  clearAuthData,
  validateStoredAuth,
  refreshStoredAuth,
};
