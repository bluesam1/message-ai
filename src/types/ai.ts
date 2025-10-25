/**
 * TypeScript interfaces for AI features
 * 
 * This file contains type definitions for all AI-related functionality
 * including formality adjustment, smart replies, and related features.
 */

/**
 * Tone types for formality adjustment
 */
export type ToneType = 'formal' | 'casual' | 'neutral';

/**
 * AI preferences for a user in a conversation
 */
export interface AIPreferences {
  targetLang: string;                    // Target language for auto-translation (ISO 639-1 code)
  autoTranslate: boolean;               // Enable/disable auto-translation for incoming messages
  defaultTone?: ToneType;              // Default tone for AI replies
  realTimeToneAdjustment?: boolean;    // Enable real-time tone adjustment suggestions
}

/**
 * Smart replies cache for a conversation
 */
export interface SmartRepliesCache {
  replies: string[];                    // Array of 3 smart reply suggestions
  lastUpdated: Date;                    // When replies were last generated
  userId: string;                       // User ID who requested the replies
}

/**
 * Rephrase history for a message
 */
export interface RephraseHistory {
  original: string;                     // Original message text
  formal?: string;                      // Formal version (if generated)
  casual?: string;                      // Casual version (if generated)
}

/**
 * Extended AI metadata for messages
 */
export interface AIMetadata {
  detectedLang?: string;                // Detected language of the message (ISO 639-1 code)
  translatedText?: {                    // Translations keyed by language code
    [lang: string]: string;
  };
  explanation?: string;                 // Cultural context explanation
  slangDefinition?: string;             // Slang/idiom definition
  feedback?: 'positive' | 'negative';  // User rating of translation quality
  rephraseHistory?: RephraseHistory;    // History of rephrase attempts
}

/**
 * Request interface for rephrase message Cloud Function
 */
export interface RephraseMessageRequest {
  text: string;
  tone: 'formal' | 'casual';
  conversationId?: string;
}

/**
 * Response interface for rephrase message Cloud Function
 */
export interface RephraseMessageResponse {
  rephrasedText: string;
  originalText: string;
  tone: string;
  tokensUsed: number;
}

/**
 * Request interface for generate smart replies Cloud Function
 */
export interface GenerateSmartRepliesRequest {
  conversationId: string;
  userId: string;
}

/**
 * Response interface for generate smart replies Cloud Function
 */
export interface GenerateSmartRepliesResponse {
  replies: string[];
  conversationLanguage: string;
  conversationTone: string;
  tokensUsed: number;
  cached: boolean;
}

/**
 * AI feature types for cost monitoring
 */
export type AIFeatureType = 
  | 'translate' 
  | 'explain' 
  | 'define' 
  | 'detect_language' 
  | 'auto_detect_language' 
  | 'auto_translate'
  | 'rephrase'
  | 'smart_replies';

/**
 * Token usage tracking for AI features
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  cost: number;
  timestamp: number;
}

/**
 * AI usage record for monitoring
 */
export interface AIUsageRecord {
  userId: string;
  featureType: AIFeatureType;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  cost: number;
  timestamp: Date;
}

/**
 * Conversation context for smart replies generation
 */
export interface ConversationContext {
  messages: Array<{
    text: string;
    senderId: string;
    timestamp: Date;
    aiMeta?: AIMetadata;
  }>;
  language: string;
  tone: string;
  aiPrefs?: AIPreferences;
}

/**
 * Smart reply chip component props
 */
export interface SmartReplyChipProps {
  reply: string;
  onPress: (reply: string) => void;
  loading?: boolean;
}

/**
 * Tone suggestion chip component props
 */
export interface ToneSuggestionChipProps {
  originalText: string;
  rephrasedText: string;
  tone: 'formal' | 'casual';
  onAccept: (rephrasedText: string) => void;
  onReject: () => void;
  loading?: boolean;
}

/**
 * Rephrase modal component props
 */
export interface RephraseModalProps {
  visible: boolean;
  originalText: string;
  onClose: () => void;
  onRephrase: (tone: 'formal' | 'casual') => void;
  loading?: boolean;
}

/**
 * Hook return types for AI features
 */
export interface UseSmartRepliesReturn {
  replies: string[];
  loading: boolean;
  error: string | null;
  generateReplies: () => void;
  clearReplies: () => void;
  refreshReplies: () => Promise<void>;
  getCachedReplies: () => Promise<boolean | undefined>;
  getSmartReplies: () => Promise<void>;
}

export interface UseToneAdjustmentReturn {
  rephrasedText: string | null;
  loading: boolean;
  error: string | null;
  rephraseMessage: (text: string, tone: 'formal' | 'casual') => void;
  clearRephrase: () => void;
  getExistingRephrase: (tone: 'formal' | 'casual') => Promise<string | null>;
  hasRephraseHistory: () => Promise<boolean>;
  rephraseWithRealTime: (text: string, tone: 'formal' | 'casual') => Promise<void>;
  acceptRephrase: (onAccept: (text: string) => void) => void;
  rejectRephrase: () => void;
}

/**
 * Service interfaces for AI features
 */
export interface SmartRepliesService {
  generateReplies: (conversationId: string, userId: string) => Promise<GenerateSmartRepliesResponse>;
  getCachedReplies: (conversationId: string) => Promise<string[] | null>;
  clearCache: (conversationId: string) => Promise<void>;
}

export interface ToneAdjustmentService {
  rephraseMessage: (text: string, tone: 'formal' | 'casual') => Promise<RephraseMessageResponse>;
  saveRephraseHistory: (messageId: string, history: RephraseHistory) => Promise<void>;
}
