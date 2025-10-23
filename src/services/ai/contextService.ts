import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Message } from '../../types/message';

interface ExplainContextRequest {
  text: string;
  messageId?: string;
}

interface ExplainContextResponse {
  explanation: string;
  tokensUsed: number;
}

/**
 * Get cultural context explanation for a message
 * Checks cache first, then calls Cloud Function if needed
 * @param message - Message to explain
 * @returns Cultural context explanation
 */
export async function explainMessageContext(message: Message): Promise<string> {
  try {
    // Check if explanation is already cached
    const cachedExplanation = message.aiMeta?.explanation;
    if (cachedExplanation) {
      console.log('Explanation found in cache');
      return cachedExplanation;
    }

    // Call Cloud Function
    console.log(`Getting context explanation for message ${message.id}...`);
    const functions = getFunctions();
    const explainFn = httpsCallable<ExplainContextRequest, ExplainContextResponse>(
      functions,
      'explainContext'
    );

    const result = await explainFn({
      text: message.text,
      messageId: message.id,
    });

    const explanation = result.data.explanation;

    // Cache the explanation in Firestore
    await cacheExplanation(message.id, explanation);

    console.log(`Context explanation completed: ${result.data.tokensUsed} tokens`);
    return explanation;
  } catch (error: any) {
    console.error('Context explanation error:', error);
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

