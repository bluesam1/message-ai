/**
 * useMessages Hook
 * Custom hook for managing message state and real-time listeners
 * Implements cache-first loading strategy and optimistic updates
 */

import { useState, useEffect, useCallback } from 'react';
import { Unsubscribe } from 'firebase/firestore';
import { Message } from '../types/message';
import {
  sendMessage as sendMessageService,
  loadCachedMessages,
  listenToMessages,
  retryMessage as retryMessageService,
} from '../services/messaging/messageService';
import { sortMessagesByTimestamp } from '../utils/messageUtils';
import { mergeMessageLists } from '../utils/messageDeduplication';

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
          // Merge cached and live messages (live messages override cached)
          const mergedMessages = mergeMessageLists(cachedMessages, liveMessages);
          const sorted = sortMessagesByTimestamp(mergedMessages).reverse();
          
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
        const sentMessage = await sendMessageService(
          conversationId,
          text,
          currentUserId
        );

        // Replace temp message with actual message
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempMessage.id ? sentMessage : msg))
        );
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

