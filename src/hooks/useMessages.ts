/**
 * useMessages Hook
 * Custom hook for managing message state and real-time listeners
 * Implements cache-first loading strategy and optimistic updates
 * Automatically marks messages as read when conversation is viewed
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Unsubscribe } from 'firebase/firestore';
import { Message } from '../types/message';
import {
  sendMessage as sendMessageService,
  loadCachedMessages,
  listenToMessages,
  retryMessage as retryMessageService,
} from '../services/messaging/messageService';
import { readReceiptService } from '../services/messaging/readReceiptService';
import { sortMessagesByTimestamp } from '../utils/messageUtils';

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  retryMessage: (message: Message) => Promise<void>;
  loadMore: () => Promise<void>;
}

/**
 * useMessages Hook
 * Manages message state for a conversation
 * 
 * @param {string} conversationId - Conversation ID
 * @param {string} currentUserId - Current user's ID
 * @returns {UseMessagesReturn} Message state and functions
 */
export default function useMessages(
  conversationId: string,
  currentUserId: string
): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load messages on mount
   * Cache-first strategy: Load from SQLite immediately, then set up Firestore listener
   */
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const loadMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        // Step 1: Load cached messages immediately (cache-first)
        const cachedMessages = await loadCachedMessages(conversationId);
        if (cachedMessages.length > 0) {
          const sorted = sortMessagesByTimestamp(cachedMessages).reverse();
          setMessages(sorted);
          setLoading(false);
        }

        // Step 2: Set up real-time listener for live updates
        unsubscribe = listenToMessages(conversationId, (liveMessages) => {
          // Use live messages directly from Firestore (already includes all messages)
          // The listener is already saving to SQLite, so we don't need to merge
          const sorted = sortMessagesByTimestamp(liveMessages).reverse();
          
          setMessages(sorted);
          setLoading(false);
        });
      } catch (err) {
        console.error('[useMessages] Error loading messages:', err);
        setError('Failed to load messages');
        setLoading(false);
      }
    };

    loadMessages();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversationId]);

  /**
   * Mark messages as read after viewing them for 1 second
   * Debounced to ensure messages are actually viewed
   */
  useEffect(() => {
    // Don't mark as read if still loading or no messages
    if (loading || messages.length === 0) {
      return;
    }

    // Delay marking as read by 1 second to ensure user is viewing the conversation
    const timer = setTimeout(async () => {
      try {
        // Get unread messages (messages not sent by current user and not already read)
        const unreadMessageIds = messages
          .filter((msg) => {
            const readBy = msg.readBy || [];
            return msg.senderId !== currentUserId && !readBy.includes(currentUserId);
          })
          .map((msg) => msg.id);

        if (unreadMessageIds.length > 0) {
          await readReceiptService.markMessagesAsRead(unreadMessageIds, currentUserId);
          console.log(`[useMessages] Marked ${unreadMessageIds.length} messages as read`);
        }
      } catch (err) {
        console.error('[useMessages] Error marking messages as read:', err);
        // Don't throw - read receipts are not critical
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [messages, currentUserId, loading]);

  /**
   * Send a message
   * Uses optimistic update - message appears immediately
   */
  const sendMessage = useCallback(
    async (text: string) => {
      try {
        // Create temporary message for optimistic update
        const tempMessage: Message = {
          id: `temp_${Date.now()}`,
          conversationId,
          senderId: currentUserId,
          text: text.trim(),
          imageUrl: null,
          timestamp: Date.now(),
          status: 'pending',
          readBy: [currentUserId],
          createdAt: Date.now(),
        };

        // Add to messages immediately (optimistic update)
        setMessages((prev) => [tempMessage, ...prev]);

        // Send message to backend
        await sendMessageService(
          conversationId,
          text,
          currentUserId
        );

        // Don't replace - let the Firestore listener handle it
        // This prevents conflicts with the real-time update
        // Remove the temp message
        setMessages((prev) => prev.filter(msg => msg.id !== tempMessage.id));
      } catch (err) {
        console.error('[useMessages] Error sending message:', err);
        
        // Update message status to failed
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id.startsWith('temp_') ? { ...msg, status: 'failed' as const } : msg
          )
        );
        
        throw err;
      }
    },
    [conversationId, currentUserId]
  );

  /**
   * Retry sending a failed message
   */
  const retryMessage = useCallback(async (message: Message) => {
    try {
      // Update status to pending
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, status: 'pending' as const } : msg
        )
      );

      // Retry sending
      const updatedMessage = await retryMessageService(message);

      // Update message with new status
      setMessages((prev) =>
        prev.map((msg) => (msg.id === message.id ? updatedMessage : msg))
      );
    } catch (err) {
      console.error('[useMessages] Error retrying message:', err);
      
      // Update status back to failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, status: 'failed' as const } : msg
        )
      );
    }
  }, []);

  /**
   * Load more messages (pagination)
   * For pull-to-refresh functionality
   */
  const loadMore = useCallback(async () => {
    // TODO: Implement pagination for loading older messages
    console.log('[useMessages] Load more messages (not yet implemented)');
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    retryMessage,
    loadMore,
  };
}

