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

interface DefineSlangRequest {
  text: string;
  messageId?: string;
  userLanguage?: string; // User's preferred language for the definition
}

interface DefineSlangResponse {
  definition: string;
  tokensUsed: number;
}

/**
 * Cloud Function to define slang, idioms, or unfamiliar phrases using OpenAI
 */
export const defineSlang = https.onCall(
  async (request: https.CallableRequest<DefineSlangRequest>) => {
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
      const text = validateTextInput(request.data.text, 'text', 1, 500);
      const userLanguage = request.data.userLanguage || 'en';

      console.log(`Slang definition request from ${userId}: ${text.length} chars (user language: ${userLanguage})`);

      // Create language-aware OpenAI prompt
      const systemPrompt = `You are a helpful language assistant. Define slang terms, idioms, or colloquial phrases in simple, clear language.

IMPORTANT INSTRUCTIONS:
- Provide your definition in ${userLanguage} language
- When referencing the original text, preserve the exact words/phrases in quotes
- Focus on explaining the meaning and usage context
- If the phrase has cultural or regional variations, mention them

Provide:
- A concise definition (1-2 sentences)
- The context where it's commonly used
- Example usage if helpful

If you cannot confidently explain the phrase, respond with: "Unable to explain this phrase."
Keep your response under 100 words.`;

      const userPrompt = `Define this slang or idiom in ${userLanguage}: "${text}"`;

      try {
        // Call OpenAI
        const { text: definition, tokensUsed } = await createCompletion(
          systemPrompt,
          userPrompt
        );

        // Log token usage
        await logTokenUsage(
          userId,
          'define',
          process.env.OPENAI_MODEL || 'gpt-4o-mini',
          Math.floor(tokensUsed * 0.4), // Approximate input tokens (40%)
          Math.floor(tokensUsed * 0.6)  // Approximate output tokens (60%)
        );

        const response: DefineSlangResponse = {
          definition: definition.trim(),
          tokensUsed,
        };

        console.log(`Slang definition completed: ${tokensUsed} tokens`);

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

