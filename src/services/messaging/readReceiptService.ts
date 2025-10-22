/**
 * Read Receipt Service for MessageAI
 * Handles marking messages as read and tracking read status
 * Supports both one-on-one and group conversations
 */

import {
  writeBatch,
  doc,
  arrayUnion,
  query,
  where,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { sqliteService } from '../sqlite/sqliteService';

/**
 * Mark multiple messages as read by a user
 * Updates both Firestore and local SQLite database
 * 
 * @param messageIds - Array of message IDs to mark as read
 * @param userId - ID of the user marking messages as read
 * @returns Promise that resolves when all updates are complete
 */
export async function markMessagesAsRead(
  messageIds: string[],
  userId: string
): Promise<void> {
  if (messageIds.length === 0) {
    return; // No messages to mark as read
  }

  try {
    // Use Firestore batch write for atomic updates
    const batch = writeBatch(db);

    messageIds.forEach((messageId) => {
      const messageRef = doc(db, 'messages', messageId);
      batch.update(messageRef, {
        readBy: arrayUnion(userId),
      });
    });

    // Commit batch to Firestore
    await batch.commit();

    // Update local SQLite database
    await sqliteService.markMessagesAsRead(messageIds, userId);

    console.log(`[ReadReceipt] Marked ${messageIds.length} messages as read for user ${userId}`);
  } catch (error) {
    console.error('[ReadReceipt] Error marking messages as read:', error);
    throw new Error('Failed to mark messages as read');
  }
}

/**
 * Get IDs of unread messages in a conversation for a specific user
 * 
 * @param conversationId - ID of the conversation
 * @param userId - ID of the user to check unread messages for
 * @returns Promise resolving to array of unread message IDs
 */
export async function getUnreadMessageIds(
  conversationId: string,
  userId: string
): Promise<string[]> {
  try {
    // Query messages where the user ID is not in the readBy array
    // Note: This approach fetches all messages in the conversation and filters client-side
    // because Firestore doesn't support "not-in" for array fields efficiently
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId)
    );

    const snapshot = await getDocs(q);
    
    // Filter messages where userId is not in readBy array and user is not the sender
    const unreadMessageIds = snapshot.docs
      .filter((doc) => {
        const data = doc.data();
        const readBy = data.readBy || [];
        // Don't mark own messages as unread
        return data.senderId !== userId && !readBy.includes(userId);
      })
      .map((doc) => doc.id);

    console.log(`[ReadReceipt] Found ${unreadMessageIds.length} unread messages in conversation ${conversationId}`);
    return unreadMessageIds;
  } catch (error) {
    console.error('[ReadReceipt] Error getting unread messages:', error);
    throw new Error('Failed to get unread messages');
  }
}

/**
 * Read Receipt Service object
 * Provides methods for managing read receipts
 */
export const readReceiptService = {
  markMessagesAsRead,
  getUnreadMessageIds,
};

