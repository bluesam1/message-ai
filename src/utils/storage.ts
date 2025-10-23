/**
 * Expo-Compatible Storage Utility
 * 
 * Provides a unified storage interface that works with:
 * - Web: localStorage
 * - React Native: Expo SecureStore (works in Expo Go)
 * - Expo: Works without custom dev builds
 */

import * as SecureStore from 'expo-secure-store';

// Check if we're running in a web environment
const isWeb = typeof window !== 'undefined' && window.localStorage;

// Create SecureStore adapter that looks like AsyncStorage
const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => 
    SecureStore.setItemAsync(key, value, { keychainService: 'message-ai-auth' }),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  clear: () => SecureStore.deleteItemAsync('message_ai_auth_user').then(() => 
    SecureStore.deleteItemAsync('message_ai_auth_token')
  ),
};

/**
 * Web-compatible storage interface
 */
export const storage = {
  /**
   * Store a value in persistent storage
   */
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (isWeb) {
        // Use localStorage for web
        localStorage.setItem(key, value);
        console.log('[Storage] Stored in localStorage:', key);
      } else {
        // Use SecureStore for React Native/Expo
        await secureStoreAdapter.setItem(key, value);
        console.log('[Storage] Stored in SecureStore:', key);
      }
    } catch (error) {
      console.error('[Storage] Error storing item:', error);
      // Fallback to memory storage
      memoryStorage[key] = value;
    }
  },

  /**
   * Retrieve a value from persistent storage
   */
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (isWeb) {
        // Use localStorage for web
        const value = localStorage.getItem(key);
        console.log('[Storage] Retrieved from localStorage:', key, !!value);
        return value;
      } else {
        // Use SecureStore for React Native/Expo
        const value = await secureStoreAdapter.getItem(key);
        console.log('[Storage] Retrieved from SecureStore:', key, !!value);
        return value;
      }
    } catch (error) {
      console.error('[Storage] Error retrieving item:', error);
      // Fallback to memory storage
      return memoryStorage[key] || null;
    }
  },

  /**
   * Remove a value from persistent storage
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      if (isWeb) {
        // Use localStorage for web
        localStorage.removeItem(key);
        console.log('[Storage] Removed from localStorage:', key);
      } else {
        // Use SecureStore for React Native/Expo
        await secureStoreAdapter.removeItem(key);
        console.log('[Storage] Removed from SecureStore:', key);
      }
    } catch (error) {
      console.error('[Storage] Error removing item:', error);
      // Fallback to memory storage
      delete memoryStorage[key];
    }
  },

  /**
   * Clear all stored values
   */
  clear: async (): Promise<void> => {
    try {
      if (isWeb) {
        // Clear localStorage for web
        localStorage.clear();
        console.log('[Storage] Cleared localStorage');
      } else {
        // Clear SecureStore for React Native/Expo
        await secureStoreAdapter.clear();
        console.log('[Storage] Cleared SecureStore');
      }
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error);
      // Fallback to memory storage
      Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
    }
  }
};

// Memory storage fallback
const memoryStorage: { [key: string]: string } = {};

// Export the storage interface
export default storage;
