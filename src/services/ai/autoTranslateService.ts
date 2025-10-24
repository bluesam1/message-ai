/**
 * Auto-Translate Service
 * Manages auto-translation preferences for conversations
 */

import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AIPreferences } from '../../types/message';

/**
 * Get auto-translate preferences for a user in a conversation
 * 
 * @param conversationId - ID of the conversation
 * @param userId - ID of the user
 * @returns AI preferences or null if not set
 */
export async function getAutoTranslatePrefs(
  conversationId: string,
  userId: string
): Promise<AIPreferences | null> {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (!conversationDoc.exists()) {
      console.error('[AutoTranslateService] Conversation not found:', conversationId);
      return null;
    }
    
    const data = conversationDoc.data();
    const aiPrefsMap = data.aiPrefs || {};
    return aiPrefsMap[userId] || null;
  } catch (error) {
    console.error('[AutoTranslateService] Error fetching preferences:', error);
    throw error;
  }
}

/**
 * Set auto-translate preferences for a user in a conversation
 * 
 * @param conversationId - ID of the conversation
 * @param userId - ID of the user
 * @param preferences - AI preferences to save
 */
export async function setAutoTranslatePrefs(
  conversationId: string,
  userId: string,
  preferences: AIPreferences
): Promise<void> {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    
    // Check if conversation exists
    const conversationDoc = await getDoc(conversationRef);
    
    if (!conversationDoc.exists()) {
      console.error('[AutoTranslateService] Conversation not found:', conversationId);
      throw new Error('Conversation not found');
    }
    
    // Update preferences for this user
    await updateDoc(conversationRef, {
      [`aiPrefs.${userId}`]: preferences,
      updatedAt: Date.now(),
    });
    
    console.log('[AutoTranslateService] Preferences saved for user:', userId, preferences);
  } catch (error) {
    console.error('[AutoTranslateService] Error saving preferences:', error);
    throw error;
  }
}

/**
 * Clear auto-translate preferences for a user in a conversation
 * 
 * @param conversationId - ID of the conversation
 * @param userId - ID of the user
 */
export async function clearAutoTranslatePrefs(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }
    
    const data = conversationDoc.data();
    const aiPrefsMap = data.aiPrefs || {};
    
    // Remove this user's preferences
    delete aiPrefsMap[userId];
    
    await updateDoc(conversationRef, {
      aiPrefs: aiPrefsMap,
      updatedAt: Date.now(),
    });
    
    console.log('[AutoTranslateService] Preferences cleared for user:', userId);
  } catch (error) {
    console.error('[AutoTranslateService] Error clearing preferences:', error);
    throw error;
  }
}

