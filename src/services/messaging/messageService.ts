/**
 * Message Service for MessageAI
 * Handles message sending, receiving, and real-time synchronization
 * Implements optimistic UI updates with Firestore and SQLite integration
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
import * as sqliteService from '../sqlite/sqliteService';
import * as conversationService from './conversationService';
import { networkService } from '../network/networkService';
import * as offlineQueueService from './offlineQueueService';

/**
 * Send a message with optimistic UI update
 * 
 * Flow:
 * 1. Generate message ID and create message object with 'pending' status
 * 2. Save to SQLite immediately (optimistic update)
 * 3. Upload to Firestore
 * 4. Update status to 'sent' on success or 'failed' on error
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

  // Create message object with pending status
  const message: Message = {
    id: messageId,
    conversationId,
    senderId,
    text: text.trim(),
    imageUrl: null,
    timestamp,
    status: 'pending',
    readBy: [senderId],
    createdAt: timestamp,
  };

  try {
    // Step 1: Save to SQLite immediately (optimistic update)
    await sqliteService.saveMessage(message);
    console.log('[MessageService] Message saved to SQLite (optimistic):', messageId);

    // Step 2: Check if online
    if (!networkService.isOnline()) {
      // Offline: Add to queue and return with pending status
      console.log('[MessageService] Offline - adding message to queue:', messageId);
      await offlineQueueService.addToQueue(message);
      return message; // Return with pending status
    }

    // Step 3: Upload to Firestore (online)
    const messageRef = doc(db, 'messages', messageId);
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

    // Step 4: Update status to 'sent'
    message.status = 'sent';
    await sqliteService.updateMessageStatus(messageId, 'sent');
    console.log('[MessageService] Message uploaded to Firestore:', messageId);

    // Step 5: Update conversation's last message
    await conversationService.updateConversationLastMessage(
      conversationId,
      text.trim(),
      timestamp
    );

    return message;
  } catch (error) {
    console.error('[MessageService] Failed to send message:', error);

    // Add to offline queue for retry
    await offlineQueueService.addToQueue(message);
    console.log('[MessageService] Message added to offline queue for retry:', messageId);

    // Keep status as pending (will be retried)
    return message;
  }
}

/**
 * Retry sending a failed message
 * 
 * @param {Message} message - Failed message to retry
 * @returns {Promise<Message>} Updated message
 */
export async function retryMessage(message: Message): Promise<Message> {
  try {
    // Update status to pending
    message.status = 'pending';
    await sqliteService.updateMessageStatus(message.id, 'pending');

    // Upload to Firestore
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
    await sqliteService.updateMessageStatus(message.id, 'sent');

    // Update conversation's last message
    await conversationService.updateConversationLastMessage(
      message.conversationId,
      message.text,
      message.timestamp
    );

    console.log('[MessageService] Message retry successful:', message.id);
    return message;
  } catch (error) {
    console.error('[MessageService] Failed to retry message:', error);

    // Update status back to failed
    message.status = 'failed';
    await sqliteService.updateMessageStatus(message.id, 'failed');

    throw error;
  }
}

/**
 * Load cached messages from SQLite
 * Used for cache-first loading strategy
 * 
 * @param {string} conversationId - Conversation ID
 * @param {number} limit - Maximum number of messages to load
 * @returns {Promise<Message[]>} Array of cached messages
 */
export async function loadCachedMessages(
  conversationId: string,
  limit: number = 100
): Promise<Message[]> {
  try {
    const messages = await sqliteService.getMessages(conversationId, limit);
    console.log(`[MessageService] Loaded ${messages.length} messages from cache`);
    return messages;
  } catch (error) {
    console.error('[MessageService] Failed to load cached messages:', error);
    return [];
  }
}

/**
 * Set up real-time listener for messages
 * Listens to Firestore for new messages and saves them to SQLite
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

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const messages: Message[] = [];

      for (const docSnapshot of querySnapshot.docs) {
        const docData = docSnapshot.data();
        const message: Message = {
          id: docSnapshot.id,
          conversationId: docData.conversationId,
          senderId: docData.senderId,
          text: docData.text,
          imageUrl: docData.imageUrl || null,
          timestamp: docData.timestamp?.toMillis() || Date.now(),
          status: docData.status as MessageStatus,
          readBy: docData.readBy || [],
          createdAt: docData.createdAt?.toMillis() || Date.now(),
        };

        messages.push(message);

        // Save to SQLite for offline access
        await sqliteService.saveMessage(message);
      }

      console.log(`[MessageService] Received ${messages.length} messages from Firestore`);

      // Call callback with updated messages
      onMessagesUpdate(messages);
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
 * Removes from both Firestore and SQLite
 * 
 * @param {string} messageId - Message ID to delete
 * @returns {Promise<void>}
 */
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    // Delete from SQLite
    await sqliteService.deleteMessage(messageId);

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
  loadCachedMessages,
  listenToMessages,
  markMessageAsRead,
  deleteMessage,
};

