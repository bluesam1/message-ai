import { https } from 'firebase-functions/v2';
import { createCompletion } from '../utils/openai';
import { checkRateLimit } from '../utils/rateLimiter';
import { logTokenUsage } from '../utils/costMonitoring';
import {
  validateAuth,
  validateTextInput,
  validateLanguageCode,
  handleOpenAIError,
  withErrorHandling,
} from '../utils/errorHandling';

interface TranslateMessageRequest {
  text: string;
  targetLanguage: string;
  messageId?: string;
}

interface TranslateMessageResponse {
  translatedText: string;
  detectedLanguage?: string;
  tokensUsed: number;
}

/**
 * Cloud Function to translate message text using OpenAI
 */
export const translateMessage = https.onCall(
  async (request: https.CallableRequest<TranslateMessageRequest>) => {
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
      const targetLanguage = validateLanguageCode(
        request.data.targetLanguage,
        'targetLanguage'
      );

      console.log(`Translation request from ${userId}: ${text.length} chars to ${targetLanguage}`);

      // Create OpenAI prompt
      const systemPrompt = `You are a professional translator. Translate the given text to ${targetLanguage}. 
Preserve the tone, style, and meaning of the original message. 
If the text is already in ${targetLanguage}, return it unchanged.
Only return the translated text, nothing else.`;

      const userPrompt = text;

      try {
        // Call OpenAI
        const { text: translatedText, tokensUsed } = await createCompletion(
          systemPrompt,
          userPrompt
        );

        // Log token usage
        await logTokenUsage(
          userId,
          'translate',
          process.env.OPENAI_MODEL || 'gpt-4o-mini',
          Math.floor(tokensUsed * 0.4), // Approximate input tokens (40%)
          Math.floor(tokensUsed * 0.6)  // Approximate output tokens (60%)
        );

        const response: TranslateMessageResponse = {
          translatedText: translatedText.trim(),
          tokensUsed,
        };

        console.log(`Translation completed: ${tokensUsed} tokens`);

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

