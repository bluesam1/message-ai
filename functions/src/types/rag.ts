/**
 * TypeScript types for RAG pipeline and smart replies
 */

export interface SmartReplies {
  id: string;                    // conversationId_userId
  conversationId: string;
  userId: string;
  replies: string[];             // 3 generated replies
  contextAnalysis: ContextAnalysis;
  generatedAt: number;
  expiresAt?: number;            // Optional expiration
}

export interface ContextAnalysis {
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  entities: string[];
  language: string;
  tone: 'formal' | 'casual' | 'auto';
  messageCount: number;
  analyzedAt: number;
}

export interface ConversationSettings {
  id: string;                    // conversationId_userId
  conversationId: string;
  userId: string;
  tonePreference: 'formal' | 'casual' | 'auto';
  languagePreference: string;    // User's target language
  autoTranslate: boolean;
  smartRepliesEnabled: boolean;
  updatedAt: number;
}

export interface RAGPipelineStep {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

export interface RAGPipelineResult {
  success: boolean;
  smartReplies: SmartReplies;
  pipelineSteps: RAGPipelineStep[];
  totalDuration: number;
  error?: string;
}

export interface MessageContext {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  relevanceScore: number;
  language: string;
  tone: 'formal' | 'casual' | 'neutral';
}

export interface ContextExtractionResult {
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  keyEntities: string[];
  conversationTone: 'formal' | 'casual' | 'neutral';
  language: string;
  messageCount: number;
}

export interface RelevanceScore {
  messageId: string;
  score: number;
  factors: {
    recency: number;
    engagement: number;
    importance: number;
  };
}

export interface EntityRecognitionResult {
  entities: string[];
  categories: {
    people: string[];
    places: string[];
    organizations: string[];
    topics: string[];
    dates: string[];
  };
}

export interface SmartReplyGenerationRequest {
  conversationId: string;
  userId: string;
  contextAnalysis: ContextExtractionResult;
  conversationSettings: ConversationSettings;
  recentMessages: MessageContext[];
}

export interface SmartReplyGenerationResult {
  replies: string[];
  generationMetadata: {
    model: string;
    tokens: number;
    temperature: number;
    maxTokens: number;
  };
}

export interface RAGConfig {
  maxMessages: number;
  contextWindowSize: number;
  generationTimeout: number;
  cacheExpiration: number;
  parallelExecution: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface FirestoreTriggerData {
  conversationId: string;
  userId: string;
  messageId: string;
  timestamp: number;
  triggerType: 'message_created' | 'conversation_updated' | 'settings_updated';
}

export interface BackgroundProcessingResult {
  success: boolean;
  smartRepliesId?: string;
  error?: string;
  processingTime: number;
  cacheHit: boolean;
}

export interface PerformanceMetrics {
  totalDuration: number;
  stepDurations: Record<string, number>;
  parallelExecutionSavings: number;
  cacheHitRate: number;
  errorRate: number;
}

export interface RAGError extends Error {
  code: string;
  step: string;
  retryable: boolean;
  context?: Record<string, any>;
}
