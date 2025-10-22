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
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Conversation } from '../../types/message';
import * as sqliteService from '../sqlite/sqliteService';
import { getUserIdsByEmails } from '../../utils/userLookup';
import { validateGroupName, validateMinimumParticipants } from '../../utils/groupValidation';

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
      groupName: docData.groupName || null,
      groupPhoto: docData.groupPhoto || null,
      createdBy: docData.createdBy || docData.participants[0],
      lastMessage: docData.lastMessage || '',
      lastMessageTime: toMillis(docData.lastMessageTime),
      createdAt: toMillis(docData.createdAt),
      updatedAt: toMillis(docData.updatedAt),
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
 * @param {string} [groupName] - Group name (required for groups)
 * @param {string} [createdBy] - User ID of creator
 * @returns {Promise<Conversation>} Newly created conversation
 */
async function createConversation(
  participantIds: string[],
  type: 'direct' | 'group' = 'direct',
  groupName?: string,
  createdBy?: string
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
      groupName: groupName || null,
      groupPhoto: null,
      createdBy: createdBy || sortedParticipants[0],
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
      groupName: groupName || null,
      groupPhoto: null,
      createdBy: createdBy || sortedParticipants[0],
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
      groupName: docData.groupName || null,
      groupPhoto: docData.groupPhoto || null,
      createdBy: docData.createdBy || docData.participants[0],
      lastMessage: docData.lastMessage || '',
      lastMessageTime: toMillis(docData.lastMessageTime),
      createdAt: toMillis(docData.createdAt),
      updatedAt: toMillis(docData.updatedAt),
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
          groupName: docData.groupName || null,
          groupPhoto: docData.groupPhoto || null,
          createdBy: docData.createdBy || docData.participants[0],
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
 * Create a new group conversation
 * Validates group name, looks up participants by email, creates group in Firestore and SQLite
 * 
 * @param {string} groupName - Name of the group (3-50 characters)
 * @param {string[]} participantEmails - Array of participant email addresses
 * @param {string} creatorId - User ID of the group creator
 * @returns {Promise<Conversation>} Newly created group conversation
 * @throws {Error} If validation fails, users not found, or insufficient participants
 * 
 * @example
 * const group = await createGroup('Team Project', ['alice@example.com', 'bob@example.com'], 'user123');
 */
export async function createGroup(
  groupName: string,
  participantEmails: string[],
  creatorId: string
): Promise<Conversation> {
  try {
    // Validate group name
    const nameValidation = validateGroupName(groupName);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    // Look up user IDs from emails
    const participantIds = await getUserIdsByEmails(participantEmails);

    // Check if all emails were found
    if (participantIds.length !== participantEmails.length) {
      throw new Error('One or more users not found. Please check email addresses.');
    }

    // Add creator to participants if not already included
    const allParticipants = [creatorId, ...participantIds];
    const uniqueParticipants = [...new Set(allParticipants)];

    // Validate minimum participants (3 total including creator)
    const participantValidation = validateMinimumParticipants(uniqueParticipants.length);
    if (!participantValidation.valid) {
      throw new Error(participantValidation.error);
    }

    // Create group conversation
    const groupConversation = await createConversation(
      uniqueParticipants,
      'group',
      groupName.trim(),
      creatorId
    );

    console.log(`[ConversationService] Created group '${groupName}' with ${uniqueParticipants.length} members`);
    return groupConversation;
  } catch (error) {
    console.error('[ConversationService] Error creating group:', error);
    throw error;
  }
}

/**
 * Add members to an existing group conversation
 * Looks up users by email, checks for duplicates, adds to participants array
 * 
 * @param {string} conversationId - ID of the group conversation
 * @param {string[]} newMemberEmails - Array of email addresses to add
 * @returns {Promise<void>}
 * @throws {Error} If conversation not found, users not found, or duplicates detected
 * 
 * @example
 * await addMembersToGroup('conv_123', ['charlie@example.com', 'david@example.com']);
 */
export async function addMembersToGroup(
  conversationId: string,
  newMemberEmails: string[]
): Promise<void> {
  try {
    // Get existing conversation
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verify it's a group conversation
    if (conversation.type !== 'group') {
      throw new Error('Can only add members to group conversations');
    }

    // Look up user IDs from emails
    const newMemberIds = await getUserIdsByEmails(newMemberEmails);

    // Check if all emails were found
    if (newMemberIds.length !== newMemberEmails.length) {
      throw new Error('One or more users not found. Please check email addresses.');
    }

    // Check for duplicates
    const duplicates = newMemberIds.filter((id) =>
      conversation.participants.includes(id)
    );

    if (duplicates.length > 0) {
      throw new Error('One or more users are already in the group');
    }

    // Update Firestore - add new members using arrayUnion
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      participants: arrayUnion(...newMemberIds),
      updatedAt: Timestamp.fromMillis(Date.now()),
    });

    // Update local conversation object
    conversation.participants.push(...newMemberIds);
    conversation.updatedAt = Date.now();

    // Save to SQLite
    await sqliteService.saveConversation(conversation);

    console.log(`[ConversationService] Added ${newMemberIds.length} members to group ${conversationId}`);
  } catch (error) {
    console.error('[ConversationService] Error adding members to group:', error);
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
  createGroup,
  addMembersToGroup,
};

