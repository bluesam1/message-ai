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
          setMessages((prevMessages) => {
            // Keep temp messages that aren't yet in Firestore
            // Match by content to handle cases where temp message was updated with real ID
            const tempMessages = prevMessages.filter(msg => {
              if (!msg.id.startsWith('temp_')) return false;
              
              // Check if this temp message now exists in Firestore (by content matching)
              const matchInFirestore = liveMessages.find(liveMsg =>
                liveMsg.senderId === msg.senderId &&
                liveMsg.text === msg.text &&
                Math.abs(liveMsg.timestamp - msg.timestamp) < 5000 // Within 5 seconds
              );
              
              return !matchInFirestore; // Keep if no match found
            });
            
            // Combine temp messages with live messages from Firestore
            const allMessages = [...tempMessages, ...liveMessages];
            
            // Sort by timestamp (newest first for chat display)
            return sortMessagesByTimestamp(allMessages).reverse();
          });
          
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
   * Uses optimistic update - message appears immediately with status indicator
   */
  const sendMessage = useCallback(
    async (text: string) => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Create temporary message for optimistic update
        const tempMessage: Message = {
          id: tempId,
          conversationId,
          senderId: currentUserId,
          text: text.trim(),
          imageUrl: null,
          timestamp: Date.now(),
          status: 'pending', // Show clock icon
          readBy: [currentUserId],
          createdAt: Date.now(),
        };

        // Add to messages immediately (optimistic update)
        setMessages((prev) => [tempMessage, ...prev]);

        // Send message to backend (Firestore queues it automatically)
        await sendMessageService(
          conversationId,
          text,
          currentUserId
        );

        // Update status to 'sent' - show checkmark
        // The real message will come from Firestore listener and replace this temp one
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, status: 'sent' as const } : msg
          )
        );
      } catch (err) {
        console.error('[useMessages] Error sending message:', err);
        
        // Update status to 'failed' - show red alert icon
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, status: 'failed' as const } : msg
          )
        );
        
        // Don't throw - allow user to retry
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

