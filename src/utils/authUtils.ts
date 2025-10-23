/**
 * Authentication Utilities
 * 
 * Helper functions for managing authentication persistence
 */

import { authService } from '../services/firebase/authService';

/**
 * Check if user is currently authenticated
 */
export const isAuthenticated = (): boolean => {
  const currentUser = authService.getCurrentUser();
  return currentUser !== null;
};

/**
 * Get current user ID if authenticated
 */
export const getCurrentUserId = (): string | null => {
  const currentUser = authService.getCurrentUser();
  return currentUser?.uid || null;
};

/**
 * Wait for authentication state to be determined
 * Useful for ensuring auth state is ready before navigation
 */
export const waitForAuthState = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user !== null);
    });
  });
};

/**
 * Force refresh authentication state
 * Useful when auth state might be stale
 */
export const refreshAuthState = async (): Promise<boolean> => {
  try {
    const currentUser = authService.getCurrentUser();
    return currentUser !== null;
  } catch (error) {
    console.error('Error refreshing auth state:', error);
    return false;
  }
};
