import { getOpenAIClient, getOpenAIModel } from './openai';
import { logTokenUsage } from './costMonitoring';

/**
 * Translate text from source language to target language
 * @param text - Text to translate
 * @param targetLang - Target language code (ISO 639-1)
 * @param sourceLang - Optional source language code (if known)
 * @param userId - Optional user ID for cost tracking
 * @returns Translated text
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string,
  userId?: string
): Promise<string> {
  try {
    const client = getOpenAIClient();
    const model = getOpenAIModel();

    const systemPrompt = sourceLang 
      ? `You are a professional translator. Translate the given text from ${sourceLang} to ${targetLang}. Preserve the tone, style, and any emojis. Respond ONLY with the translation, no explanations.`
      : `You are a professional translator. Translate the given text to ${targetLang}. Preserve the tone, style, and any emojis. Respond ONLY with the translation, no explanations.`;

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
      temperature: 0.3,
      max_tokens: 1000, // Allow longer translations
    });

    const translatedText = response.choices[0]?.message?.content?.trim() || text;
    const tokensUsed = response.usage?.total_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    // Log token usage for cost tracking
    if (userId) {
      await logTokenUsage(
        userId,
        'auto_translate',
        model,
        tokensUsed,
        outputTokens
      );
    }

    console.log(`[Translation] Translated to ${targetLang} (${tokensUsed} tokens, ${outputTokens} output)`);
    return translatedText;

  } catch (error) {
    console.error('[Translation] Error translating text:', error);
    return text; // Return original text on error
  }
}

/**
 * Batch translate multiple texts to the same target language
 * @param texts - Array of texts to translate
 * @param targetLang - Target language code (ISO 639-1)
 * @param sourceLang - Optional source language code (if known)
 * @param userId - Optional user ID for cost tracking
 * @returns Array of translated texts
 */
export async function batchTranslateTexts(
  texts: string[],
  targetLang: string,
  sourceLang?: string,
  userId?: string
): Promise<string[]> {
  // Process translations in parallel for better performance
  const promises = texts.map(text => translateText(text, targetLang, sourceLang, userId));
  
  try {
    const translations = await Promise.all(promises);
    return translations;
  } catch (error) {
    console.error('[Translation] Error in batch translation:', error);
    // Return original texts for failed translations
    return texts;
  }
}

/**
 * Translate text with caching support (for future optimization)
 * @param text - Text to translate
 * @param targetLang - Target language code (ISO 639-1)
 * @param sourceLang - Optional source language code (if known)
 * @param userId - Optional user ID for cost tracking
 * @param cacheKey - Optional cache key for avoiding duplicate translations
 * @returns Translated text
 */
export async function translateTextWithCache(
  text: string,
  targetLang: string,
  sourceLang?: string,
  userId?: string,
  cacheKey?: string
): Promise<string> {
  // TODO: Implement caching logic here
  // For now, just call the regular translate function
  return translateText(text, targetLang, sourceLang, userId);
}
