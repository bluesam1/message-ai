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
 * Database initialization promise to prevent multiple concurrent initializations
 */
let initPromise: Promise<void> | null = null;

/**
 * Database name
 */
const DB_NAME = 'messageai.db';

/**
 * Initialize the SQLite database
 * Creates tables and indexes if they don't exist
 * Should be called when the app starts
 * Safe to call multiple times - will return existing promise if already initializing
 * 
 * @returns {Promise<void>}
 */
export async function initDatabase(): Promise<void> {
  // If already initialized, return immediately
  if (db) {
    return;
  }
  
  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }
  
  // Start initialization
  initPromise = initDatabaseInternal();
  
  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

/**
 * Internal database initialization
 */
async function initDatabaseInternal(): Promise<void> {
  try {
    // Open database connection
    db = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Create conversations table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        participants TEXT NOT NULL,
        type TEXT NOT NULL,
        groupName TEXT,
        groupPhoto TEXT,
        createdBy TEXT NOT NULL,
        lastMessageTime INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        aiPrefs TEXT
      );
    `);
    
    // Migrate existing conversations table to add new columns (if they don't exist)
    // This is safe to run multiple times - will only add columns if missing
    try {
      // Check if we need to migrate by checking if groupName column exists
      const tableInfo = await db.getAllAsync(`PRAGMA table_info(conversations)`);
      const hasGroupName = tableInfo.some((col: any) => col.name === 'groupName');
      
      if (!hasGroupName) {
        await db.execAsync(`ALTER TABLE conversations ADD COLUMN groupName TEXT;`);
        await db.execAsync(`ALTER TABLE conversations ADD COLUMN groupPhoto TEXT;`);
        await db.execAsync(`ALTER TABLE conversations ADD COLUMN createdBy TEXT DEFAULT '';`);
        console.log('[SQLite] Added new group columns to conversations table');
      } else {
        console.log('[SQLite] Group columns already exist');
      }
    } catch (error) {
      // If migration fails, log but don't throw - app can still work
      console.warn('[SQLite] Migration warning:', error);
    }
    
    // Migrate messages table to add aiMeta column for translations (if it doesn't exist)
    try {
      const messagesTableInfo = await db.getAllAsync(`PRAGMA table_info(messages)`);
      const hasAiMeta = messagesTableInfo.some((col: any) => col.name === 'aiMeta');
      
      if (!hasAiMeta) {
        await db.execAsync(`ALTER TABLE messages ADD COLUMN aiMeta TEXT;`);
        console.log('[SQLite] Added aiMeta column to messages table for offline translations');
      } else {
        console.log('[SQLite] aiMeta column already exists');
      }
    } catch (error) {
      // If migration fails, log but don't throw - app can still work
      console.warn('[SQLite] aiMeta migration warning:', error);
    }
    
    // Migrate conversations table to add aiPrefs column (if it doesn't exist)
    try {
      const conversationsTableInfo = await db.getAllAsync(`PRAGMA table_info(conversations)`);
      const hasAiPrefs = conversationsTableInfo.some((col: any) => col.name === 'aiPrefs');
      
      if (!hasAiPrefs) {
        await db.execAsync(`ALTER TABLE conversations ADD COLUMN aiPrefs TEXT;`);
        console.log('[SQLite] Added aiPrefs column to conversations table');
      } else {
        console.log('[SQLite] aiPrefs column already exists in conversations');
      }
    } catch (error) {
      // If migration fails, log but don't throw - app can still work
      console.warn('[SQLite] aiPrefs migration warning:', error);
    }
    
    
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
        aiMeta TEXT,
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
    
    // Create pendingMessages table for offline queue
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pendingMessages (
        id TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        text TEXT NOT NULL,
        imageUrl TEXT,
        timestamp INTEGER NOT NULL,
        retryCount INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL
      );
    `);
    
    // Create index on pendingMessages for query performance
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_pending_messages_time 
      ON pendingMessages(timestamp ASC);
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
/**
 * Get database instance, initializing if necessary
 * This ensures all operations have a valid database connection
 */
async function ensureDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    console.log('[SQLite] Database not initialized, initializing now...');
    await initDatabase();
  }
  
  if (!db) {
    throw new Error('Database initialization failed');
  }
  
  return db;
}

/**
 * @deprecated Use ensureDb() instead for better error handling
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
    const database = await ensureDb();
    
    await database.runAsync(
      `INSERT OR REPLACE INTO messages 
       (id, conversationId, senderId, text, imageUrl, timestamp, status, readBy, createdAt, aiMeta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        message.aiMeta ? JSON.stringify(message.aiMeta) : null,
      ]
    );
    
    console.log('[SQLite] Message saved:', message.id, message.aiMeta ? '(with translations)' : '');
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
    const database = await ensureDb();
    
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
      aiMeta: row.aiMeta ? JSON.parse(row.aiMeta) : undefined,
    }));
    
    const translationsCount = messages.filter(m => m.aiMeta?.translatedText).length;
    console.log(`[SQLite] Retrieved ${messages.length} messages for conversation ${conversationId} (${translationsCount} with translations)`);
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
    const database = await ensureDb();
    
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
    const database = await ensureDb();
    
    await database.runAsync(
      `INSERT OR REPLACE INTO conversations 
       (id, participants, type, groupName, groupPhoto, createdBy, lastMessageTime, createdAt, updatedAt, aiPrefs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversation.id,
        JSON.stringify(conversation.participants),
        conversation.type,
        conversation.groupName,
        conversation.groupPhoto,
        conversation.createdBy,
        conversation.lastMessageTime,
        conversation.createdAt,
        conversation.updatedAt || Date.now(),
        conversation.aiPrefs ? JSON.stringify(conversation.aiPrefs) : null,
      ]
    );
    
    console.log('[SQLite] Conversation saved:', conversation.id, conversation.aiPrefs ? '(with AI prefs)' : '');
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
    const database = await ensureDb();
    
    const rows = await database.getAllAsync<any>(
      `SELECT * FROM conversations 
       ORDER BY lastMessageTime DESC`
    );
    
    // Parse JSON fields and convert to Conversation objects
    const conversations: Conversation[] = rows.map((row) => ({
      id: row.id,
      participants: JSON.parse(row.participants),
      type: row.type,
      groupName: row.groupName || null,
      groupPhoto: row.groupPhoto || null,
      createdBy: row.createdBy || row.participants[0],
      lastMessageTime: row.lastMessageTime,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      aiPrefs: row.aiPrefs ? JSON.parse(row.aiPrefs) : undefined,
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
    const database = await ensureDb();
    
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
      groupName: row.groupName || null,
      groupPhoto: row.groupPhoto || null,
      createdBy: row.createdBy || JSON.parse(row.participants)[0],
      lastMessageTime: row.lastMessageTime,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      aiPrefs: row.aiPrefs ? JSON.parse(row.aiPrefs) : undefined,
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
    const database = await ensureDb();
    
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
    const database = await ensureDb();
    
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
 * Update conversation's last message time
 * Used when a new message is sent/received
 * 
 * @param {string} conversationId - Conversation ID
 * @param {number} lastMessageTime - Timestamp of last message
 * @returns {Promise<void>}
 */
export async function updateConversationLastMessageTime(
  conversationId: string,
  lastMessageTime: number
): Promise<void> {
  try {
    const database = await ensureDb();
    
    await database.runAsync(
      `UPDATE conversations 
       SET lastMessageTime = ?, updatedAt = ? 
       WHERE id = ?`,
      [lastMessageTime, Date.now(), conversationId]
    );
    
    console.log(`[SQLite] Conversation ${conversationId} last message time updated`);
  } catch (error) {
    console.error('[SQLite] Failed to update conversation last message time:', error);
    throw error;
  }
}

/**
 * Mark multiple messages as read by adding a user ID to their readBy array
 * Updates the readBy field in local SQLite database
 * 
 * @param {string[]} messageIds - Array of message IDs to mark as read
 * @param {string} userId - ID of user marking messages as read
 * @returns {Promise<void>}
 */
export async function markMessagesAsRead(
  messageIds: string[],
  userId: string
): Promise<void> {
  if (messageIds.length === 0) {
    return;
  }

  try {
    const database = await ensureDb();

    // Update each message's readBy array
    // SQLite stores readBy as a JSON string
    for (const messageId of messageIds) {
      // Get current readBy array
      const result = await database.getFirstAsync<{ readBy: string }>(
        `SELECT readBy FROM messages WHERE id = ?`,
        [messageId]
      );

      if (result) {
        // Parse readBy array, add userId if not present, stringify back
        const readBy: string[] = JSON.parse(result.readBy || '[]');
        if (!readBy.includes(userId)) {
          readBy.push(userId);
          await database.runAsync(
            `UPDATE messages SET readBy = ? WHERE id = ?`,
            [JSON.stringify(readBy), messageId]
          );
        }
      }
    }

    console.log(`[SQLite] Marked ${messageIds.length} messages as read for user ${userId}`);
  } catch (error) {
    console.error('[SQLite] Failed to mark messages as read:', error);
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
    const database = await ensureDb();
    
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
 * Export SQLite service object
 */
export const sqliteService = {
  initDatabase,
  saveMessage,
  getMessages,
  updateMessageStatus,
  markMessagesAsRead,
  saveConversation,
  getConversations,
  getConversation,
  deleteMessage,
  deleteConversation,
  updateConversationLastMessageTime,
  clearAllData,
  closeDatabase,
};

/**
 * Export all functions for testing (default export)
 */
export default sqliteService;

