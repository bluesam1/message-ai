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

/**
 * Calculate cost for token usage
 * @param model - Model name
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
export function calculateCost(
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
 * @param userId - User ID
 * @param featureType - Type of AI feature (translate, explain, define, detect_language, auto_detect_language, auto_translate)
 * @param model - Model used
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 */
export async function logTokenUsage(
  userId: string,
  featureType: 'translate' | 'explain' | 'define' | 'detect_language' | 'auto_detect_language' | 'auto_translate' | 'rephrase' | 'smart_replies',
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const cost = calculateCost(model, inputTokens, outputTokens);
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
 * Get token usage stats for a user
 * @param userId - User ID
 * @param daysBack - Number of days to look back (default: 30)
 * @returns Total tokens used and cost
 */
export async function getUserUsageStats(
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
 * Format cost for display
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.001234")
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

/**
 * Check if user has exceeded cost threshold
 * @param userId - User ID
 * @param thresholdUSD - Cost threshold in USD (default: $1.00)
 * @returns true if threshold exceeded
 */
export async function isOverCostThreshold(
  userId: string,
  thresholdUSD: number = 1.0
): Promise<boolean> {
  const stats = await getUserUsageStats(userId, 30);
  return stats.totalCost > thresholdUSD;
}

