/**
 * Message Deduplication Utilities
 * 
 * Provides functions to deduplicate messages and merge message lists
 * Prevents duplicate messages in the UI and database
 */

import { Message } from '../types/message';

/**
 * Remove duplicate messages from an array based on message ID
 * Keeps the first occurrence of each unique message
 * 
 * @param messages - Array of messages potentially containing duplicates
 * @returns Array of unique messages
 * 
 * @example
 * ```ts
 * const messages = [
 *   { id: '1', text: 'Hello' },
 *   { id: '2', text: 'World' },
 *   { id: '1', text: 'Hello' }, // Duplicate
 * ];
 * const unique = deduplicateMessages(messages); // Returns 2 messages
 * ```
 */
export function deduplicateMessages(messages: Message[]): Message[] {
  const seen = new Set<string>();
  const uniqueMessages: Message[] = [];

  for (const message of messages) {
    if (!seen.has(message.id)) {
      seen.add(message.id);
      uniqueMessages.push(message);
    }
  }

  return uniqueMessages;
}

/**
 * Merge two message lists, giving priority to live messages over cached ones
 * Live messages override cached messages with the same ID (fresher data)
 * 
 * @param cached - Messages from local SQLite cache
 * @param live - Messages from Firestore (live data)
 * @returns Merged and sorted array of messages
 * 
 * @example
 * ```ts
 * const cached = [{ id: '1', text: 'Old', status: 'pending' }];
 * const live = [{ id: '1', text: 'Old', status: 'sent' }];
 * const merged = mergeMessageLists(cached, live);
 * // Returns message with status: 'sent' (live data preferred)
 * ```
 */
export function mergeMessageLists(
  cached: Message[],
  live: Message[]
): Message[] {
  const messageMap = new Map<string, Message>();

  // Add cached messages first
  for (const message of cached) {
    messageMap.set(message.id, message);
  }

  // Live messages override cached (fresher data)
  for (const message of live) {
    messageMap.set(message.id, message);
  }

  // Convert map to array and sort by timestamp (oldest first)
  return Array.from(messageMap.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  );
}

/**
 * Check if a message already exists in a list
 * 
 * @param messages - Array of messages to search
 * @param messageId - ID of message to find
 * @returns True if message exists in the list
 */
export function messageExists(messages: Message[], messageId: string): boolean {
  return messages.some(m => m.id === messageId);
}

/**
 * Filter out messages that already exist in the existing list
 * Useful for adding only new messages from a sync operation
 * 
 * @param existingMessages - Current messages in the UI/cache
 * @param newMessages - New messages from sync/fetch
 * @returns Only messages that don't already exist
 */
export function getNewMessages(
  existingMessages: Message[],
  newMessages: Message[]
): Message[] {
  const existingIds = new Set(existingMessages.map(m => m.id));
  return newMessages.filter(m => !existingIds.has(m.id));
}

/**
 * Merge new messages into existing list, maintaining sort order
 * Deduplicates and sorts by timestamp
 * 
 * @param existingMessages - Current messages
 * @param newMessages - New messages to add
 * @returns Combined, deduplicated, and sorted message list
 */
export function mergeNewMessages(
  existingMessages: Message[],
  newMessages: Message[]
): Message[] {
  const combined = [...existingMessages, ...newMessages];
  const deduplicated = deduplicateMessages(combined);
  return deduplicated.sort((a, b) => a.timestamp - b.timestamp);
}

export default {
  deduplicateMessages,
  mergeMessageLists,
  messageExists,
  getNewMessages,
  mergeNewMessages,
};

