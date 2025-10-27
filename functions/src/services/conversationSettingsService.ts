import { getFirestore } from 'firebase-admin/firestore';
import { ConversationSettings, ConversationSettingsUpdate, DefaultSettings } from '../types/conversationSettings';
import { RAGError } from '../types/rag';

/**
 * Conversation settings service with Firestore operations
 */
export class ConversationSettingsService {
  private static instance: ConversationSettingsService;
  private db: FirebaseFirestore.Firestore;
  private defaultSettings: DefaultSettings = {
    tonePreference: 'auto',
    autoTranslate: false,
    smartRepliesEnabled: true
  };

  private constructor() {
    this.db = getFirestore();
  }

  public static getInstance(): ConversationSettingsService {
    if (!ConversationSettingsService.instance) {
      ConversationSettingsService.instance = new ConversationSettingsService();
    }
    return ConversationSettingsService.instance;
  }

  /**
   * Get conversation settings for a user
   */
  async getConversationSettings(
    conversationId: string,
    userId: string
  ): Promise<{ settings: ConversationSettings | null; error?: string }> {
    try {
      const settingsId = `${conversationId}_${userId}`;
      const settingsDoc = await this.db.collection('conversationSettings').doc(settingsId).get();
      
      if (!settingsDoc.exists) {
        return { settings: null };
      }

      const data = settingsDoc.data()!;
      const settings: ConversationSettings = {
        id: settingsId,
        conversationId,
        userId,
        tonePreference: data.tonePreference || this.defaultSettings.tonePreference,
        autoTranslate: data.autoTranslate ?? this.defaultSettings.autoTranslate,
        smartRepliesEnabled: data.smartRepliesEnabled ?? this.defaultSettings.smartRepliesEnabled,
        updatedAt: data.updatedAt || Date.now()
      };

      return { settings };
    } catch (error) {
      console.error('[ConversationSettingsService] Error getting settings:', error);
      return { 
        settings: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get or create conversation settings (simple version for background processing)
   */
  async getOrCreateConversationSettings(
    conversationId: string,
    userId: string
  ): Promise<ConversationSettings> {
    const settingsId = `${conversationId}_${userId}`;
    const settingsDoc = await this.db.collection('conversationSettings').doc(settingsId).get();

    if (settingsDoc.exists) {
      return settingsDoc.data() as ConversationSettings;
    }

    // Create default settings
    const defaultSettings = this.createDefaultSettings(conversationId, userId);
    await this.db.collection('conversationSettings').doc(settingsId).set(defaultSettings);
    
    return defaultSettings;
  }

  /**
   * Create or update conversation settings
   */
  async setConversationSettings(
    conversationId: string,
    userId: string,
    settings: ConversationSettingsUpdate
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const settingsId = `${conversationId}_${userId}`;
      const now = Date.now();
      
      const settingsData = {
        id: settingsId,
        conversationId,
        userId,
        tonePreference: settings.tonePreference || this.defaultSettings.tonePreference,
        autoTranslate: settings.autoTranslate ?? this.defaultSettings.autoTranslate,
        smartRepliesEnabled: settings.smartRepliesEnabled ?? this.defaultSettings.smartRepliesEnabled,
        updatedAt: now
      };

      await this.db.collection('conversationSettings').doc(settingsId).set(settingsData);
      
      return { success: true };
    } catch (error) {
      console.error('[ConversationSettingsService] Error setting settings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Creates default conversation settings for a user
   */
  createDefaultSettings(conversationId: string, userId: string): ConversationSettings {
    const now = Date.now();
    
    return {
      id: `${conversationId}_${userId}`,
      conversationId,
      userId,
      tonePreference: this.defaultSettings.tonePreference,
      autoTranslate: this.defaultSettings.autoTranslate,
      smartRepliesEnabled: this.defaultSettings.smartRepliesEnabled,
      updatedAt: now
    };
  }

  /**
   * Updates conversation settings
   */
  updateSettings(
    currentSettings: ConversationSettings,
    updates: ConversationSettingsUpdate
  ): ConversationSettings {
    const now = Date.now();
    
    return {
      ...currentSettings,
      ...updates,
      updatedAt: now
    };
  }

  /**
   * Validates conversation settings update
   */
  validateSettingsUpdate(updates: ConversationSettingsUpdate): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate tone preference
    if (updates.tonePreference !== undefined) {
      if (!this.isValidTone(updates.tonePreference)) {
        errors.push(`Invalid tone preference: ${updates.tonePreference}`);
      }
    }

    // Validate boolean fields
    if (updates.autoTranslate !== undefined && typeof updates.autoTranslate !== 'boolean') {
      errors.push('autoTranslate must be a boolean');
    }

    if (updates.smartRepliesEnabled !== undefined && typeof updates.smartRepliesEnabled !== 'boolean') {
      errors.push('smartRepliesEnabled must be a boolean');
    }

    // Warnings for potentially problematic combinations
    if (updates.tonePreference === 'formal' && updates.autoTranslate === true) {
      warnings.push('Formal tone with auto-translate may produce inconsistent results');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Gets effective tone preference considering auto-detection
   */
  getEffectiveTonePreference(
    settings: ConversationSettings,
    detectedTone: 'formal' | 'casual' | 'neutral'
  ): 'formal' | 'casual' {
    if (settings.tonePreference === 'auto') {
      return detectedTone === 'formal' ? 'formal' : 'casual';
    }
    
    return settings.tonePreference;
  }

  /**
   * Gets effective language preference
   */
  getEffectiveLanguagePreference(
    settings: ConversationSettings,
    detectedLanguage: string
  ): string {
    // If user has set a specific language preference, use it
    
    // Otherwise, use detected language
    return detectedLanguage || 'en';
  }

  /**
   * Checks if settings require smart reply regeneration
   */
  requiresRegeneration(
    oldSettings: ConversationSettings,
    newSettings: ConversationSettings
  ): boolean {
    // Regenerate if tone preference changed
    if (oldSettings.tonePreference !== newSettings.tonePreference) {
      return true;
    }
    
    // Regenerate if smart replies were enabled/disabled
    if (oldSettings.smartRepliesEnabled !== newSettings.smartRepliesEnabled) {
      return true;
    }
    
    return false;
  }

  /**
   * Gets settings for smart reply generation
   */
  getSmartReplySettings(settings: ConversationSettings): {
    enabled: boolean;
    tone: 'formal' | 'casual';
    language: string;
    autoTranslate: boolean;
  } {
    return {
      enabled: settings.smartRepliesEnabled,
      tone: settings.tonePreference === 'auto' ? 'casual' : settings.tonePreference,
      language: 'en', // Will be detected from user's last message
      autoTranslate: settings.autoTranslate
    };
  }

  /**
   * Merges settings with defaults
   */
  mergeWithDefaults(settings: Partial<ConversationSettings>): ConversationSettings {
    return {
      id: settings.id || '',
      conversationId: settings.conversationId || '',
      userId: settings.userId || '',
      tonePreference: settings.tonePreference || this.defaultSettings.tonePreference,
      autoTranslate: settings.autoTranslate ?? this.defaultSettings.autoTranslate,
      smartRepliesEnabled: settings.smartRepliesEnabled ?? this.defaultSettings.smartRepliesEnabled,
      updatedAt: settings.updatedAt || Date.now()
    };
  }

  /**
   * Validates tone preference
   */
  private isValidTone(tone: string): boolean {
    return ['formal', 'casual', 'auto'].includes(tone);
  }

  /**
   * Gets default settings
   */
  getDefaultSettings(): DefaultSettings {
    return { ...this.defaultSettings };
  }

  /**
   * Updates default settings
   */
  updateDefaultSettings(newDefaults: Partial<DefaultSettings>): void {
    this.defaultSettings = { ...this.defaultSettings, ...newDefaults };
  }

  /**
   * Creates a settings update request
   */
  createUpdateRequest(
    conversationId: string,
    userId: string,
    updates: ConversationSettingsUpdate
  ): {
    conversationId: string;
    userId: string;
    settings: ConversationSettingsUpdate;
  } {
    return {
      conversationId,
      userId,
      settings: updates
    };
  }

  /**
   * Handles settings update errors
   */
  handleUpdateError(error: Error, context: string): RAGError {
    return {
      name: 'ConversationSettingsError',
      message: `Failed to update conversation settings: ${error.message}`,
      code: 'SETTINGS_UPDATE_FAILED',
      step: context,
      retryable: true,
      context: { error: error.message }
    };
  }

  /**
   * Checks if settings are valid
   */
  validateSettings(settings: ConversationSettings): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!settings.id || !settings.conversationId || !settings.userId) {
      errors.push('Missing required fields: id, conversationId, or userId');
    }

    if (!this.isValidTone(settings.tonePreference)) {
      errors.push(`Invalid tone preference: ${settings.tonePreference}`);
    }

    if (typeof settings.autoTranslate !== 'boolean') {
      errors.push('autoTranslate must be a boolean');
    }

    if (typeof settings.smartRepliesEnabled !== 'boolean') {
      errors.push('smartRepliesEnabled must be a boolean');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets settings summary for logging
   */
  getSettingsSummary(settings: ConversationSettings): string {
    return `Settings: tone=${settings.tonePreference}, translate=${settings.autoTranslate}, smartReplies=${settings.smartRepliesEnabled}`;
  }
}

// Export singleton instance
export const conversationSettingsService = ConversationSettingsService.getInstance();
