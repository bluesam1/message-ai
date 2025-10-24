import { https } from 'firebase-functions/v2';
import { detectLanguage } from '../utils/languageDetection';
import { translateText } from '../utils/translation';
import { checkRateLimit } from '../utils/rateLimiter';
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
  detectedLanguage: string;
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

      try {
        // First, detect the language
        const detectedLanguage = await detectLanguage(text, userId);
        console.log(`Detected language: ${detectedLanguage}`);

        // Then translate
        const translatedText = await translateText(text, targetLanguage, detectedLanguage, userId);

        const response: TranslateMessageResponse = {
          translatedText: translatedText.trim(),
          detectedLanguage: /^[a-z]{2}$/.test(detectedLanguage) ? detectedLanguage : 'unknown',
          tokensUsed: 0, // Token usage is logged in utility functions
        };

        console.log(`Translation completed successfully`);

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

