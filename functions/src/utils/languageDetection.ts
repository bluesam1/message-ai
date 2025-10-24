import { getOpenAIClient, getOpenAIModel } from './openai';
import { logTokenUsage } from './costMonitoring';

/**
 * Detect the language of a text using OpenAI
 * @param text - Text to detect language for
 * @param userId - Optional user ID for cost tracking
 * @returns ISO 639-1 language code (e.g., 'en', 'es', 'zh')
 */
export async function detectLanguage(
  text: string,
  userId?: string
): Promise<string> {
  try {
    const client = getOpenAIClient();
    const model = getOpenAIModel();

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a language detection system. Analyze the given text and determine its language.

Return ONLY the ISO 639-1 language code (2 letters) for the detected language.
Common codes: en (English), es (Spanish), fr (French), de (German), it (Italian), 
pt (Portuguese), ja (Japanese), ko (Korean), zh (Chinese), ar (Arabic), 
ru (Russian), hi (Hindi).

If you cannot detect the language, return "unknown".`,
        },
        {
          role: 'user',
          content: `Detect the language of this text:\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    const detectedLang = response.choices[0]?.message?.content?.trim().toLowerCase() || 'unknown';
    const tokensUsed = response.usage?.total_tokens || 0;

    // Log token usage for cost tracking
    if (userId) {
      await logTokenUsage(
        userId,
        'detect_language',
        model,
        tokensUsed,
        0 // No output tokens for detection
      );
    }

    console.log(`[LanguageDetection] Detected language: ${detectedLang} (${tokensUsed} tokens)`);
    return detectedLang;

  } catch (error) {
    console.error('[LanguageDetection] Error detecting language:', error);
    return 'unknown';
  }
}

/**
 * Batch detect languages for multiple texts
 * @param texts - Array of texts to detect languages for
 * @param userId - Optional user ID for cost tracking
 * @returns Array of detected language codes
 */
export async function batchDetectLanguages(
  texts: string[],
  userId?: string
): Promise<string[]> {
  // Process texts in parallel for better performance
  const promises = texts.map(text => detectLanguage(text, userId));
  
  try {
    const detectedLangs = await Promise.all(promises);
    return detectedLangs;
  } catch (error) {
    console.error('[LanguageDetection] Error in batch detection:', error);
    // Return 'unknown' for all failed detections
    return texts.map(() => 'unknown');
  }
}
