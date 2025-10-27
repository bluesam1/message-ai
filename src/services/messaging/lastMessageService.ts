/**
 * Last Message Service
 * Handles fetching and translating the latest message for each conversation
 * Replaces the static lastMessage field with real-time fetching
 */

import { db } from '../../config/firebase';
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
import { getUserLanguage } from '../user/userPreferencesService';

export interface LastMessagePreview {
  conversationId: string;
  text: string;
  timestamp: number;
  senderId: string;
  senderName: string;
  isTranslated: boolean;
  originalText?: string;
}

/**
 * Safely convert Firestore Timestamp to milliseconds
 * Handles cases where value might already be a number or undefined
 */
function toMillis(value: any): number {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return Date.now();
}

/**
 * Get the latest message for a conversation with translation if needed
 * @param conversationId - Conversation ID
 * @param userId - Current user ID
 * @param userLanguage - User's preferred language (optional, will fetch if not provided)
 * @returns Last message preview with translation
 */
export async function getLastMessagePreview(
  conversationId: string,
  userId: string,
  userLanguage?: string
): Promise<LastMessagePreview | null> {
  try {
    console.log(`[LastMessageService] 🔍 Fetching last message for conversation ${conversationId}`);
    
    // Get user's preferred language if not provided
    const targetLang = userLanguage || await getUserLanguage(userId);
    
    // Query the latest message for this conversation
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`[LastMessageService] ❌ No messages found for conversation ${conversationId}`);
      return null;
    }
    
    const messageDoc = querySnapshot.docs[0];
    const messageData = messageDoc.data();
    
    const originalText = messageData.text;
    const timestamp = toMillis(messageData.timestamp);
    const senderId = messageData.senderId;
    const senderName = messageData.senderName || 'Unknown';
    
    console.log(`[LastMessageService] 📨 Found last message:`, {
      conversationId,
      originalText,
      senderId,
      senderName,
      timestamp: new Date(timestamp).toISOString()
    });
    
    // Check if we need translation
    const aiMeta = messageData.aiMeta;
    const detectedLang = aiMeta?.detectedLang;
    const existingTranslations = aiMeta?.translatedText || {};
    
    // If message is already in user's language, no translation needed
    if (detectedLang === targetLang) {
      console.log(`[LastMessageService] ✅ Message already in user's language (${targetLang})`);
      return {
        conversationId,
        text: originalText,
        timestamp,
        senderId,
        senderName,
        isTranslated: false
      };
    }
    
    // Check if translation already exists
    if (existingTranslations[targetLang]) {
      console.log(`[LastMessageService] ✅ Using existing translation for ${targetLang}`);
      return {
        conversationId,
        text: existingTranslations[targetLang],
        timestamp,
        senderId,
        senderName,
        isTranslated: true,
        originalText
      };
    }
    
    // Check if auto-translate is enabled for this conversation
    // We need to check the conversation's aiPrefs
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (!conversationDoc.exists) {
      console.log(`[LastMessageService] ❌ Conversation ${conversationId} not found`);
      return {
        conversationId,
        text: originalText,
        timestamp,
        senderId,
        senderName,
        isTranslated: false
      };
    }
    
    const conversationData = conversationDoc.data();
    const aiPrefs = conversationData?.aiPrefs?.[userId];
    
    // If auto-translate is not enabled, return original text
    if (!aiPrefs?.autoTranslate) {
      console.log(`[LastMessageService] ⏭️ Auto-translate not enabled for user ${userId}`);
      return {
        conversationId,
        text: originalText,
        timestamp,
        senderId,
        senderName,
        isTranslated: false
      };
    }
    
    // Check if translation already exists in messageData.aiMeta
    const existingTranslation = messageData.aiMeta?.translatedText?.[targetLang];
    if (existingTranslation) {
      console.log(`[LastMessageService] ✅ Using existing translation for ${targetLang}`);
      return {
        conversationId,
        text: existingTranslation,
        timestamp,
        senderId,
        senderName,
        isTranslated: true,
        originalText
      };
    } else {
      console.log(`[LastMessageService] ⏳ Translation not yet available for ${targetLang}, using original text`);
      // Return original text - translation will be processed automatically in background
      return {
        conversationId,
        text: originalText,
        timestamp,
        senderId,
        senderName,
        isTranslated: false
      };
    }
    
  } catch (error) {
    console.error(`[LastMessageService] ❌ Error fetching last message for ${conversationId}:`, error);
    return null;
  }
}

/**
 * Get last message previews for multiple conversations
 * @param conversationIds - Array of conversation IDs
 * @param userId - Current user ID
 * @returns Map of conversation ID to last message preview
 */
export async function getLastMessagePreviews(
  conversationIds: string[],
  userId: string
): Promise<{ [conversationId: string]: LastMessagePreview }> {
  console.log(`[LastMessageService] 🔍 Fetching last messages for ${conversationIds.length} conversations`);
  
  const results: { [conversationId: string]: LastMessagePreview } = {};
  
  // Process conversations in parallel for better performance
  const promises = conversationIds.map(async (conversationId) => {
    const preview = await getLastMessagePreview(conversationId, userId);
    if (preview) {
      results[conversationId] = preview;
    }
  });
  
  await Promise.all(promises);
  
  console.log(`[LastMessageService] ✅ Fetched ${Object.keys(results).length} last message previews`);
  return results;
}
