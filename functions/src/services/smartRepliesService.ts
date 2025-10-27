import { 
  SmartReplies, 
  RAGPipelineStep, 
  RAGPipelineResult,
  MessageContext, 
  ContextExtractionResult,
  RelevanceScore,
  EntityRecognitionResult,
  SmartReplyGenerationResult,
  RAGConfig,
  PerformanceMetrics
} from '../types/rag';
import { ConversationSettings } from '../types/conversationSettings';
import { 
  createPipelineStep, 
  completePipelineStep, 
  calculateRelevanceScore, 
  extractEntities, 
  analyzeContext,
  createPerformanceMetrics,
  validateRAGConfig,
  formatMessagesForContext
} from '../utils/ragUtils';
import { conversationSettingsService } from './conversationSettingsService';
import { messageService } from './messageService';
import { contextAnalysisService } from './contextAnalysisService';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

/**
 * Smart Replies Service implementing 8-step RAG pipeline
 */
export class SmartRepliesService {
  private static instance: SmartRepliesService;
  private config: RAGConfig;
  private db: admin.firestore.Firestore;

  private constructor(config: Partial<RAGConfig> = {}) {
    this.config = validateRAGConfig(config);
    this.db = getFirestore();
  }

  public static getInstance(config?: Partial<RAGConfig>): SmartRepliesService {
    if (!SmartRepliesService.instance) {
      SmartRepliesService.instance = new SmartRepliesService(config);
    }
    return SmartRepliesService.instance;
  }

  /**
   * Main method to generate smart replies using 8-step RAG pipeline
   */
  async generateSmartReplies(
    conversationId: string,
    userId: string,
    messages: MessageContext[],
    conversationSettings: ConversationSettings,
    targetLanguage?: string
  ): Promise<RAGPipelineResult> {
    const pipelineSteps: RAGPipelineStep[] = [];
    const startTime = Date.now();

    try {
      // Step 1: Retrieval - Extract last 30 messages
      const retrievalStep = createPipelineStep('Retrieval');
      const recentMessages = this.retrieveRecentMessages(messages);
      const completedRetrievalStep = completePipelineStep(retrievalStep, true);
      pipelineSteps.push(completedRetrievalStep);

      // Step 2-4: Parallel execution of Context Extraction, Relevance Scoring, and Entity Recognition
      const parallelStep = createPipelineStep('Parallel Analysis');
      const parallelResults = await this.executeParallelAnalysis(recentMessages, conversationSettings);
      const completedParallelStep = completePipelineStep(parallelStep, true);
      pipelineSteps.push(completedParallelStep);

      // Step 5: Augmentation - Build enriched prompt
      const augmentationStep = createPipelineStep('Augmentation');
      const enrichedPrompt = this.buildEnrichedPrompt(
        recentMessages,
        parallelResults.contextAnalysis,
        parallelResults.relevanceScores,
        parallelResults.entityRecognition,
        conversationSettings,
        targetLanguage
      );
      const completedAugmentationStep = completePipelineStep(augmentationStep, true);
      pipelineSteps.push(completedAugmentationStep);

      // Step 6: Generation - Generate smart replies
      const generationStep = createPipelineStep('Generation');
      const generationResult = await this.generateSmartRepliesWithAI(enrichedPrompt);
      const completedGenerationStep = completePipelineStep(generationStep, true);
      pipelineSteps.push(completedGenerationStep);

      // Step 7: Post-Processing - Rank and filter replies
      const postProcessingStep = createPipelineStep('Post-Processing');
      const processedReplies = this.postProcessReplies(
        generationResult.replies,
        parallelResults.contextAnalysis,
        conversationSettings
      );
      const completedPostProcessingStep = completePipelineStep(postProcessingStep, true);
      pipelineSteps.push(completedPostProcessingStep);

      // Step 8: Caching - Store results
      const cachingStep = createPipelineStep('Caching');
      const smartReplies = this.createSmartRepliesDocument(
        conversationId,
        userId,
        processedReplies,
        parallelResults.contextAnalysis,
        generationResult
      );
      const completedCachingStep = completePipelineStep(cachingStep, true);
      pipelineSteps.push(completedCachingStep);

      const totalDuration = Date.now() - startTime;

      return {
        success: true,
        smartReplies,
        pipelineSteps,
        totalDuration
      };

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        smartReplies: this.createEmptySmartReplies(conversationId, userId),
        pipelineSteps,
        totalDuration,
        error: errorMessage
      };
    }
  }

  /**
   * Step 1: Retrieve recent messages (last 30)
   */
  private retrieveRecentMessages(messages: MessageContext[]): MessageContext[] {
    return messages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.config.maxMessages);
  }

  /**
   * Steps 2-4: Parallel execution of analysis steps
   */
  private async executeParallelAnalysis(messages: MessageContext[], conversationSettings: ConversationSettings): Promise<{
    contextAnalysis: ContextExtractionResult;
    relevanceScores: RelevanceScore[];
    entityRecognition: EntityRecognitionResult;
  }> {
    try {
      // Use the new ContextAnalysisService for AI-powered analysis
      const analysisResult = await contextAnalysisService.analyzeContext(messages, conversationSettings);
      
      return {
        contextAnalysis: analysisResult.contextAnalysis,
        relevanceScores: analysisResult.relevanceScores,
        entityRecognition: analysisResult.entityRecognition
      };
    } catch (error) {
      console.error(`[SmartRepliesService] Error in AI context analysis, falling back to utility functions:`, error);
      
      // Fallback to utility functions if AI analysis fails
      const contextAnalysis = analyzeContext(messages);
      const relevanceScores = messages.map(msg => calculateRelevanceScore(msg));
      const entityRecognition = this.performEntityRecognition(messages);
      
      return { contextAnalysis, relevanceScores, entityRecognition };
    }
  }

  /**
   * Step 4: Entity Recognition
   */
  private performEntityRecognition(messages: MessageContext[]): EntityRecognitionResult {
    const allText = messages.map(m => m.text).join(' ');
    return extractEntities(allText);
  }

  /**
   * Step 5: Build enriched prompt with context
   */
  private buildEnrichedPrompt(
    messages: MessageContext[],
    contextAnalysis: ContextExtractionResult,
    relevanceScores: RelevanceScore[],
    entityRecognition: EntityRecognitionResult,
    conversationSettings: ConversationSettings,
    targetLanguage?: string
  ): string {
    const context = formatMessagesForContext(messages, this.config.contextWindowSize);
    const tone = this.getEffectiveTone(conversationSettings.tonePreference, contextAnalysis.conversationTone);
    
    const replyLanguage = targetLanguage || contextAnalysis.language;
    
        console.log(`[SmartRepliesService] Building prompt (lang: ${replyLanguage}, topics: ${contextAnalysis.topics.length}, sentiment: ${contextAnalysis.sentiment})`);
    
    return `Generate 3 contextually relevant smart replies for a ${tone} conversation.

Context:
${context}

Conversation Analysis:
- Topics: ${contextAnalysis.topics.join(', ')}
- Sentiment: ${contextAnalysis.sentiment}
- Key Entities: ${contextAnalysis.keyEntities.join(', ')}
- Language: ${contextAnalysis.language}
- Tone: ${tone}

User Preferences:
- Tone: ${tone}
- Auto-translate: ${conversationSettings.autoTranslate}
- Target Language: ${replyLanguage}

Generate 3 diverse, contextually relevant replies that:
1. Match the conversation tone (${tone})
2. Are appropriate for the current context
3. Are written EXCLUSIVELY in ${replyLanguage} language
4. Are concise and actionable
5. Feel natural and conversational

IMPORTANT: All replies must be in ${replyLanguage}. Do not use any other language.

Format as JSON array of strings.`;
  }

  /**
   * Step 6: Generate smart replies using AI
   */
  private async generateSmartRepliesWithAI(prompt: string): Promise<SmartReplyGenerationResult> {
    try {
      const { getOpenAIClient, getOpenAIModel } = await import('../utils/openai');
      const client = getOpenAIClient();
      const model = getOpenAIModel();

      console.log('[SmartRepliesService] Generating smart replies with OpenAI...');
      
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful messaging assistant. Generate exactly 3 diverse, contextually relevant reply suggestions based on the conversation context. Return only a JSON array of strings.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      console.log('[SmartRepliesService] OpenAI response:', content);

      // Parse JSON response - handle markdown code blocks
      let replies: string[];
      try {
        // Remove markdown code blocks if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log('[SmartRepliesService] Cleaned content:', cleanContent);
        
        const parsed = JSON.parse(cleanContent);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          replies = parsed.slice(0, 3).map(reply => reply.trim()).filter(reply => reply.length > 0);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (parseError) {
        console.error('[SmartRepliesService] Failed to parse OpenAI response:', parseError);
        console.error('[SmartRepliesService] Raw content was:', content);
        // Fallback replies
        replies = [
          "That sounds great!",
          "I'll get back to you on that.",
          "Let me think about it."
        ];
      }

      return {
        replies,
        generationMetadata: {
          model: this.config.model,
          tokens: tokensUsed,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
        }
      };
    } catch (error) {
      console.error('[SmartRepliesService] Error generating smart replies:', error);
      
      // Fallback replies
      const fallbackReplies = [
        "That sounds great!",
        "I'll get back to you on that.",
        "Let me think about it."
      ];

      return {
        replies: fallbackReplies,
        generationMetadata: {
          model: this.config.model,
          tokens: 0,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
        }
      };
    }
  }

  /**
   * Step 7: Post-process and rank replies
   */
  private postProcessReplies(
    replies: string[],
    contextAnalysis: ContextExtractionResult,
    conversationSettings: ConversationSettings
  ): string[] {
    // Filter out empty or invalid replies
    const validReplies = replies.filter(reply => 
      reply && reply.trim().length > 0 && reply.length <= 100
    );

    // Ensure we have exactly 3 replies
    if (validReplies.length >= 3) {
      return validReplies.slice(0, 3);
    }

    // Fill with fallback replies if needed
    const fallbackReplies = this.getFallbackReplies(conversationSettings);
    const needed = 3 - validReplies.length;
    const additionalReplies = fallbackReplies.slice(0, needed);
    
    return [...validReplies, ...additionalReplies].slice(0, 3);
  }

  /**
   * Step 8: Create smart replies document
   */
  private createSmartRepliesDocument(
    conversationId: string,
    userId: string,
    replies: string[],
    contextAnalysis: ContextExtractionResult,
    generationResult: SmartReplyGenerationResult
  ): SmartReplies {
    const now = Date.now();
    
    return {
      id: `${conversationId}_${userId}`,
      conversationId,
      userId,
      replies,
      contextAnalysis: {
        topics: contextAnalysis.topics,
        sentiment: contextAnalysis.sentiment,
        entities: contextAnalysis.keyEntities,
        language: contextAnalysis.language,
        tone: contextAnalysis.conversationTone === 'neutral' ? 'auto' : contextAnalysis.conversationTone,
        messageCount: contextAnalysis.messageCount,
        analyzedAt: now
      },
      generatedAt: now,
      expiresAt: now + this.config.cacheExpiration
    };
  }

  /**
   * Get fallback replies when generation fails
   */
  private getFallbackReplies(conversationSettings: ConversationSettings): string[] {
    const tone = conversationSettings.tonePreference;
    
    if (tone === 'formal') {
      return [
        "I understand. Thank you for the information.",
        "I'll review this and get back to you.",
        "That makes sense. Let me consider this further."
      ];
    } else if (tone === 'casual') {
      return [
        "Sounds good!",
        "Got it, thanks!",
        "Cool, I'll check it out."
      ];
    } else {
      return [
        "Thanks for letting me know.",
        "I'll look into this.",
        "Appreciate the update."
      ];
    }
  }

  /**
   * Create empty smart replies for error cases
   */
  private createEmptySmartReplies(conversationId: string, userId: string): SmartReplies {
    const now = Date.now();
    
    return {
      id: `${conversationId}_${userId}`,
      conversationId,
      userId,
      replies: [],
      contextAnalysis: {
        topics: [],
        sentiment: 'neutral',
        entities: [],
        language: 'en',
        tone: 'auto',
        messageCount: 0,
        analyzedAt: now
      },
      generatedAt: now
    };
  }

  /**
   * Get effective tone based on preference and detection
   */
  private getEffectiveTone(
    tonePreference: 'formal' | 'casual' | 'auto',
    detectedTone: 'formal' | 'casual' | 'neutral'
  ): 'formal' | 'casual' {
    if (tonePreference === 'auto') {
      return detectedTone === 'formal' ? 'formal' : 'casual';
    }
    
    return tonePreference;
  }

  /**
   * Get performance metrics from pipeline execution
   */
  getPerformanceMetrics(steps: RAGPipelineStep[]): PerformanceMetrics {
    return createPerformanceMetrics(steps);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RAGConfig>): void {
    this.config = validateRAGConfig({ ...this.config, ...newConfig });
  }

  /**
   * Get current configuration
   */
  getConfig(): RAGConfig {
    return { ...this.config };
  }

  /**
   * Generate smart replies for a user in a conversation (unified method)
   * This combines the logic from both background and manual refresh
   */
  public async generateSmartRepliesForUser(
    conversationId: string,
    userId: string,
    options: {
      forceRefresh?: boolean;
      maxRetries?: number;
      senderId?: string | null;
      targetLanguage?: string;
    } = {}
  ): Promise<{
    success: boolean;
    smartReplies?: SmartReplies;
    processingTime: number;
    cacheHit: boolean;
    error?: string;
  }> {
    const startTime = Date.now();
    const { forceRefresh = false, maxRetries = 3, targetLanguage } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SmartRepliesService] Attempting smart reply generation (attempt ${attempt}/${maxRetries}) for user ${userId}`);

        // Get or create conversation settings
        const settings = await conversationSettingsService.getOrCreateConversationSettings(conversationId, userId);
        
        if (!settings.smartRepliesEnabled) {
          console.log(`[SmartRepliesService] Smart replies disabled for user ${userId}, skipping generation`);
          return {
            success: true,
            processingTime: Date.now() - startTime,
            cacheHit: false
          };
        }

        // Check for existing smart replies (unless force refresh)
        if (!forceRefresh) {
          const existingReplies = await this.getExistingSmartReplies(conversationId, userId);
          if (existingReplies && !this.isExpired(existingReplies)) {
            console.log(`[SmartRepliesService] Using cached smart replies (user: ${userId}, age: ${Date.now() - existingReplies.generatedAt}ms)`);

            return {
              success: true,
              smartReplies: existingReplies,
              processingTime: Date.now() - startTime,
              cacheHit: true
            };
          }
        }

        // Get recent messages
        const messages = await messageService.getRecentMessages(conversationId, 30);
        
        if (messages.length === 0) {
          // Generate greeting smart replies for empty conversation
          const greetingReplies = this.generateGreetingReplies(settings);
          const smartReplies = await this.saveSmartReplies(conversationId, userId, greetingReplies, {
            topics: [],
            sentiment: 'neutral',
            entities: [],
            language: 'en',
            tone: settings.tonePreference,
            messageCount: 0,
            analyzedAt: Date.now()
          });

          return {
            success: true,
            smartReplies,
            processingTime: Date.now() - startTime,
            cacheHit: false
          };
        }

        // Generate smart replies using RAG pipeline
        const pipelineResult = await this.generateSmartReplies(conversationId, userId, messages, settings, targetLanguage);

        if (pipelineResult.success) {
          // Save the smart replies to Firestore
          const smartRepliesId = `${conversationId}_${userId}`;
          const smartRepliesDoc = this.db.collection('smartReplies').doc(smartRepliesId);
          
          // Clean pipeline steps to remove undefined values
          const cleanPipelineSteps = pipelineResult.pipelineSteps.map(step => ({
            ...step,
            error: step.error || null,
            duration: step.duration || 0,
            success: step.success !== undefined ? step.success : true
          }));

          await smartRepliesDoc.set({
            id: smartRepliesId,
            conversationId,
            userId,
            replies: pipelineResult.smartReplies.replies,
            contextAnalysis: pipelineResult.smartReplies.contextAnalysis,
            generatedAt: admin.firestore.Timestamp.now(),
            generatedBy: forceRefresh ? 'manual_refresh' : 'auto_generation',
            pipelineSteps: cleanPipelineSteps
          });

          console.log(`[SmartRepliesService] Smart replies generated and saved successfully (user: ${userId})`);

          return {
            success: true,
            smartReplies: pipelineResult.smartReplies,
            processingTime: Date.now() - startTime,
            cacheHit: false
          };
        } else {
          throw new Error(pipelineResult.error || 'RAG pipeline failed');
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`[SmartRepliesService] Attempt ${attempt} failed:`, lastError);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[SmartRepliesService] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      processingTime: Date.now() - startTime,
      cacheHit: false,
      error: lastError?.message || 'Max retries exceeded'
    };
  }

          private async getExistingSmartReplies(conversationId: string, userId: string): Promise<SmartReplies | null> {
            const smartRepliesId = `${conversationId}_${userId}`;
            const doc = await this.db.collection('smartReplies').doc(smartRepliesId).get();
            
            if (!doc.exists) {
              return null;
            }
            
            return doc.data() as SmartReplies;
          }

  private isExpired(smartReplies: SmartReplies): boolean {
    const now = Date.now();
    const expiresAt = smartReplies.expiresAt || (smartReplies.generatedAt + this.config.cacheExpiration);
    return now > expiresAt;
  }

  private generateGreetingReplies(settings: ConversationSettings): string[] {
    const tone = settings.tonePreference === 'auto' ? 'casual' : settings.tonePreference;
    
    if (tone === 'formal') {
      return [
        "Good day! How may I assist you?",
        "Hello, I hope you're doing well.",
        "Greetings! What brings you here today?"
      ];
    } else if (tone === 'casual') {
      return [
        "Hey there! 👋",
        "What's up?",
        "How's it going?"
      ];
    } else {
      return [
        "Hello! 👋",
        "How are you doing?",
        "What's on your mind?"
      ];
    }
  }

          private async saveSmartReplies(
            conversationId: string,
            userId: string,
            replies: string[],
            contextAnalysis: any
          ): Promise<SmartReplies> {
            const smartRepliesId = `${conversationId}_${userId}`;
            const now = Date.now();
            
            const smartReplies: SmartReplies = {
              id: smartRepliesId,
              conversationId,
              userId,
              replies,
              contextAnalysis,
              generatedAt: now,
              expiresAt: now + this.config.cacheExpiration
            };

            await this.db.collection('smartReplies').doc(smartRepliesId).set(smartReplies);
            return smartReplies;
          }
}

// Export singleton instance
export const smartRepliesService = SmartRepliesService.getInstance();
