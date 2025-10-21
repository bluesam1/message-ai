/**
 * Conversation Service for MessageAI
 * Handles conversation creation, retrieval, and management
 * Integrates with both Firestore and SQLite
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  orderBy,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Conversation } from '../../types/message';
import * as sqliteService from '../sqlite/sqliteService';

/**
 * Generate a unique conversation ID
 * Format: conv_timestamp_randomstring
 * 
 * @returns {string} Unique conversation ID
 */
function generateConversationId(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  return `conv_${timestamp}_${randomSuffix}`;
}

/**
 * Sort participant IDs alphabetically
 * Ensures consistent ordering for finding existing conversations
 * 
 * @param {string[]} participants - Array of participant user IDs
 * @returns {string[]} Sorted array of participant IDs
 */
function sortParticipants(participants: string[]): string[] {
  return [...participants].sort();
}

/**
 * Find existing conversation between users
 * Searches Firestore for a direct conversation with the specified participants
 * 
 * @param {string[]} participantIds - Array of user IDs (should be 2 for direct conversation)
 * @returns {Promise<Conversation | null>} Existing conversation or null
 */
async function findExistingConversation(
  participantIds: string[]
): Promise<Conversation | null> {
  try {
    // Sort participants to ensure consistent query
    const sortedParticipants = sortParticipants(participantIds);
    
    // Query Firestore for existing conversation
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', '==', sortedParticipants),
      where('type', '==', 'direct')
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Return the first matching conversation
    const docData = querySnapshot.docs[0].data();
    const conversation: Conversation = {
      id: querySnapshot.docs[0].id,
      participants: docData.participants,
      type: docData.type,
      lastMessage: docData.lastMessage || '',
      lastMessageTime: docData.lastMessageTime?.toMillis() || Date.now(),
      createdAt: docData.createdAt?.toMillis() || Date.now(),
      updatedAt: docData.updatedAt?.toMillis() || Date.now(),
    };
    
    console.log('[ConversationService] Found existing conversation:', conversation.id);
    return conversation;
  } catch (error) {
    console.error('[ConversationService] Error finding conversation:', error);
    throw error;
  }
}

/**
 * Create a new conversation
 * Creates conversation in both Firestore and SQLite
 * 
 * @param {string[]} participantIds - Array of user IDs
 * @param {string} type - Conversation type ('direct' or 'group')
 * @returns {Promise<Conversation>} Newly created conversation
 */
async function createConversation(
  participantIds: string[],
  type: 'direct' | 'group' = 'direct'
): Promise<Conversation> {
  try {
    // Sort participants for consistency
    const sortedParticipants = sortParticipants(participantIds);
    
    // Generate conversation ID
    const conversationId = generateConversationId();
    const now = Date.now();
    
    // Create conversation object
    const conversation: Conversation = {
      id: conversationId,
      participants: sortedParticipants,
      type,
      lastMessage: '',
      lastMessageTime: now,
      createdAt: now,
      updatedAt: now,
    };
    
    // Save to Firestore
    const conversationRef = doc(db, 'conversations', conversationId);
    await setDoc(conversationRef, {
      participants: sortedParticipants,
      type,
      lastMessage: '',
      lastMessageTime: Timestamp.fromMillis(now),
      createdAt: Timestamp.fromMillis(now),
      updatedAt: Timestamp.fromMillis(now),
    });
    
    // Save to SQLite
    await sqliteService.saveConversation(conversation);
    
    console.log('[ConversationService] Created new conversation:', conversationId);
    return conversation;
  } catch (error) {
    console.error('[ConversationService] Error creating conversation:', error);
    throw error;
  }
}

/**
 * Find or create a direct conversation between two users
 * First checks if conversation exists, creates new one if not
 * 
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Promise<Conversation>} Existing or new conversation
 * 
 * @example
 * const conversation = await findOrCreateConversation('user123', 'user456');
 */
export async function findOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<Conversation> {
  try {
    // Check if conversation already exists
    const existingConversation = await findExistingConversation([userId1, userId2]);
    
    if (existingConversation) {
      // Save to SQLite for offline access
      await sqliteService.saveConversation(existingConversation);
      return existingConversation;
    }
    
    // Create new conversation
    const newConversation = await createConversation([userId1, userId2], 'direct');
    return newConversation;
  } catch (error) {
    console.error('[ConversationService] Error in findOrCreateConversation:', error);
    throw error;
  }
}

/**
 * Get a single conversation by ID
 * Tries SQLite first (cache-first), then Firestore
 * 
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Conversation | null>} Conversation or null if not found
 */
export async function getConversationById(
  conversationId: string
): Promise<Conversation | null> {
  try {
    // Try SQLite first (cache-first)
    const cachedConversation = await sqliteService.getConversation(conversationId);
    if (cachedConversation) {
      console.log('[ConversationService] Found conversation in cache');
      return cachedConversation;
    }
    
    // Fetch from Firestore
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (!conversationDoc.exists()) {
      return null;
    }
    
    const docData = conversationDoc.data();
    const conversation: Conversation = {
      id: conversationDoc.id,
      participants: docData.participants,
      type: docData.type,
      lastMessage: docData.lastMessage || '',
      lastMessageTime: docData.lastMessageTime?.toMillis() || Date.now(),
      createdAt: docData.createdAt?.toMillis() || Date.now(),
      updatedAt: docData.updatedAt?.toMillis() || Date.now(),
    };
    
    // Save to SQLite for future access
    await sqliteService.saveConversation(conversation);
    
    return conversation;
  } catch (error) {
    console.error('[ConversationService] Error getting conversation:', error);
    throw error;
  }
}

/**
 * Get all conversations for a user
 * Loads from SQLite immediately, sets up Firestore listener for real-time updates
 * 
 * @param {string} userId - User ID
 * @param {Function} onUpdate - Callback function called when conversations update
 * @returns {Promise<Unsubscribe>} Function to unsubscribe from listener
 */
export async function getUserConversations(
  userId: string,
  onUpdate: (conversations: Conversation[]) => void
): Promise<Unsubscribe> {
  try {
    // Load from SQLite immediately (cache-first)
    const cachedConversations = await sqliteService.getConversations();
    const userConversations = cachedConversations.filter((conv) =>
      conv.participants.includes(userId)
    );
    
    // Call callback with cached data
    onUpdate(userConversations);
    
    // Set up Firestore listener for real-time updates
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const conversations: Conversation[] = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const docData = docSnapshot.data();
        const conversation: Conversation = {
          id: docSnapshot.id,
          participants: docData.participants,
          type: docData.type,
          lastMessage: docData.lastMessage || '',
          lastMessageTime: docData.lastMessageTime?.toMillis() || Date.now(),
          createdAt: docData.createdAt?.toMillis() || Date.now(),
          updatedAt: docData.updatedAt?.toMillis() || Date.now(),
        };
        
        conversations.push(conversation);
        
        // Save to SQLite for offline access
        await sqliteService.saveConversation(conversation);
      }
      
      console.log(`[ConversationService] Received ${conversations.length} conversations from Firestore`);
      
      // Call callback with updated data
      onUpdate(conversations);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('[ConversationService] Error getting user conversations:', error);
    throw error;
  }
}

/**
 * Update conversation's last message
 * Updates both Firestore and SQLite
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
    // Update Firestore
    const conversationRef = doc(db, 'conversations', conversationId);
    await setDoc(
      conversationRef,
      {
        lastMessage,
        lastMessageTime: Timestamp.fromMillis(lastMessageTime),
        updatedAt: Timestamp.fromMillis(Date.now()),
      },
      { merge: true }
    );
    
    // Update SQLite
    await sqliteService.updateConversationLastMessage(
      conversationId,
      lastMessage,
      lastMessageTime
    );
    
    console.log(`[ConversationService] Updated last message for conversation ${conversationId}`);
  } catch (error) {
    console.error('[ConversationService] Error updating conversation last message:', error);
    throw error;
  }
}

/**
 * Delete a conversation
 * Removes from both Firestore and SQLite
 * Note: In production, you may want to implement soft delete or archive
 * 
 * @param {string} conversationId - Conversation ID to delete
 * @returns {Promise<void>}
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    // Delete from SQLite (includes messages)
    await sqliteService.deleteConversation(conversationId);
    
    console.log(`[ConversationService] Deleted conversation ${conversationId}`);
  } catch (error) {
    console.error('[ConversationService] Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Export all functions
 */
export default {
  findOrCreateConversation,
  getConversationById,
  getUserConversations,
  updateConversationLastMessage,
  deleteConversation,
};

