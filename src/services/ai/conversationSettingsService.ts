/**
 * Client service for conversation settings
 */

import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { ConversationSettings } from '../../../functions/src/types/conversationSettings';

export interface ConversationSettingsState {
  settings: ConversationSettings | null;
  loading: boolean;
  error: string | null;
}

/**
 * Conversation settings service for client-side integration
 */
export class ConversationSettingsService {
  private db = getFirestore();
  private listeners: Map<string, Unsubscribe> = new Map();

  /**
   * Gets conversation settings for a user
   */
  async getConversationSettings(
    conversationId: string,
    userId: string
  ): Promise<ConversationSettingsState> {
    try {
      const settingsId = `${conversationId}_${userId}`;
      const settingsDoc = doc(this.db, 'conversationSettings', settingsId);
      const settingsSnapshot = await getDoc(settingsDoc);

      if (!settingsSnapshot.exists()) {
        // Return default settings
        const defaultSettings: ConversationSettings = {
          id: settingsId,
          conversationId,
          userId,
          tonePreference: 'auto',
          autoTranslate: false,
          smartRepliesEnabled: true,
          updatedAt: Date.now()
        };

        return {
          settings: defaultSettings,
          loading: false,
          error: null
        };
      }

      const data = settingsSnapshot.data() as ConversationSettings;
      
      return {
        settings: data,
        loading: false,
        error: null
      };
    } catch (error) {
      console.error('Failed to get conversation settings:', error);
      return {
        settings: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load settings'
      };
    }
  }

  /**
   * Creates or updates conversation settings
   */
  async updateConversationSettings(
    conversationId: string,
    userId: string,
    updates: Partial<ConversationSettings>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const settingsId = `${conversationId}_${userId}`;
      const settingsDoc = doc(this.db, 'conversationSettings', settingsId);
      
      // Get existing settings or create defaults
      const existingSnapshot = await getDoc(settingsDoc);
      const existingSettings = existingSnapshot.exists() 
        ? existingSnapshot.data() as ConversationSettings
        : {
            id: settingsId,
            conversationId,
            userId,
            tonePreference: 'auto' as const,
            languagePreference: 'en',
            autoTranslate: false,
            smartRepliesEnabled: true,
            updatedAt: Date.now()
          };

      // Merge with updates
      const updatedSettings: ConversationSettings = {
        ...existingSettings,
        ...updates,
        updatedAt: Date.now()
      };

      // Save to Firestore
      await setDoc(settingsDoc, updatedSettings);

      return { success: true };
    } catch (error) {
      console.error('Failed to update conversation settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings'
      };
    }
  }

  /**
   * Subscribes to conversation settings updates
   */
  subscribeToConversationSettings(
    conversationId: string,
    userId: string,
    onUpdate: (state: ConversationSettingsState) => void
  ): () => void {
    const settingsId = `${conversationId}_${userId}`;
    
    // Remove existing listener if any
    this.unsubscribeFromConversationSettings(conversationId, userId);

    const settingsDoc = doc(this.db, 'conversationSettings', settingsId);
    
    const unsubscribe = onSnapshot(
      settingsDoc,
      (snapshot) => {
        if (!snapshot.exists()) {
          // Return default settings
          const defaultSettings: ConversationSettings = {
            id: settingsId,
            conversationId,
            userId,
            tonePreference: 'auto',
            autoTranslate: false,
            smartRepliesEnabled: true,
            updatedAt: Date.now()
          };

          onUpdate({
            settings: defaultSettings,
            loading: false,
            error: null
          });
          return;
        }

        const data = snapshot.data() as ConversationSettings;
        
        onUpdate({
          settings: data,
          loading: false,
          error: null
        });
      },
      (error) => {
        console.error('Conversation settings subscription error:', error);
        onUpdate({
          settings: null,
          loading: false,
          error: error.message
        });
      }
    );

    this.listeners.set(settingsId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Unsubscribes from conversation settings updates
   */
  unsubscribeFromConversationSettings(conversationId: string, userId: string): void {
    const settingsId = `${conversationId}_${userId}`;
    const unsubscribe = this.listeners.get(settingsId);
    
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(settingsId);
    }
  }

  /**
   * Unsubscribes from all conversation settings listeners
   */
  unsubscribeFromAllConversationSettings(): void {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }

  /**
   * Updates tone preference
   */
  async updateTonePreference(
    conversationId: string,
    userId: string,
    tonePreference: 'formal' | 'casual' | 'auto'
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateConversationSettings(conversationId, userId, {
      tonePreference
    });
  }

  /**
   * Updates language preference
   */
  async updateLanguagePreference(
    conversationId: string,
    userId: string,
    languagePreference: string
  ): Promise<{ success: boolean; error?: string }> {
    // Language preference functionality removed
    return Promise.resolve({ success: false, error: 'Language preference functionality has been removed' });
  }

  /**
   * Updates auto-translate setting
   */
  async updateAutoTranslate(
    conversationId: string,
    userId: string,
    autoTranslate: boolean
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateConversationSettings(conversationId, userId, {
      autoTranslate
    });
  }

  /**
   * Updates smart replies enabled setting
   */
  async updateSmartRepliesEnabled(
    conversationId: string,
    userId: string,
    smartRepliesEnabled: boolean
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateConversationSettings(conversationId, userId, {
      smartRepliesEnabled
    });
  }

  /**
   * Validates tone preference
   */
  isValidTonePreference(tone: string): tone is 'formal' | 'casual' | 'auto' {
    return ['formal', 'casual', 'auto'].includes(tone);
  }

  /**
   * Validates language preference
   */
  isValidLanguagePreference(language: string): boolean {
    // Basic language code validation (ISO 639-1)
    const validLanguages = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
      'ar', 'hi', 'th', 'vi', 'tr', 'pl', 'nl', 'sv', 'da', 'no'
    ];
    
    return validLanguages.includes(language.toLowerCase());
  }

  /**
   * Gets tone display name
   */
  getToneDisplayName(tone: 'formal' | 'casual' | 'auto'): string {
    const toneNames: Record<string, string> = {
      'formal': 'Formal',
      'casual': 'Casual',
      'auto': 'Auto'
    };
    
    return toneNames[tone] || 'Unknown';
  }

  /**
   * Gets tone icon
   */
  getToneIcon(tone: 'formal' | 'casual' | 'auto'): string {
    const toneIcons: Record<string, string> = {
      'formal': '📝',
      'casual': '😊',
      'auto': '🤖'
    };
    
    return toneIcons[tone] || '❓';
  }

  /**
   * Gets language display name
   */
  getLanguageDisplayName(language: string): string {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean'
    };
    
    return languageNames[language] || language.toUpperCase();
  }
}
