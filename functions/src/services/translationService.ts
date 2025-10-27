import { getOpenAIClient, getOpenAIModel } from '../utils/openai';
import * as admin from 'firebase-admin';

// Pricing per 1M tokens (as of 2024)
// Source: https://openai.com/pricing
const MODEL_PRICING = {
  'gpt-4o-mini': {
    input: 0.15,  // $0.15 per 1M input tokens
    output: 0.60, // $0.60 per 1M output tokens
  },
  'gpt-4-turbo': {
    input: 10.0,  // $10.00 per 1M input tokens
    output: 30.0, // $30.00 per 1M output tokens
  },
  'gpt-4': {
    input: 30.0,  // $30.00 per 1M input tokens
    output: 60.0, // $60.00 per 1M output tokens
  },
  'gpt-3.5-turbo': {
    input: 0.50,  // $0.50 per 1M input tokens
    output: 1.50, // $1.50 per 1M output tokens
  },
};

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  cost: number;
  timestamp: number;
}

export class TranslationService {
  private static instance: TranslationService;
  private openaiClient: any;
  private model: string;

  private constructor() {
    // Initialize OpenAI client once
    this.openaiClient = getOpenAIClient();
    this.model = getOpenAIModel();
  }

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  /**
   * Calculate cost for token usage
   */
  private calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];

    if (!pricing) {
      console.warn(`Unknown model for pricing: ${model}, using gpt-4o-mini`);
      const defaultPricing = MODEL_PRICING['gpt-4o-mini'];
      return (
        (inputTokens / 1_000_000) * defaultPricing.input +
        (outputTokens / 1_000_000) * defaultPricing.output
      );
    }

    return (
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output
    );
  }

  /**
   * Log token usage to Firestore for monitoring
   */
  private async logTokenUsage(
    userId: string,
    featureType: 'translate' | 'explain' | 'define' | 'detect_language' | 'auto_detect_language' | 'auto_translate' | 'rephrase' | 'smart_replies',
    model: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const cost = this.calculateCost(model, inputTokens, outputTokens);
    const totalTokens = inputTokens + outputTokens;

    const usage: TokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens,
      model,
      cost,
      timestamp: Date.now(),
    };

    // Log to console for Cloud Functions logs
    console.log(`AI Usage - ${featureType}: user=${userId}, model=${model}, tokens=${totalTokens}, cost=$${cost.toFixed(6)}`);

    // Store in Firestore for analytics
    try {
      await admin
        .firestore()
        .collection('aiUsage')
        .add({
          userId,
          featureType,
          ...usage,
        });
    } catch (error) {
      console.error('Failed to log token usage:', error);
      // Don't throw - logging failure shouldn't break the feature
    }
  }

  /**
   * Translate text from source language to target language
   */
  async translate(
    text: string,
    targetLang: string,
    sourceLang?: string,
    userId?: string
  ): Promise<string> {
    try {
      const systemPrompt = sourceLang 
        ? `You are a professional translator. Translate the given text from ${sourceLang} to ${targetLang}. Preserve the tone, style, and any emojis. Respond ONLY with the translation, no explanations.`
        : `You are a professional translator. Translate the given text to ${targetLang}. Preserve the tone, style, and any emojis. Respond ONLY with the translation, no explanations.`;

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000, // Allow longer translations
      });

      const translatedText = response.choices[0]?.message?.content?.trim() || text;
      const tokensUsed = response.usage?.total_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;

      // Log token usage for cost tracking
      if (userId) {
        await this.logTokenUsage(
          userId,
          'auto_translate',
          this.model,
          tokensUsed,
          outputTokens
        );
      }

      console.log(`[TranslationService] Translated to ${targetLang} (${tokensUsed} tokens, ${outputTokens} output)`);
      return translatedText;

    } catch (error) {
      console.error('[TranslationService] Error translating text:', error);
      return text; // Return original text on error
    }
  }

  /**
   * Batch translate multiple texts to the same target language
   */
  async batchTranslate(
    texts: string[],
    targetLang: string,
    sourceLang?: string,
    userId?: string
  ): Promise<string[]> {
    // Process translations in parallel for better performance
    const promises = texts.map(text => this.translate(text, targetLang, sourceLang, userId));
    
    try {
      const translations = await Promise.all(promises);
      return translations;
    } catch (error) {
      console.error('[TranslationService] Error in batch translation:', error);
      // Return original texts for failed translations
      return texts;
    }
  }

  /**
   * Translate text with caching support (for future optimization)
   */
  async translateWithCache(
    text: string,
    targetLang: string,
    sourceLang?: string,
    userId?: string,
    cacheKey?: string
  ): Promise<string> {
    // TODO: Implement caching logic here
    // For now, just call the regular translate function
    return this.translate(text, targetLang, sourceLang, userId);
  }

  /**
   * Get token usage stats for a user
   */
  async getUserUsageStats(
    userId: string,
    daysBack: number = 30
  ): Promise<{ totalTokens: number; totalCost: number; requestCount: number }> {
    const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    const snapshot = await admin
      .firestore()
      .collection('aiUsage')
      .where('userId', '==', userId)
      .where('timestamp', '>=', cutoffTime)
      .get();

    let totalTokens = 0;
    let totalCost = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      totalTokens += data.totalTokens || 0;
      totalCost += data.cost || 0;
    });

    return {
      totalTokens,
      totalCost,
      requestCount: snapshot.size,
    };
  }

  /**
   * Check if user has exceeded cost threshold
   */
  async isOverCostThreshold(
    userId: string,
    thresholdUSD: number = 1.0
  ): Promise<boolean> {
    const stats = await this.getUserUsageStats(userId, 30);
    return stats.totalCost > thresholdUSD;
  }
}

// Export singleton instance
export const translationService = TranslationService.getInstance();
