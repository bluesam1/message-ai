/**
 * useMessages Hook
 * Custom hook for managing message state and real-time listeners
 * Uses Firestore offline persistence for automatic caching and optimistic updates
 * Automatically marks messages as read when conversation is viewed
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Unsubscribe } from 'firebase/firestore';
import { Message } from '../types/message';
import {
  sendMessage as sendMessageService,
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
   * Uses Firestore offline persistence for automatic caching
   */
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const loadMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        // Set up real-time listener (Firestore handles caching automatically)
        unsubscribe = listenToMessages(conversationId, (liveMessages) => {
          console.log(`[useMessages] 📨 Received ${liveMessages.length} messages from Firestore`);
          console.log(`[useMessages] 📊 Message statuses:`, liveMessages.map(m => ({ id: m.id, status: m.status, text: m.text.substring(0, 20) + '...' })));
          
          // Firestore offline persistence handles everything automatically
          // No need for complex temp message merging
          setMessages(liveMessages);
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
   * Firestore handles optimistic updates automatically with offline persistence
   * Always returns immediately to allow queuing multiple messages
   */
  const sendMessage = useCallback(
    async (text: string) => {
      console.log(`[useMessages] 📤 Sending message: "${text}"`);
      
      // Always return immediately for offline support
      // Firestore will queue the message if offline
      sendMessageService(
        conversationId,
        text,
        currentUserId
      ).then(() => {
        console.log(`[useMessages] ✅ Message sent successfully`);
      }).catch((err) => {
        console.error('[useMessages] ❌ Error sending message:', err);
        // Don't set error state - Firestore will retry automatically
        // The message will appear with "pending" status via the listener
      });
      
      // Return immediately to allow queuing multiple messages
      return Promise.resolve();
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

