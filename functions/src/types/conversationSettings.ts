/**
 * TypeScript types for conversation settings
 */

export interface ConversationSettings {
  id: string;                    // conversationId_userId
  conversationId: string;
  userId: string;
  tonePreference: 'formal' | 'casual' | 'auto';
  autoTranslate: boolean;
  smartRepliesEnabled: boolean;
  updatedAt: number;
}

export interface ConversationSettingsUpdate {
  tonePreference?: 'formal' | 'casual' | 'auto';
  autoTranslate?: boolean;
  smartRepliesEnabled?: boolean;
}

export interface ConversationSettingsRequest {
  conversationId: string;
  userId: string;
  settings: ConversationSettingsUpdate;
}

export interface ConversationSettingsResponse {
  success: boolean;
  settings?: ConversationSettings;
  error?: string;
}

export interface ToneDetectionResult {
  detectedTone: 'formal' | 'casual' | 'neutral';
  confidence: number;
  factors: {
    vocabulary: number;
    punctuation: number;
    sentenceStructure: number;
    emojiUsage: number;
  };
}

export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  fallbackUsed: boolean;
  source: 'user_message' | 'other_participant' | 'default';
}

export interface ConversationMetadata {
  participantCount: number;
  conversationAge: number;
  messageCount: number;
  lastActivity: number;
  isGroup: boolean;
}

export interface SettingsValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConversationSettingsQuery {
  conversationId: string;
  userId?: string;
  includeDefaults?: boolean;
}

export interface DefaultSettings {
  tonePreference: 'auto';
  autoTranslate: false;
  smartRepliesEnabled: true;
}
