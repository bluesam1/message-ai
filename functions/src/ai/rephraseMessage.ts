import { https } from 'firebase-functions/v2';
import { checkRateLimit } from '../utils/rateLimiter';
import {
  validateAuth,
  validateTextInput,
  handleOpenAIError,
  withErrorHandling,
} from '../utils/errorHandling';
import { getOpenAIClient, getOpenAIModel } from '../utils/openai';
import { logTokenUsage } from '../utils/costMonitoring';

interface RephraseMessageRequest {
  text: string;
  tone: 'formal' | 'casual';
  conversationId?: string;
}

interface RephraseMessageResponse {
  rephrasedText: string;
  originalText: string;
  tone: string;
  tokensUsed: number;
}

/**
 * Cloud Function to rephrase message text using OpenAI for formality adjustment
 */
export const rephraseMessage = https.onCall(
  async (request: https.CallableRequest<RephraseMessageRequest>) => {
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
      const tone = request.data.tone;

      if (!tone || !['formal', 'casual'].includes(tone)) {
        throw new https.HttpsError(
          'invalid-argument',
          'Tone must be either "formal" or "casual"'
        );
      }

      console.log(`Rephrase request from ${userId}: ${text.length} chars to ${tone} tone`);

      try {
        const client = getOpenAIClient();
        const model = getOpenAIModel();

        const systemPrompt = `You are a professional writing assistant. Rephrase the given text to make it more ${tone}.

IMPORTANT INSTRUCTIONS:
- Preserve the original meaning and intent
- Maintain the same language as the original text
- Keep the same length approximately (10-30 words)
- Preserve any emojis or special characters
- Make it sound natural and appropriate for ${tone} communication
- Respond ONLY with the rephrased text, no explanations

${tone === 'formal' ? 
  'Make it more professional, polite, and grammatically correct.' : 
  'Make it more relaxed, friendly, and conversational.'}`;

        const response = await client.chat.completions.create({
          model,
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
          temperature: 0.7, // Slightly higher for more creative rephrasing
          max_tokens: 200, // Limit output length
        });

        const rephrasedText = response.choices[0]?.message?.content?.trim() || text;
        const tokensUsed = response.usage?.total_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;

        // Log token usage for cost tracking
        await logTokenUsage(
          userId,
          'rephrase',
          model,
          tokensUsed,
          outputTokens
        );

        const responseData: RephraseMessageResponse = {
          rephrasedText: rephrasedText,
          originalText: text,
          tone: tone,
          tokensUsed: tokensUsed,
        };

        console.log(`Rephrase completed successfully: ${tokensUsed} tokens used`);

        return responseData;
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
