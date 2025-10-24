/**
 * useAutoTranslate Hook
 * Manages auto-translate preferences for a conversation with real-time sync
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AIPreferences } from '../types/message';
import { setAutoTranslatePrefs } from '../services/ai/autoTranslateService';

interface UseAutoTranslateResult {
  /** Current auto-translate preferences */
  preferences: AIPreferences | null;
  /** Whether preferences are loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Update preferences */
  updatePreferences: (prefs: AIPreferences) => Promise<void>;
  /** Whether preferences are being saved */
  saving: boolean;
}

/**
 * Hook to manage auto-translate preferences for a user in a conversation
 * Automatically syncs preferences in real-time across devices
 * 
 * @param conversationId - ID of the conversation
 * @param userId - ID of the current user
 * @returns Auto-translate preferences and update function
 */
export function useAutoTranslate(
  conversationId: string | null,
  userId: string | null
): UseAutoTranslateResult {
  const [preferences, setPreferences] = useState<AIPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Listen to conversation changes for real-time sync
  useEffect(() => {
    if (!conversationId || !userId) {
      setLoading(false);
      return;
    }

    console.log('[useAutoTranslate] Setting up listener for conversation:', conversationId, 'user:', userId);
    
    const conversationRef = doc(db, 'conversations', conversationId);
    
    const unsubscribe = onSnapshot(
      conversationRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const aiPrefsMap = data.aiPrefs || {};
          const userPrefs = aiPrefsMap[userId] || null;
          
          console.log('[useAutoTranslate] Preferences updated for user:', userId, userPrefs);
          setPreferences(userPrefs);
          setError(null);
        } else {
          console.error('[useAutoTranslate] Conversation not found');
          setError('Conversation not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('[useAutoTranslate] Error listening to conversation:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      console.log('[useAutoTranslate] Cleaning up listener');
      unsubscribe();
    };
  }, [conversationId, userId]);

  /**
   * Update preferences with optimistic update
   */
  const updatePreferences = async (prefs: AIPreferences) => {
    if (!conversationId || !userId) {
      throw new Error('No conversation ID or user ID provided');
    }

    try {
      setSaving(true);
      
      // Optimistic update
      setPreferences(prefs);
      
      // Save to Firestore
      await setAutoTranslatePrefs(conversationId, userId, prefs);
      
      console.log('[useAutoTranslate] Preferences saved successfully');
    } catch (err: any) {
      console.error('[useAutoTranslate] Error saving preferences:', err);
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    saving,
  };
}

