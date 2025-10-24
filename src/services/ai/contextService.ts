import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Message } from '../../types/message';

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
 * Get cultural context explanation for a message
 * Checks cache first, then calls Cloud Function if needed
 * @param message - Message to explain
 * @param userLanguage - User's preferred language for the explanation
 * @returns Cultural context explanation
 */
export async function explainMessageContext(message: Message, userLanguage?: string, forceRefresh: boolean = false): Promise<string> {
  try {
    console.log('[ContextService] Starting explanation for message:', message.id);
    console.log('[ContextService] Message text:', message.text);
    console.log('[ContextService] User language:', userLanguage);
    console.log('[ContextService] Force refresh:', forceRefresh);
    
    // Check if explanation is already cached (unless force refresh)
    const cachedExplanation = message.aiMeta?.explanation;
    if (cachedExplanation && !forceRefresh) {
      console.log('[ContextService] Explanation found in cache');
      return cachedExplanation;
    }

    // Call Cloud Function
    console.log(`[ContextService] Getting context explanation for message ${message.id}...`);
    const functions = getFunctions();
    const explainFn = httpsCallable<ExplainContextRequest, ExplainContextResponse>(
      functions,
      'explainContext'
    );

    // Get message language from aiMeta or default to 'unknown'
    const messageLanguage = message.aiMeta?.detectedLang || 'unknown';
    console.log('[ContextService] Message language:', messageLanguage);
    
    const requestData = {
      text: message.text,
      messageId: message.id,
      messageLanguage,
      userLanguage: userLanguage || 'en',
    };
    console.log('[ContextService] Request data:', requestData);
    
    const result = await explainFn(requestData);
    console.log('[ContextService] Cloud Function response:', result.data);

    const explanation = result.data.explanation;

    // Cache the explanation in Firestore
    await cacheExplanation(message.id, explanation);

    console.log(`[ContextService] Context explanation completed: ${result.data.tokensUsed} tokens`);
    return explanation;
  } catch (error: any) {
    console.error('[ContextService] Context explanation error:', error);
    throw new Error(
      error.message || 'Failed to get context explanation. Please try again.'
    );
  }
}

/**
 * Cache an explanation in Firestore
 * @param messageId - Message ID
 * @param explanation - Context explanation
 */
async function cacheExplanation(
  messageId: string,
  explanation: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'messages', messageId);

    await updateDoc(messageRef, {
      'aiMeta.explanation': explanation,
    });

    console.log(`Cached explanation for message ${messageId}`);
  } catch (error) {
    console.error('Failed to cache explanation:', error);
    // Don't throw - caching failure shouldn't break the feature
  }
}

/**
 * Get cached explanation for a message
 * @param message - Message to get explanation for
 * @returns Cached explanation or null if not found
 */
export function getCachedExplanation(message: Message): string | null {
  return message.aiMeta?.explanation || null;
}

/**
 * Check if a message has a cached explanation
 * @param message - Message to check
 * @returns true if explanation is cached
 */
export function hasExplanation(message: Message): boolean {
  return !!message.aiMeta?.explanation;
}

