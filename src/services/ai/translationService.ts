import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Message } from '../../types/message';

interface TranslateRequest {
  text: string;
  targetLanguage: string;
  messageId?: string;
}

interface TranslateResponse {
  translatedText: string;
  detectedLanguage?: string;
  tokensUsed: number;
}

/**
 * Translate a message to a target language
 * Checks cache first, then calls Cloud Function if needed
 * @param message - Message to translate
 * @param targetLanguage - Target language code (e.g., 'en', 'es', 'fr')
 * @returns Translated text
 */
export async function translateMessage(
  message: Message,
  targetLanguage: string
): Promise<string> {
  try {
    // Check if translation is already cached
    const cachedTranslation = message.aiMeta?.translatedText?.[targetLanguage];
    if (cachedTranslation) {
      console.log('Translation found in cache');
      return cachedTranslation;
    }

    // Call Cloud Function
    console.log(`Translating message ${message.id} to ${targetLanguage}...`);
    const functions = getFunctions();
    const translateFn = httpsCallable<TranslateRequest, TranslateResponse>(
      functions,
      'translateMessage'
    );

    const result = await translateFn({
      text: message.text,
      targetLanguage,
      messageId: message.id,
    });

    const translatedText = result.data.translatedText;

    // Cache the translation in Firestore
    await cacheTranslation(message.id, targetLanguage, translatedText);

    console.log(`Translation completed: ${result.data.tokensUsed} tokens`);
    return translatedText;
  } catch (error: any) {
    console.error('Translation error:', error);
    throw new Error(
      error.message || 'Failed to translate message. Please try again.'
    );
  }
}

/**
 * Cache a translation in Firestore
 * @param messageId - Message ID
 * @param language - Language code
 * @param translation - Translated text
 */
async function cacheTranslation(
  messageId: string,
  language: string,
  translation: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'messages', messageId);
    
    // Get current aiMeta to avoid overwriting other fields
    const messageDoc = await getDoc(messageRef);
    const currentAiMeta = messageDoc.data()?.aiMeta || {};
    const currentTranslations = currentAiMeta.translatedText || {};

    await updateDoc(messageRef, {
      [`aiMeta.translatedText.${language}`]: translation,
    });

    console.log(`Cached translation for message ${messageId} (${language})`);
  } catch (error) {
    console.error('Failed to cache translation:', error);
    // Don't throw - caching failure shouldn't break the feature
  }
}

/**
 * Get cached translation for a message
 * @param message - Message to get translation for
 * @param language - Target language code
 * @returns Cached translation or null if not found
 */
export function getCachedTranslation(
  message: Message,
  language: string
): string | null {
  return message.aiMeta?.translatedText?.[language] || null;
}

/**
 * Check if a message has a cached translation
 * @param message - Message to check
 * @param language - Target language code
 * @returns true if translation is cached
 */
export function hasTranslation(message: Message, language: string): boolean {
  return !!message.aiMeta?.translatedText?.[language];
}

/**
 * Get all available translations for a message
 * @param message - Message to get translations for
 * @returns Array of language codes with available translations
 */
export function getAvailableTranslations(message: Message): string[] {
  return Object.keys(message.aiMeta?.translatedText || {});
}

/**
 * Translate text to a target language
 * @param text - Text to translate
 * @param targetLanguage - Target language code
 * @param sourceLanguage - Optional source language code
 * @returns Translated text
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  try {
    // Call Cloud Function
    console.log(`Translating text to ${targetLanguage}...`);
    const functions = getFunctions();
    const translateFn = httpsCallable<TranslateRequest, TranslateResponse>(
      functions,
      'translateMessage'
    );

    const result = await translateFn({
      text,
      targetLanguage,
    });

    console.log(`Translation completed: ${result.data.tokensUsed} tokens`);
    return result.data.translatedText;
  } catch (error: any) {
    console.error('Translation error:', error);
    throw new Error(
      error.message || 'Failed to translate text. Please try again.'
    );
  }
}

