import { https } from 'firebase-functions/v2';
import { detectLanguage as detectLanguageUtil } from '../utils/languageDetection';
import { checkRateLimit } from '../utils/rateLimiter';
import {
  validateAuth,
  validateTextInput,
  handleOpenAIError,
  withErrorHandling,
} from '../utils/errorHandling';

interface DetectLanguageRequest {
  text: string;
  messageId?: string;
}

interface DetectLanguageResponse {
  detectedLanguage: string;
  tokensUsed: number;
}

/**
 * Cloud Function to detect the language of message text using OpenAI
 * Returns ISO 639-1 language code (e.g., "en", "es", "fr")
 */
export const detectLanguage = https.onCall(
  async (request: https.CallableRequest<DetectLanguageRequest>) => {
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

      console.log(`Language detection request from ${userId}: ${text.length} chars`);

      // Handle edge cases
      // Emoji-only or very short messages
      if (text.length < 3) {
        console.log('Text too short for reliable detection, returning "unknown"');
        return {
          detectedLanguage: 'unknown',
          tokensUsed: 0,
        } as DetectLanguageResponse;
      }

      // Check if text is only emojis/symbols
      const textWithoutEmojis = text.replace(/[\p{Emoji}\p{Symbol}\s]/gu, '');
      if (textWithoutEmojis.length === 0) {
        console.log('Text contains only emojis/symbols, returning "unknown"');
        return {
          detectedLanguage: 'unknown',
          tokensUsed: 0,
        } as DetectLanguageResponse;
      }

      // Create OpenAI prompt
      // Language detection is now handled by utility function

      try {
        // Call utility function
        const detectedLanguage = detectLanguageUtil(text, userId);

        const response: DetectLanguageResponse = {
          detectedLanguage: detectedLanguage,
          tokensUsed: 0, // Token usage is logged in utility function
        };

        console.log(`Language detected: ${detectedLanguage}`);

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

