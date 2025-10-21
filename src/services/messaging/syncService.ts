/**
 * Sync Service
 * 
 * Handles automatic synchronization of pending messages to Firestore
 * Implements retry logic with exponential backoff
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { networkService } from '../network/networkService';
import * as offlineQueueService from './offlineQueueService';
import { updateMessageStatus } from '../sqlite/sqliteService';
import { Message } from '../../types/message';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [0, 5000, 15000]; // Immediate, 5s, 15s

/**
 * Type for sync progress callback
 */
export type SyncProgressCallback = (
  current: number,
  total: number,
  messageId: string,
  status: 'syncing' | 'success' | 'failed'
) => void;

/**
 * Current sync state
 */
let isSyncing = false;
let syncCallbacks: Set<SyncProgressCallback> = new Set();

/**
 * Check if a message already exists in Firestore
 * Prevents duplicate uploads
 * 
 * @param messageId - Message ID to check
 * @returns True if message exists in Firestore
 */
export async function checkMessageExists(messageId: string): Promise<boolean> {
  try {
    const messageRef = doc(db, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);
    return messageSnap.exists();
  } catch (error) {
    console.error('[Sync] Failed to check message existence:', error);
    // On error, assume message doesn't exist to allow retry
    return false;
  }
}

/**
 * Upload a single message to Firestore
 * Updates conversation lastMessage info
 * 
 * @param message - Message to upload
 */
async function uploadMessageToFirestore(message: Message): Promise<void> {
  try {
    // Upload message document
    const messageRef = doc(db, 'messages', message.id);
    await setDoc(messageRef, {
      conversationId: message.conversationId,
      senderId: message.senderId,
      text: message.text,
      imageUrl: message.imageUrl || null,
      timestamp: message.timestamp,
      status: 'sent',
      readBy: message.readBy,
      createdAt: message.createdAt,
    });

    // Update conversation's lastMessage
    const conversationRef = doc(db, 'conversations', message.conversationId);
    await updateDoc(conversationRef, {
      lastMessage: message.text.substring(0, 100), // Preview
      lastMessageTime: message.timestamp,
      updatedAt: Date.now(),
    });

    console.log('[Sync] Message uploaded to Firestore:', message.id);
  } catch (error) {
    console.error('[Sync] Failed to upload message to Firestore:', error);
    throw error;
  }
}

/**
 * Sync a single pending message with retry logic
 * 
 * @param message - Message to sync
 * @param retryAttempt - Current retry attempt (0-based)
 * @returns True if sync successful, false otherwise
 */
async function syncMessage(
  message: Message,
  retryAttempt: number = 0
): Promise<boolean> {
  try {
    // Check if message already exists in Firestore
    const exists = await checkMessageExists(message.id);
    if (exists) {
      console.log('[Sync] Message already exists in Firestore, skipping:', message.id);
      await offlineQueueService.removeFromQueue(message.id);
      await updateMessageStatus(message.id, 'sent');
      return true;
    }

    // Upload to Firestore
    await uploadMessageToFirestore(message);

    // Update local status
    await updateMessageStatus(message.id, 'sent');

    // Remove from queue
    await offlineQueueService.removeFromQueue(message.id);

    return true;
  } catch (error) {
    console.error(`[Sync] Failed to sync message ${message.id} (attempt ${retryAttempt + 1}):`, error);

    // Increment retry count
    await offlineQueueService.incrementRetryCount(message.id);
    const retryCount = await offlineQueueService.getRetryCount(message.id);

    if (retryCount >= MAX_RETRIES) {
      // Mark as failed after max retries
      console.error(`[Sync] Message ${message.id} failed after ${MAX_RETRIES} attempts`);
      await updateMessageStatus(message.id, 'failed');
      return false;
    }

    // Schedule retry with exponential backoff
    if (retryAttempt < MAX_RETRIES - 1) {
      const delay = RETRY_DELAYS[retryAttempt + 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      console.log(`[Sync] Will retry message ${message.id} in ${delay}ms`);
      
      // Wait for delay before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry
      return syncMessage(message, retryAttempt + 1);
    }

    return false;
  }
}

/**
 * Sync all pending messages to Firestore
 * Processes messages in chronological order
 * Implements exponential backoff for retries
 */
export async function syncPendingMessages(): Promise<void> {
  // Check if already syncing
  if (isSyncing) {
    console.log('[Sync] Sync already in progress, skipping');
    return;
  }

  // Check if online
  if (!networkService.isOnline()) {
    console.log('[Sync] Device is offline, skipping sync');
    return;
  }

  try {
    isSyncing = true;
    console.log('[Sync] Starting sync process');

    // Get all pending messages
    const pendingMessages = await offlineQueueService.getPendingMessages();
    
    if (pendingMessages.length === 0) {
      console.log('[Sync] No pending messages to sync');
      return;
    }

    console.log(`[Sync] Found ${pendingMessages.length} pending messages`);

    // Process each message in order
    for (let i = 0; i < pendingMessages.length; i++) {
      const message = pendingMessages[i];
      
      // Notify callbacks - syncing
      notifyCallbacks(i + 1, pendingMessages.length, message.id, 'syncing');

      // Sync message
      const success = await syncMessage(message);

      // Notify callbacks - result
      notifyCallbacks(
        i + 1,
        pendingMessages.length,
        message.id,
        success ? 'success' : 'failed'
      );

      // If offline during sync, stop
      if (!networkService.isOnline()) {
        console.log('[Sync] Lost connection during sync, stopping');
        break;
      }
    }

    console.log('[Sync] Sync process completed');
  } catch (error) {
    console.error('[Sync] Sync process failed:', error);
  } finally {
    isSyncing = false;
  }
}

/**
 * Manually retry a specific failed message
 * 
 * @param messageId - ID of message to retry
 */
export async function retryMessage(messageId: string): Promise<boolean> {
  if (!networkService.isOnline()) {
    console.log('[Sync] Device is offline, cannot retry');
    return false;
  }

  try {
    // Get the message from pending queue
    const pendingMessages = await offlineQueueService.getPendingMessages();
    const message = pendingMessages.find(m => m.id === messageId);

    if (!message) {
      console.error('[Sync] Message not found in pending queue:', messageId);
      return false;
    }

    // Reset retry count and status
    await updateMessageStatus(messageId, 'pending');
    
    // Sync the message
    return await syncMessage(message, 0);
  } catch (error) {
    console.error('[Sync] Failed to retry message:', error);
    return false;
  }
}

/**
 * Subscribe to sync progress updates
 * 
 * @param callback - Callback function for progress updates
 * @returns Unsubscribe function
 */
export function subscribeSyncProgress(callback: SyncProgressCallback): () => void {
  syncCallbacks.add(callback);
  return () => {
    syncCallbacks.delete(callback);
  };
}

/**
 * Notify all sync callbacks
 */
function notifyCallbacks(
  current: number,
  total: number,
  messageId: string,
  status: 'syncing' | 'success' | 'failed'
): void {
  syncCallbacks.forEach(callback => {
    try {
      callback(current, total, messageId, status);
    } catch (error) {
      console.error('[Sync] Error in sync callback:', error);
    }
  });
}

/**
 * Check if sync is currently in progress
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}

export default {
  syncPendingMessages,
  retryMessage,
  subscribeSyncProgress,
  isSyncInProgress,
  checkMessageExists,
};

