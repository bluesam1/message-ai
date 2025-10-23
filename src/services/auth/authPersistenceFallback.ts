/**
 * Authentication Persistence Fallback Service
 * 
 * Alternative implementation using Expo's built-in storage
 * Fallback when SecureStore is not available
 */

import { authService } from '../firebase/authService';
import { AuthUser } from '../../types/auth';

// Simple in-memory storage as fallback
let memoryStorage: { [key: string]: string } = {};

/**
 * Store authentication data in memory (fallback)
 */
export const storeAuthDataFallback = async (user: AuthUser, token?: string): Promise<void> => {
  try {
    console.log('[AuthPersistenceFallback] Storing auth data for user:', user.uid);
    
    // Store user data in memory
    memoryStorage['auth_user'] = JSON.stringify(user);
    
    // Store auth token if provided
    if (token) {
      memoryStorage['auth_token'] = token;
    }
    
    console.log('[AuthPersistenceFallback] Auth data stored successfully');
  } catch (error) {
    console.error('[AuthPersistenceFallback] Error storing auth data:', error);
    throw error;
  }
};

/**
 * Retrieve authentication data from memory (fallback)
 */
export const getStoredAuthDataFallback = async (): Promise<AuthUser | null> => {
  try {
    console.log('[AuthPersistenceFallback] Retrieving stored auth data');
    
    const storedUser = memoryStorage['auth_user'];
    
    if (storedUser) {
      const user = JSON.parse(storedUser) as AuthUser;
      console.log('[AuthPersistenceFallback] Found stored user:', user.uid);
      return user;
    }
    
    console.log('[AuthPersistenceFallback] No stored auth data found');
    return null;
  } catch (error) {
    console.error('[AuthPersistenceFallback] Error retrieving auth data:', error);
    return null;
  }
};

/**
 * Clear authentication data from memory (fallback)
 */
export const clearAuthDataFallback = async (): Promise<void> => {
  try {
    console.log('[AuthPersistenceFallback] Clearing stored auth data');
    
    delete memoryStorage['auth_user'];
    delete memoryStorage['auth_token'];
    
    console.log('[AuthPersistenceFallback] Auth data cleared successfully');
  } catch (error) {
    console.error('[AuthPersistenceFallback] Error clearing auth data:', error);
    throw error;
  }
};

/**
 * Check if stored authentication is still valid (fallback)
 */
export const validateStoredAuthFallback = async (): Promise<AuthUser | null> => {
  try {
    console.log('[AuthPersistenceFallback] Validating stored auth data');
    
    const storedUser = await getStoredAuthDataFallback();
    if (!storedUser) {
      return null;
    }
    
    // Check if Firebase Auth still has this user
    const currentUser = authService.getCurrentUser();
    
    if (currentUser && currentUser.uid === storedUser.uid) {
      console.log('[AuthPersistenceFallback] Stored auth is valid');
      return storedUser;
    }
    
    // If Firebase doesn't have the user, clear stored data
    console.log('[AuthPersistenceFallback] Stored auth is invalid, clearing data');
    await clearAuthDataFallback();
    return null;
  } catch (error) {
    console.error('[AuthPersistenceFallback] Error validating stored auth:', error);
    return null;
  }
};

/**
 * Force refresh authentication from Firebase and update storage (fallback)
 */
export const refreshStoredAuthFallback = async (): Promise<AuthUser | null> => {
  try {
    console.log('[AuthPersistenceFallback] Refreshing stored auth data');
    
    const currentUser = authService.getCurrentUser();
    
    if (currentUser) {
      // Update stored data with current Firebase user
      await storeAuthDataFallback(currentUser);
      console.log('[AuthPersistenceFallback] Stored auth data refreshed');
      return currentUser;
    } else {
      // No current user, clear stored data
      await clearAuthDataFallback();
      console.log('[AuthPersistenceFallback] No current user, cleared stored data');
      return null;
    }
  } catch (error) {
    console.error('[AuthPersistenceFallback] Error refreshing stored auth:', error);
    return null;
  }
};

// Export as default object for easier importing
export const authPersistenceFallbackService = {
  storeAuthData: storeAuthDataFallback,
  getStoredAuthData: getStoredAuthDataFallback,
  clearAuthData: clearAuthDataFallback,
  validateStoredAuth: validateStoredAuthFallback,
  refreshStoredAuth: refreshStoredAuthFallback,
};
