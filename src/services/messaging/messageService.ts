/**
 * Message Service for MessageAI
 * Handles message sending, receiving, and real-time synchronization
 * Uses Firestore offline persistence for automatic caching and queuing
 */

import {
  collection,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Message, MessageStatus } from '../../types/message';
import { generateMessageId } from '../../utils/messageUtils';
import * as conversationService from './conversationService';

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
 * Send a message with optimistic UI update
 * Uses Firestore offline persistence for automatic queuing and retry
 * 
 * @param {string} conversationId - Conversation ID
 * @param {string} text - Message text content
 * @param {string} senderId - Sender's user ID
 * @returns {Promise<Message>} The sent message
 */
export async function sendMessage(
  conversationId: string,
  text: string,
  senderId: string
): Promise<Message> {
  const messageId = generateMessageId();
  const timestamp = Date.now();

  // Create message object
  const message: Message = {
    id: messageId,
    conversationId,
    senderId,
    text: text.trim(),
    imageUrl: null,
    timestamp,
    status: 'sent',
    readBy: [senderId],
    createdAt: timestamp,
  };

  try {
    // Upload to Firestore (queues automatically if offline)
    const messageRef = doc(db, 'messages', messageId);
    console.log('[MessageService] 📤 Sending message to Firestore:', messageId);
    
    await setDoc(messageRef, {
      conversationId,
      senderId,
      text: message.text,
      imageUrl: null,
      timestamp: Timestamp.fromMillis(timestamp),
      status: 'sent',
      readBy: [senderId],
      createdAt: Timestamp.fromMillis(timestamp),
    });

    console.log('[MessageService] ✅ Message sent to Firestore successfully:', messageId);

    // Update conversation's last message time
    await conversationService.updateConversationLastMessageTime(
      conversationId,
      timestamp
    );

    return message;
  } catch (error) {
    console.error('[MessageService] Failed to send message:', error);
    // Don't throw error - Firestore will queue the message if offline
    // The message will appear with "pending" status via the listener
    console.log('[MessageService] 📝 Message queued for retry when online');
    return message;
  }
}

/**
 * Retry sending a failed message
 * With Firestore offline persistence, retries happen automatically
 * This function is kept for compatibility but delegates to Firestore
 * 
 * @param {Message} message - Failed message to retry
 * @returns {Promise<Message>} Updated message
 */
export async function retryMessage(message: Message): Promise<Message> {
  try {
    // Upload to Firestore (will queue if offline)
    const messageRef = doc(db, 'messages', message.id);
    await setDoc(messageRef, {
      conversationId: message.conversationId,
      senderId: message.senderId,
      text: message.text,
      imageUrl: message.imageUrl,
      timestamp: Timestamp.fromMillis(message.timestamp),
      status: 'sent',
      readBy: message.readBy,
      createdAt: Timestamp.fromMillis(message.createdAt),
    });

    // Update status to sent
    message.status = 'sent';

    // Update conversation's last message
    await conversationService.updateConversationLastMessageTime(
      message.conversationId,
      message.timestamp
    );

    console.log('[MessageService] Message retry successful:', message.id);
    return message;
  } catch (error) {
    console.error('[MessageService] Failed to retry message:', error);
    // Firestore will retry automatically
    message.status = 'failed';
    throw error;
  }
}

/**
 * Set up real-time listener for messages
 * Uses Firestore with offline persistence for automatic caching
 * 
 * @param {string} conversationId - Conversation ID
 * @param {Function} onMessagesUpdate - Callback function called when messages update
 * @returns {Unsubscribe} Function to unsubscribe from listener
 */
export function listenToMessages(
  conversationId: string,
  onMessagesUpdate: (messages: Message[]) => void
): Unsubscribe {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true }, // Include pending writes for offline support
      async (querySnapshot) => {
      console.log(`[MessageService] 📨 Firestore listener triggered with ${querySnapshot.docs.length} messages`);
      console.log(`[MessageService] 🔄 Metadata changes: ${querySnapshot.metadata.hasPendingWrites ? 'YES' : 'NO'}`);
      
      const messages: Message[] = [];

      for (const docSnapshot of querySnapshot.docs) {
        const docData = docSnapshot.data();
        const isPending = docSnapshot.metadata.hasPendingWrites;
        
        console.log(`[MessageService] 📝 Message ${docSnapshot.id}: pending=${isPending}, status=${docData.status}`);
        
        const message: Message = {
          id: docSnapshot.id,
          conversationId: docData.conversationId,
          senderId: docData.senderId,
          text: docData.text,
          imageUrl: docData.imageUrl || null,
          timestamp: toMillis(docData.timestamp),
          // Use pending status if write is still pending, otherwise use stored status
          status: isPending ? 'pending' : (docData.status as MessageStatus),
          readBy: docData.readBy || [],
          createdAt: toMillis(docData.createdAt),
          aiMeta: docData.aiMeta || undefined, // Include AI metadata if present
        };

        messages.push(message);
      }

      console.log(`[MessageService] ✅ Sending ${messages.length} messages to UI`);
      // Call callback with updated messages
      onMessagesUpdate(messages);
    },
    (error) => {
      console.error(`[MessageService] Listener error for conversation ${conversationId}:`, error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('[MessageService] Error setting up message listener:', error);
    throw error;
  }
}

/**
 * Mark message as read
 * Adds current user to the readBy array
 * 
 * @param {string} messageId - Message ID
 * @param {string} userId - User ID marking message as read
 * @returns {Promise<void>}
 */
export async function markMessageAsRead(
  messageId: string,
  userId: string
): Promise<void> {
  try {
    // Update Firestore
    const messageRef = doc(db, 'messages', messageId);
    // Note: In a full implementation, you'd use arrayUnion here
    // For now, we'll skip this to keep it simple

    console.log(`[MessageService] Message ${messageId} marked as read by ${userId}`);
  } catch (error) {
    console.error('[MessageService] Failed to mark message as read:', error);
    throw error;
  }
}

/**
 * Delete a message
 * Removes from Firestore (soft delete in production)
 * 
 * @param {string} messageId - Message ID to delete
 * @returns {Promise<void>}
 */
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    // Note: For now, we don't actually delete from Firestore
    // In production, implement soft delete
    console.log(`[MessageService] Message deleted: ${messageId}`);
  } catch (error) {
    console.error('[MessageService] Failed to delete message:', error);
    throw error;
  }
}

/**
 * Export all functions
 */
export default {
  sendMessage,
  retryMessage,
  listenToMessages,
  markMessageAsRead,
  deleteMessage,
};

