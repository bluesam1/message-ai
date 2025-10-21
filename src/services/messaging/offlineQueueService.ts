/**
 * Offline Queue Service
 * 
 * Manages the pending messages queue in SQLite
 * Handles adding, retrieving, and removing messages from the offline queue
 */

import * as SQLite from 'expo-sqlite';
import { Message } from '../../types/message';

const DB_NAME = 'messageai.db';
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Get database instance
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return db;
}

/**
 * Add a message to the pending queue
 * 
 * @param message - Message to add to queue
 */
export async function addToQueue(message: Message): Promise<void> {
  try {
    const database = await getDb();
    
    await database.runAsync(
      `INSERT OR REPLACE INTO pendingMessages 
       (id, conversationId, senderId, text, imageUrl, timestamp, retryCount, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.conversationId,
        message.senderId,
        message.text,
        message.imageUrl || null,
        message.timestamp,
        0, // Initial retry count
        Date.now(),
      ]
    );
    
    console.log('[OfflineQueue] Message added to queue:', message.id);
  } catch (error) {
    console.error('[OfflineQueue] Failed to add message to queue:', error);
    throw error;
  }
}

/**
 * Get all pending messages from the queue
 * Returns messages sorted by timestamp (oldest first) for chronological sync
 * 
 * @returns Array of pending messages
 */
export async function getPendingMessages(): Promise<Message[]> {
  try {
    const database = await getDb();
    
    const rows = await database.getAllAsync<any>(
      `SELECT * FROM pendingMessages 
       ORDER BY timestamp ASC`
    );
    
    // Convert database rows to Message objects
    const messages: Message[] = rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      text: row.text,
      imageUrl: row.imageUrl,
      timestamp: row.timestamp,
      status: 'pending' as const,
      readBy: [],
      createdAt: row.createdAt,
    }));
    
    console.log(`[OfflineQueue] Retrieved ${messages.length} pending messages`);
    return messages;
  } catch (error) {
    console.error('[OfflineQueue] Failed to get pending messages:', error);
    throw error;
  }
}

/**
 * Remove a message from the pending queue
 * Called after successful sync to Firestore
 * 
 * @param messageId - ID of message to remove
 */
export async function removeFromQueue(messageId: string): Promise<void> {
  try {
    const database = await getDb();
    
    await database.runAsync(
      `DELETE FROM pendingMessages WHERE id = ?`,
      [messageId]
    );
    
    console.log('[OfflineQueue] Message removed from queue:', messageId);
  } catch (error) {
    console.error('[OfflineQueue] Failed to remove message from queue:', error);
    throw error;
  }
}

/**
 * Increment the retry count for a message
 * Called when sync fails and message needs to be retried
 * 
 * @param messageId - ID of message to increment retry count
 */
export async function incrementRetryCount(messageId: string): Promise<void> {
  try {
    const database = await getDb();
    
    await database.runAsync(
      `UPDATE pendingMessages 
       SET retryCount = retryCount + 1 
       WHERE id = ?`,
      [messageId]
    );
    
    console.log('[OfflineQueue] Retry count incremented for message:', messageId);
  } catch (error) {
    console.error('[OfflineQueue] Failed to increment retry count:', error);
    throw error;
  }
}

/**
 * Get the retry count for a specific message
 * 
 * @param messageId - ID of message to check
 * @returns Retry count (0 if message not found)
 */
export async function getRetryCount(messageId: string): Promise<number> {
  try {
    const database = await getDb();
    
    const row = await database.getFirstAsync<{ retryCount: number }>(
      `SELECT retryCount FROM pendingMessages WHERE id = ?`,
      [messageId]
    );
    
    return row?.retryCount || 0;
  } catch (error) {
    console.error('[OfflineQueue] Failed to get retry count:', error);
    return 0;
  }
}

/**
 * Get count of pending messages
 * Useful for UI indicators
 * 
 * @returns Count of pending messages
 */
export async function getPendingCount(): Promise<number> {
  try {
    const database = await getDb();
    
    const row = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pendingMessages`
    );
    
    return row?.count || 0;
  } catch (error) {
    console.error('[OfflineQueue] Failed to get pending count:', error);
    return 0;
  }
}

/**
 * Clear all pending messages from queue
 * WARNING: Only use for testing or clearing failed state
 */
export async function clearQueue(): Promise<void> {
  try {
    const database = await getDb();
    
    await database.runAsync(`DELETE FROM pendingMessages`);
    
    console.log('[OfflineQueue] Queue cleared');
  } catch (error) {
    console.error('[OfflineQueue] Failed to clear queue:', error);
    throw error;
  }
}

export default {
  addToQueue,
  getPendingMessages,
  removeFromQueue,
  incrementRetryCount,
  getRetryCount,
  getPendingCount,
  clearQueue,
};

