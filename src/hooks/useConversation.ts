/**
 * useConversation Hook
 * Custom hook for managing conversation metadata
 * Fetches conversation details and participant information
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Conversation } from '../types/message';
import { User } from '../types/user';
import { getConversationById } from '../services/messaging/conversationService';

interface UseConversationReturn {
  conversation: Conversation | null;
  otherParticipant: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * useConversation Hook
 * Fetches conversation metadata and participant information
 * 
 * @param {string} conversationId - Conversation ID
 * @param {string} currentUserId - Current user's ID
 * @returns {UseConversationReturn} Conversation state
 */
export default function useConversation(
  conversationId: string,
  currentUserId: string
): UseConversationReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConversation = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch conversation
        const conv = await getConversationById(conversationId);
        
        if (!conv) {
          throw new Error('Conversation not found');
        }

        setConversation(conv);

        // For direct conversations, fetch other participant's data
        if (conv.type === 'direct') {
          const otherParticipantId = conv.participants.find(
            (id) => id !== currentUserId
          );

          if (otherParticipantId) {
            // Fetch user data
            const usersRef = collection(db, 'users');
            const userQuery = query(
              usersRef,
              where('uid', '==', otherParticipantId)
            );
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              const user: User = {
                uid: userData.uid,
                email: userData.email,
                displayName: userData.displayName,
                photoURL: userData.photoURL || null,
                createdAt: userData.createdAt?.toMillis() || Date.now(),
                lastSeen: userData.lastSeen?.toMillis() || Date.now(),
              };

              setOtherParticipant(user);
            }
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('[useConversation] Error loading conversation:', err);
        setError('Failed to load conversation');
        setLoading(false);
      }
    };

    loadConversation();
  }, [conversationId, currentUserId]);

  return {
    conversation,
    otherParticipant,
    loading,
    error,
  };
}

