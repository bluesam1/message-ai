/**
 * SQLite Service for MessageAI
 * Handles local persistence of messages and conversations
 * Provides offline-first data storage with cache-first loading strategy
 */

import * as SQLite from 'expo-sqlite';
import { Message, Conversation, MessageStatus } from '../../types/message';

/**
 * Database instance
 */
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Database name
 */
const DB_NAME = 'messageai.db';

/**
 * Initialize the SQLite database
 * Creates tables and indexes if they don't exist
 * Should be called when the app starts
 * 
 * @returns {Promise<void>}
 */
export async function initDatabase(): Promise<void> {
  try {
    // Open database connection
    db = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Create conversations table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        participants TEXT NOT NULL,
        type TEXT NOT NULL,
        lastMessage TEXT,
        lastMessageTime INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);
    
    // Create messages table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        text TEXT NOT NULL,
        imageUrl TEXT,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL,
        readBy TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (conversationId) REFERENCES conversations(id)
      );
    `);
    
    // Create index on messages for query performance
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation 
      ON messages(conversationId, timestamp DESC);
    `);
    
    // Create index on conversations for query performance
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_conversations_time 
      ON conversations(lastMessageTime DESC);
    `);
    
    console.log('[SQLite] Database initialized successfully');
  } catch (error) {
    console.error('[SQLite] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get database instance
 * Throws error if database is not initialized
 * 
 * @returns {SQLite.SQLiteDatabase} Database instance
 */
function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Save a message to the database
 * Uses INSERT OR REPLACE to handle duplicates
 * 
 * @param {Message} message - Message object to save
 * @returns {Promise<void>}
 */
export async function saveMessage(message: Message): Promise<void> {
  try {
    const database = getDb();
    
    await database.runAsync(
      `INSERT OR REPLACE INTO messages 
       (id, conversationId, senderId, text, imageUrl, timestamp, status, readBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.conversationId,
        message.senderId,
        message.text,
        message.imageUrl,
        message.timestamp,
        message.status,
        JSON.stringify(message.readBy),
        message.createdAt,
      ]
    );
    
    console.log('[SQLite] Message saved:', message.id);
  } catch (error) {
    console.error('[SQLite] Failed to save message:', error);
    throw error;
  }
}

/**
 * Get messages for a conversation
 * Returns messages ordered by timestamp (newest first)
 * 
 * @param {string} conversationId - Conversation ID
 * @param {number} limit - Maximum number of messages to retrieve (default: 100)
 * @returns {Promise<Message[]>} Array of messages
 */
export async function getMessages(
  conversationId: string,
  limit: number = 100
): Promise<Message[]> {
  try {
    const database = getDb();
    
    const rows = await database.getAllAsync<any>(
      `SELECT * FROM messages 
       WHERE conversationId = ? 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [conversationId, limit]
    );
    
    // Parse JSON fields and convert to Message objects
    const messages: Message[] = rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      text: row.text,
      imageUrl: row.imageUrl,
      timestamp: row.timestamp,
      status: row.status as MessageStatus,
      readBy: JSON.parse(row.readBy),
      createdAt: row.createdAt,
    }));
    
    console.log(`[SQLite] Retrieved ${messages.length} messages for conversation ${conversationId}`);
    return messages;
  } catch (error) {
    console.error('[SQLite] Failed to get messages:', error);
    throw error;
  }
}

/**
 * Update message status
 * Used for status transitions (pending -> sent, pending -> failed, etc.)
 * 
 * @param {string} messageId - Message ID
 * @param {MessageStatus} status - New status
 * @returns {Promise<void>}
 */
export async function updateMessageStatus(
  messageId: string,
  status: MessageStatus
): Promise<void> {
  try {
    const database = getDb();
    
    await database.runAsync(
      `UPDATE messages SET status = ? WHERE id = ?`,
      [status, messageId]
    );
    
    console.log(`[SQLite] Message ${messageId} status updated to ${status}`);
  } catch (error) {
    console.error('[SQLite] Failed to update message status:', error);
    throw error;
  }
}

/**
 * Save a conversation to the database
 * Uses INSERT OR REPLACE to handle duplicates
 * 
 * @param {Conversation} conversation - Conversation object to save
 * @returns {Promise<void>}
 */
export async function saveConversation(conversation: Conversation): Promise<void> {
  try {
    const database = getDb();
    
    await database.runAsync(
      `INSERT OR REPLACE INTO conversations 
       (id, participants, type, lastMessage, lastMessageTime, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        conversation.id,
        JSON.stringify(conversation.participants),
        conversation.type,
        conversation.lastMessage,
        conversation.lastMessageTime,
        conversation.createdAt,
        conversation.updatedAt,
      ]
    );
    
    console.log('[SQLite] Conversation saved:', conversation.id);
  } catch (error) {
    console.error('[SQLite] Failed to save conversation:', error);
    throw error;
  }
}

/**
 * Get all conversations
 * Returns conversations ordered by last message time (most recent first)
 * 
 * @returns {Promise<Conversation[]>} Array of conversations
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const database = getDb();
    
    const rows = await database.getAllAsync<any>(
      `SELECT * FROM conversations 
       ORDER BY lastMessageTime DESC`
    );
    
    // Parse JSON fields and convert to Conversation objects
    const conversations: Conversation[] = rows.map((row) => ({
      id: row.id,
      participants: JSON.parse(row.participants),
      type: row.type,
      lastMessage: row.lastMessage,
      lastMessageTime: row.lastMessageTime,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    
    console.log(`[SQLite] Retrieved ${conversations.length} conversations`);
    return conversations;
  } catch (error) {
    console.error('[SQLite] Failed to get conversations:', error);
    throw error;
  }
}

/**
 * Get a single conversation by ID
 * 
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Conversation | null>} Conversation object or null if not found
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  try {
    const database = getDb();
    
    const row = await database.getFirstAsync<any>(
      `SELECT * FROM conversations WHERE id = ?`,
      [conversationId]
    );
    
    if (!row) {
      return null;
    }
    
    const conversation: Conversation = {
      id: row.id,
      participants: JSON.parse(row.participants),
      type: row.type,
      lastMessage: row.lastMessage,
      lastMessageTime: row.lastMessageTime,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    
    return conversation;
  } catch (error) {
    console.error('[SQLite] Failed to get conversation:', error);
    throw error;
  }
}

/**
 * Delete a message from the database
 * 
 * @param {string} messageId - Message ID to delete
 * @returns {Promise<void>}
 */
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    const database = getDb();
    
    await database.runAsync(
      `DELETE FROM messages WHERE id = ?`,
      [messageId]
    );
    
    console.log(`[SQLite] Message deleted: ${messageId}`);
  } catch (error) {
    console.error('[SQLite] Failed to delete message:', error);
    throw error;
  }
}

/**
 * Delete a conversation and all its messages
 * 
 * @param {string} conversationId - Conversation ID to delete
 * @returns {Promise<void>}
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    const database = getDb();
    
    // Delete all messages in the conversation
    await database.runAsync(
      `DELETE FROM messages WHERE conversationId = ?`,
      [conversationId]
    );
    
    // Delete the conversation
    await database.runAsync(
      `DELETE FROM conversations WHERE id = ?`,
      [conversationId]
    );
    
    console.log(`[SQLite] Conversation and messages deleted: ${conversationId}`);
  } catch (error) {
    console.error('[SQLite] Failed to delete conversation:', error);
    throw error;
  }
}

/**
 * Update conversation's last message info
 * Used when a new message is sent/received
 * 
 * @param {string} conversationId - Conversation ID
 * @param {string} lastMessage - Preview text of last message
 * @param {number} lastMessageTime - Timestamp of last message
 * @returns {Promise<void>}
 */
export async function updateConversationLastMessage(
  conversationId: string,
  lastMessage: string,
  lastMessageTime: number
): Promise<void> {
  try {
    const database = getDb();
    
    await database.runAsync(
      `UPDATE conversations 
       SET lastMessage = ?, lastMessageTime = ?, updatedAt = ? 
       WHERE id = ?`,
      [lastMessage, lastMessageTime, Date.now(), conversationId]
    );
    
    console.log(`[SQLite] Conversation ${conversationId} last message updated`);
  } catch (error) {
    console.error('[SQLite] Failed to update conversation last message:', error);
    throw error;
  }
}

/**
 * Clear all data from the database
 * WARNING: This will delete all messages and conversations
 * 
 * @returns {Promise<void>}
 */
export async function clearAllData(): Promise<void> {
  try {
    const database = getDb();
    
    await database.execAsync(`DELETE FROM messages`);
    await database.execAsync(`DELETE FROM conversations`);
    
    console.log('[SQLite] All data cleared');
  } catch (error) {
    console.error('[SQLite] Failed to clear data:', error);
    throw error;
  }
}

/**
 * Close the database connection
 * Should be called when the app is closing
 * 
 * @returns {Promise<void>}
 */
export async function closeDatabase(): Promise<void> {
  try {
    if (db) {
      await db.closeAsync();
      db = null;
      console.log('[SQLite] Database connection closed');
    }
  } catch (error) {
    console.error('[SQLite] Failed to close database:', error);
    throw error;
  }
}

/**
 * Export all functions for testing
 */
export default {
  initDatabase,
  saveMessage,
  getMessages,
  updateMessageStatus,
  saveConversation,
  getConversations,
  getConversation,
  deleteMessage,
  deleteConversation,
  updateConversationLastMessage,
  clearAllData,
  closeDatabase,
};

