import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * Language detection response from Cloud Function
 */
interface DetectLanguageResponse {
  detectedLanguage: string;
  tokensUsed: number;
}

/**
 * Detect the language of a message using OpenAI
 * Checks cache first, then calls Cloud Function if needed
 * 
 * @param text - Message text to detect language for
 * @param messageId - Optional message ID for caching
 * @returns ISO 639-1 language code (e.g., "en", "es", "fr") or "unknown"
 */
export async function detectLanguage(
  text: string,
  messageId?: string
): Promise<string> {
  try {
    // If messageId provided, check if language already detected and cached
    if (messageId) {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const data = messageDoc.data();
        if (data.aiMeta?.detectedLang) {
          console.log(`[Language Service] Using cached language: ${data.aiMeta.detectedLang}`);
          return data.aiMeta.detectedLang;
        }
      }
    }

    // Call Cloud Function to detect language
    console.log(`[Language Service] Detecting language for text: ${text.substring(0, 50)}...`);
    
    const functions = getFunctions();
    const detectLanguageFn = httpsCallable<{ text: string; messageId?: string }, DetectLanguageResponse>(
      functions,
      'detectLanguage'
    );

    const result = await detectLanguageFn({ text, messageId });
    const { detectedLanguage, tokensUsed } = result.data;

    console.log(`[Language Service] Detected language: ${detectedLanguage} (${tokensUsed} tokens)`);

    // Cache the result in Firestore if messageId provided
    if (messageId && detectedLanguage !== 'unknown') {
      try {
        const messageRef = doc(db, 'messages', messageId);
        await updateDoc(messageRef, {
          'aiMeta.detectedLang': detectedLanguage,
        });
        console.log(`[Language Service] Cached language detection result`);
      } catch (error) {
        console.error('[Language Service] Error caching language detection:', error);
        // Don't throw - detection still succeeded
      }
    }

    return detectedLanguage;
  } catch (error: any) {
    console.error('[Language Service] Error detecting language:', error);
    
    // Return 'unknown' as fallback
    return 'unknown';
  }
}

/**
 * Get the display name for a language code
 * 
 * @param code - ISO 639-1 language code
 * @returns Human-readable language name
 */
export function getLanguageName(code: string): string {
  const languageNames: { [key: string]: string } = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'ru': 'Russian',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'pl': 'Polish',
    'tr': 'Turkish',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'id': 'Indonesian',
    'unknown': 'Unknown',
  };

  return languageNames[code.toLowerCase()] || code.toUpperCase();
}

/**
 * List of common languages for language selector
 */
export const COMMON_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'hi', name: 'Hindi' },
];

