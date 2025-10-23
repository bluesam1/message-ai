import { https } from 'firebase-functions/v2';
import { createCompletion } from '../utils/openai';
import { checkRateLimit } from '../utils/rateLimiter';
import { logTokenUsage } from '../utils/costMonitoring';
import {
  validateAuth,
  validateTextInput,
  handleOpenAIError,
  withErrorHandling,
} from '../utils/errorHandling';

interface ExplainContextRequest {
  text: string;
  messageId?: string;
}

interface ExplainContextResponse {
  explanation: string;
  tokensUsed: number;
}

/**
 * Cloud Function to explain cultural context of a message using OpenAI
 */
export const explainContext = https.onCall(
  async (request: https.CallableRequest<ExplainContextRequest>) => {
    return withErrorHandling(async () => {
      // Validate authentication
      const userId = validateAuth(request);

      // Check rate limit
      try {
        checkRateLimit(userId);
      } catch (error: any) {
        throw new https.HttpsError('resource-exhausted', error.message);
      }

      // Validate input
      const text = validateTextInput(request.data.text, 'text', 1, 2000);

      console.log(`Context explanation request from ${userId}: ${text.length} chars`);

      // Create OpenAI prompt
      const systemPrompt = `You are a cultural communication expert. Explain the cultural context, idioms, references, or nuances in the given text.
Focus on:
- Cultural references or idioms
- Implicit meanings or subtext
- Social or regional context
- Any phrases that might be misunderstood across cultures

Keep your explanation concise (100-150 words). If the text has no special cultural context, say so briefly.
Be helpful and educational.`;

      const userPrompt = `Explain the cultural context of this message: "${text}"`;

      try {
        // Call OpenAI
        const { text: explanation, tokensUsed } = await createCompletion(
          systemPrompt,
          userPrompt
        );

        // Log token usage
        await logTokenUsage(
          userId,
          'explain',
          process.env.OPENAI_MODEL || 'gpt-4o-mini',
          Math.floor(tokensUsed * 0.5), // Approximate input tokens (50%)
          Math.floor(tokensUsed * 0.5)  // Approximate output tokens (50%)
        );

        const response: ExplainContextResponse = {
          explanation: explanation.trim(),
          tokensUsed,
        };

        console.log(`Context explanation completed: ${tokensUsed} tokens`);

        return response;
      } catch (error: any) {
        const errorResponse = handleOpenAIError(error);
        throw new https.HttpsError(
          'internal',
          errorResponse.error,
          errorResponse.details
        );
      }
    });
  }
);

