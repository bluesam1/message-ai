/**
 * Utility functions for RAG pipeline operations
 */

import { 
  RAGPipelineStep, 
  MessageContext, 
  ContextExtractionResult,
  RelevanceScore,
  EntityRecognitionResult,
  RAGConfig,
  PerformanceMetrics,
  RAGError
} from '../types/rag';

/**
 * Creates a new pipeline step with timing
 */
export function createPipelineStep(name: string): RAGPipelineStep {
  return {
    name,
    startTime: Date.now(),
    success: false
  };
}

/**
 * Completes a pipeline step with timing and success status
 */
export function completePipelineStep(
  step: RAGPipelineStep, 
  success: boolean, 
  error?: string
): RAGPipelineStep {
  const endTime = Date.now();
  return {
    ...step,
    endTime,
    duration: endTime - step.startTime,
    success,
    error
  };
}

/**
 * Calculates relevance score for a message based on multiple factors
 */
export function calculateRelevanceScore(
  message: MessageContext,
  currentTime: number = Date.now()
): RelevanceScore {
  const ageInHours = (currentTime - message.timestamp) / (1000 * 60 * 60);
  
  // Recency factor (exponential decay)
  const recency = Math.exp(-ageInHours / 24); // Half-life of 24 hours
  
  // Engagement factor (based on message length and complexity)
  const engagement = Math.min(message.text.length / 100, 1); // Normalize to 0-1
  
  // Importance factor (simple heuristic)
  const importance = message.text.includes('?') ? 1.2 : 1.0; // Questions are more important
  
  const score = (recency * 0.4) + (engagement * 0.3) + (importance * 0.3);
  
  return {
    messageId: message.id,
    score,
    factors: {
      recency,
      engagement,
      importance
    }
  };
}

/**
 * Extracts key entities from text using simple regex patterns
 */
export function extractEntities(text: string): EntityRecognitionResult {
  const entities: string[] = [];
  const categories = {
    people: [] as string[],
    places: [] as string[],
    organizations: [] as string[],
    topics: [] as string[],
    dates: [] as string[]
  };

  // Simple entity extraction patterns
  const patterns = {
    // People (capitalized words that might be names)
    people: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    // Places (common place indicators)
    places: /\b(in|at|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi,
    // Organizations (common org indicators)
    organizations: /\b(Inc|Corp|LLC|Ltd|Company|University|College|School)\b/gi,
    // Topics (words that might indicate topics)
    topics: /\b(meeting|project|deadline|budget|plan|idea|discussion|problem|solution)\b/gi,
    // Dates (simple date patterns)
    dates: /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|tomorrow|yesterday|today|next week|last week)\b/gi
  };

  // Extract entities using patterns
  Object.entries(patterns).forEach(([category, pattern]) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        entities.push(match);
        (categories as any)[category].push(match);
      });
    }
  });

  return {
    entities,
    categories
  };
}

/**
 * Analyzes conversation context from messages
 */
export function analyzeContext(messages: MessageContext[]): ContextExtractionResult {
  if (messages.length === 0) {
    return {
      topics: [],
      sentiment: 'neutral',
      keyEntities: [],
      conversationTone: 'neutral',
      language: 'en',
      messageCount: 0
    };
  }

  // Extract topics from message text
  const allText = messages.map(m => m.text).join(' ');
  const topics = extractTopics(allText);
  
  // Analyze sentiment (simple heuristic)
  const sentiment = analyzeSentiment(allText);
  
  // Extract entities
  const entities = extractEntities(allText);
  
  // Determine conversation tone
  const tone = determineConversationTone(messages);
  
  // Detect language (simple heuristic)
  const language = detectLanguage(allText);

  return {
    topics,
    sentiment,
    keyEntities: entities.entities,
    conversationTone: tone,
    language,
    messageCount: messages.length
  };
}

/**
 * Extracts topics from text using keyword analysis
 */
function extractTopics(text: string): string[] {
  const topicKeywords = [
    'work', 'project', 'meeting', 'deadline', 'budget',
    'family', 'friends', 'weekend', 'vacation', 'travel',
    'food', 'restaurant', 'cooking', 'recipe',
    'health', 'exercise', 'doctor', 'medicine',
    'shopping', 'buy', 'purchase', 'price',
    'weather', 'rain', 'sunny', 'cold', 'hot'
  ];

  const topics: string[] = [];
  const lowerText = text.toLowerCase();

  topicKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      topics.push(keyword);
    }
  });

  return [...new Set(topics)]; // Remove duplicates
}

/**
 * Analyzes sentiment using simple keyword-based approach
 */
function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['good', 'great', 'awesome', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'happy', 'excited'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'sad', 'disappointed', 'frustrated', 'worried', 'concerned'];

  const lowerText = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;

  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveScore++;
  });

  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeScore++;
  });

  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

/**
 * Determines conversation tone from messages
 */
function determineConversationTone(messages: MessageContext[]): 'formal' | 'casual' | 'neutral' {
  if (messages.length === 0) return 'neutral';

  let formalScore = 0;
  let casualScore = 0;

  messages.forEach(message => {
    const text = message.text.toLowerCase();
    
    // Formal indicators
    if (text.includes('please') || text.includes('thank you') || text.includes('sincerely')) {
      formalScore++;
    }
    
    // Casual indicators
    if (text.includes('hey') || text.includes('lol') || text.includes('haha') || text.includes('omg')) {
      casualScore++;
    }
    
    // Emoji usage (casual)
    if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(message.text)) {
      casualScore++;
    }
  });

  if (formalScore > casualScore) return 'formal';
  if (casualScore > formalScore) return 'casual';
  return 'neutral';
}

/**
 * Detects language using simple heuristic
 */
function detectLanguage(text: string): string {
  // Simple language detection based on common words
  const languagePatterns = {
    'en': /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
    'es': /\b(el|la|los|las|y|o|pero|en|con|por|para|de)\b/gi,
    'fr': /\b(le|la|les|et|ou|mais|dans|avec|pour|de|du|des)\b/gi,
    'de': /\b(der|die|das|und|oder|aber|in|mit|für|von|zu)\b/gi
  };

  let maxMatches = 0;
  let detectedLanguage = 'en'; // Default to English

  Object.entries(languagePatterns).forEach(([lang, pattern]) => {
    const matches = text.match(pattern);
    if (matches && matches.length > maxMatches) {
      maxMatches = matches.length;
      detectedLanguage = lang;
    }
  });

  return detectedLanguage;
}

/**
 * Creates performance metrics from pipeline steps
 */
export function createPerformanceMetrics(steps: RAGPipelineStep[]): PerformanceMetrics {
  const totalDuration = steps.reduce((sum, step) => sum + (step.duration || 0), 0);
  const stepDurations: Record<string, number> = {};
  let errorRate = 0;

  steps.forEach(step => {
    stepDurations[step.name] = step.duration || 0;
    if (!step.success) errorRate++;
  });

  errorRate = errorRate / steps.length;

  return {
    totalDuration,
    stepDurations,
    parallelExecutionSavings: 0, // Will be calculated by parallel execution logic
    cacheHitRate: 0, // Will be set by caching logic
    errorRate
  };
}

/**
 * Creates a RAG error with context
 */
export function createRAGError(
  message: string,
  code: string,
  step: string,
  retryable: boolean = true,
  context?: Record<string, any>
): RAGError {
  const error = new Error(message) as RAGError;
  error.code = code;
  error.step = step;
  error.retryable = retryable;
  error.context = context;
  return error;
}

/**
 * Validates RAG configuration
 */
export function validateRAGConfig(config: Partial<RAGConfig>): RAGConfig {
  const defaultConfig: RAGConfig = {
    maxMessages: 30,
    contextWindowSize: 4000,
    generationTimeout: 60000,
    cacheExpiration: 5 * 60 * 1000, // 5 minutes - much shorter for better context awareness
    parallelExecution: true,
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 150
  };

  return {
    ...defaultConfig,
    ...config,
    maxMessages: Math.max(1, Math.min(config.maxMessages || defaultConfig.maxMessages, 100)),
    contextWindowSize: Math.max(1000, Math.min(config.contextWindowSize || defaultConfig.contextWindowSize, 8000)),
    generationTimeout: Math.max(10000, Math.min(config.generationTimeout || defaultConfig.generationTimeout, 120000)),
    temperature: Math.max(0, Math.min(config.temperature || defaultConfig.temperature, 2)),
    maxTokens: Math.max(50, Math.min(config.maxTokens || defaultConfig.maxTokens, 500))
  };
}

/**
 * Formats messages for context window
 */
export function formatMessagesForContext(
  messages: MessageContext[],
  maxLength: number = 4000
): string {
  let context = '';
  let currentLength = 0;

  // Sort messages by timestamp (oldest first)
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  for (const message of sortedMessages) {
    const messageText = `[${new Date(message.timestamp).toISOString()}] ${message.text}\n`;
    
    if (currentLength + messageText.length > maxLength) {
      break;
    }
    
    context += messageText;
    currentLength += messageText.length;
  }

  return context.trim();
}
