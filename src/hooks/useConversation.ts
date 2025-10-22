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
  participants: Record<string, User>; // Map of participant IDs to User objects
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
  const [participants, setParticipants] = useState<Record<string, User>>({});
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

        // Fetch all participant data (excluding current user)
        const otherParticipantIds = conv.participants.filter(
          (id) => id !== currentUserId
        );

        if (otherParticipantIds.length > 0) {
          // Fetch all users at once using 'in' query
          const usersRef = collection(db, 'users');
          const userQuery = query(
            usersRef,
            where('uid', 'in', otherParticipantIds)
          );
          const userSnapshot = await getDocs(userQuery);

          const participantsMap: Record<string, User> = {};
          
          userSnapshot.docs.forEach((doc) => {
            const userData = doc.data();
            console.log('[useConversation] Fetched user data:', {
              uid: userData.uid,
              email: userData.email,
              displayName: userData.displayName,
              hasPhotoURL: !!userData.photoURL,
              lastSeenType: typeof userData.lastSeen,
            });
            
            // Helper to convert Firestore timestamp to milliseconds
            const toMillis = (timestamp: any): number => {
              if (!timestamp) return Date.now();
              if (typeof timestamp === 'number') return timestamp;
              if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
              if (timestamp.seconds) return timestamp.seconds * 1000;
              return Date.now();
            };
            
            const user: User = {
              uid: userData.uid,
              email: userData.email || '',
              displayName: userData.displayName || userData.email || 'User',
              photoURL: userData.photoURL || null,
              online: userData.online || false,
              lastSeen: toMillis(userData.lastSeen),
              createdAt: toMillis(userData.createdAt),
            };
            participantsMap[user.uid] = user;
          });

          // Create placeholder entries for any users not found in Firestore
          otherParticipantIds.forEach((userId) => {
            if (!participantsMap[userId]) {
              console.warn(`[useConversation] User ${userId} not found in Firestore, creating placeholder`);
              participantsMap[userId] = {
                uid: userId,
                email: '',
                displayName: 'Unknown User',
                photoURL: null,
                online: false,
                lastSeen: Date.now(),
                createdAt: Date.now(),
              };
            }
          });

          setParticipants(participantsMap);

          // For direct conversations, set the single other participant
          if (conv.type === 'direct' && otherParticipantIds.length === 1) {
            setOtherParticipant(participantsMap[otherParticipantIds[0]] || null);
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
    participants,
    loading,
    error,
  };
}

