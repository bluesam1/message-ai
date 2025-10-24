/**
 * User Preferences Service
 * 
 * Manages user-specific preferences in Firestore including:
 * - Preferred language for auto-translation
 * - Future preferences (theme, notifications, etc.)
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * Update user's preferred language
 * 
 * @param userId - The user's UID
 * @param language - ISO 639-1 language code (e.g., 'en', 'es', 'zh')
 * @throws Error if user not found or update fails
 */
export async function updateUserLanguage(
  userId: string,
  language: string
): Promise<void> {
  try {
    console.log(`[UserPreferences] Updating language for user ${userId} to ${language}`);
    
    const userRef = doc(db, 'users', userId);
    
    // Update the preferredLanguage field
    await updateDoc(userRef, {
      preferredLanguage: language,
    });
    
    console.log(`[UserPreferences] ✅ Language updated successfully`);
  } catch (error: any) {
    console.error('[UserPreferences] Error updating language:', error);
    
    // Provide more specific error messages
    if (error.code === 'not-found') {
      throw new Error('User profile not found');
    } else if (error.code === 'permission-denied') {
      throw new Error('Permission denied: Cannot update user preferences');
    } else {
      throw new Error('Failed to update language preference');
    }
  }
}

/**
 * Get user's preferred language
 * 
 * @param userId - The user's UID
 * @returns The user's preferred language code, or 'en' if not set (lazy migration)
 * @throws Error if fetch fails (not if user doesn't exist)
 */
export async function getUserLanguage(userId: string): Promise<string> {
  try {
    console.log(`[UserPreferences] Fetching language for user ${userId}`);
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.warn(`[UserPreferences] User ${userId} not found, defaulting to 'en'`);
      return 'en'; // Lazy migration: default to English
    }
    
    const data = userDoc.data();
    const language = data.preferredLanguage || 'en'; // Lazy migration: fallback to 'en'
    
    console.log(`[UserPreferences] Language for user ${userId}: ${language}`);
    return language;
  } catch (error: any) {
    console.error('[UserPreferences] Error fetching language:', error);
    
    // On fetch error, return default instead of throwing
    // This ensures the app doesn't break for users without the field
    console.warn('[UserPreferences] Returning default language "en" due to error');
    return 'en';
  }
}

/**
 * Export as default object for easier importing
 */
export const userPreferencesService = {
  updateUserLanguage,
  getUserLanguage,
};

