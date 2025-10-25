import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Message } from '../../types/message';

interface DefineSlangRequest {
  text: string;
  messageId?: string;
  userLanguage?: string; // User's preferred language for the definition
}

interface DefineSlangResponse {
  definition: string;
  tokensUsed: number;
}

/**
 * Get definition for slang/idiom in a message
 * Checks cache first, then calls Cloud Function if needed
 * @param message - Message to define
 * @param userLanguage - User's preferred language for the definition
 * @returns Slang/idiom definition
 */
export async function defineMessageSlang(message: Message, userLanguage?: string): Promise<string> {
  try {
    // Check if definition is already cached
    const cachedDefinition = message.aiMeta?.slangDefinition;
    if (cachedDefinition) {
      console.log('Definition found in cache');
      return cachedDefinition;
    }

    // Call Cloud Function
    console.log(`Getting slang definition for message ${message.id}...`);
    const functions = getFunctions();
    const defineFn = httpsCallable<DefineSlangRequest, DefineSlangResponse>(
      functions,
      'defineSlang'
    );

    const result = await defineFn({
      text: message.text,
      messageId: message.id,
      userLanguage: userLanguage,
    });

    const definition = result.data.definition;

    // Cache the definition in Firestore
    await cacheDefinition(message.id, definition);

    console.log(`Slang definition completed: ${result.data.tokensUsed} tokens`);
    return definition;
  } catch (error: any) {
    console.error('Slang definition error:', error);
    throw new Error(
      error.message || 'Failed to get definition. Please try again.'
    );
  }
}

/**
 * Cache a definition in Firestore
 * @param messageId - Message ID
 * @param definition - Slang/idiom definition
 */
async function cacheDefinition(
  messageId: string,
  definition: string
): Promise<void> {
  try {
    const messageRef = doc(db, 'messages', messageId);

    await updateDoc(messageRef, {
      'aiMeta.slangDefinition': definition,
    });

    console.log(`Cached definition for message ${messageId}`);
  } catch (error) {
    console.error('Failed to cache definition:', error);
    // Don't throw - caching failure shouldn't break the feature
  }
}

/**
 * Get cached definition for a message
 * @param message - Message to get definition for
 * @returns Cached definition or null if not found
 */
export function getCachedDefinition(message: Message): string | null {
  return message.aiMeta?.slangDefinition || null;
}

/**
 * Check if a message has a cached definition
 * @param message - Message to check
 * @returns true if definition is cached
 */
export function hasDefinition(message: Message): boolean {
  return !!message.aiMeta?.slangDefinition;
}

