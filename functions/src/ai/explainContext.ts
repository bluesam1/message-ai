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
  messageLanguage?: string; // Language of the original message
  userLanguage?: string; // User's preferred language for the explanation
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
      const messageLanguage = request.data.messageLanguage || 'unknown';
      const userLanguage = request.data.userLanguage || 'en';

      console.log(`Context explanation request from ${userId}: ${text.length} chars (message: ${messageLanguage}, user: ${userLanguage})`);

      // Create language-aware OpenAI prompt
      const systemPrompt = `You are a cultural communication expert. Explain the cultural context, idioms, references, or nuances in the given text.

IMPORTANT INSTRUCTIONS:
- The original message is in ${messageLanguage} language
- Provide your explanation in ${userLanguage} language
- When referencing the original text, preserve the exact words/phrases in quotes
- Focus on cultural context specific to ${messageLanguage} culture
- Explain any cultural references, idioms, or implicit meanings
- If the text has no special cultural context, say so briefly

Keep your explanation concise (100-150 words). Be helpful and educational.`;

      const userPrompt = `Explain the cultural context of this ${messageLanguage} message: "${text}"`;

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

