/**
 * useSmartReplies Hook
 * 
 * Manages smart replies state and API calls with debouncing
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { smartRepliesService } from '../services/ai/smartRepliesService';
import { debounceSmartReplies } from '../utils/debounce';
import { UseSmartRepliesReturn } from '../types/ai';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';

interface UseSmartRepliesOptions {
  conversationId: string;
  userId: string;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Hook for managing smart replies functionality
 * @param options - Configuration options
 * @returns Smart replies state and methods
 */
export function useSmartReplies({
  conversationId,
  userId,
  enabled = true,
  debounceMs = 2000,
}: UseSmartRepliesOptions): UseSmartRepliesReturn {
  const [replies, setReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track if we're currently generating replies
  const isGeneratingRef = useRef(false);
  
  // Ref to store the current conversation ID to avoid stale closures
  const conversationIdRef = useRef(conversationId);
  const userIdRef = useRef(userId);

  // Update refs when props change
  useEffect(() => {
    conversationIdRef.current = conversationId;
    userIdRef.current = userId;
  }, [conversationId, userId]);

  /**
   * Generate smart replies with debouncing
   */
  const generateReplies = useCallback(async () => {
    if (!enabled || isGeneratingRef.current) {
      console.log('[useSmartReplies] Skipping generation - enabled:', enabled, 'isGenerating:', isGeneratingRef.current);
      return;
    }

    try {
      console.log('[useSmartReplies] Starting smart replies generation for conversation:', conversationIdRef.current, 'user:', userIdRef.current);
      setLoading(true);
      setError(null);
      isGeneratingRef.current = true;

      const response = await smartRepliesService.generateReplies(
        conversationIdRef.current,
        userIdRef.current
      );
      console.log('[useSmartReplies] Service response:', response);

      if (response.replies && response.replies.length > 0) {
        setReplies(response.replies);
      } else {
        setReplies([]);
      }
    } catch (err) {
      console.error('Error generating smart replies:', err);
      setError('Failed to generate smart replies');
      setReplies([]);
    } finally {
      setLoading(false);
      isGeneratingRef.current = false;
    }
  }, [enabled]);

  /**
   * Debounced version of generateReplies
   */
  const debouncedGenerateReplies = useCallback(
    debounceSmartReplies(generateReplies),
    [generateReplies]
  );

  /**
   * Clear replies and reset state
   */
  const clearReplies = useCallback(() => {
    setReplies([]);
    setError(null);
    setLoading(false);
  }, []);

  /**
   * Get cached replies if available
   */
  const getCachedReplies = useCallback(async () => {
    if (!enabled) {
      return;
    }

    try {
      const cached = await smartRepliesService.getCachedReplies(conversationId);
      if (cached && cached.length > 0) {
        setReplies(cached);
        return true; // Found cached replies
      }
    } catch (err) {
      console.error('Error getting cached replies:', err);
    }
    
    return false; // No cached replies found
  }, [conversationId, enabled]);

  /**
   * Get smart replies with fallback to generation
   */
  const getSmartReplies = useCallback(async () => {
    if (!enabled) {
      return;
    }

    // Try to get cached replies first
    const hasCached = await getCachedReplies();
    if (hasCached) {
      return;
    }

    // Generate new replies if no cache
    await generateReplies();
  }, [enabled, getCachedReplies, generateReplies]);

  /**
   * Refresh replies by clearing cache and generating new ones
   */
  const refreshReplies = useCallback(async () => {
    if (!enabled) {
      return;
    }

    try {
      await smartRepliesService.clearCache(conversationId);
      await generateReplies();
    } catch (err) {
      console.error('Error refreshing replies:', err);
      setError('Failed to refresh replies');
    }
  }, [enabled, conversationId, generateReplies]);

  // Auto-generate replies when conversation changes
  useEffect(() => {
    if (enabled && conversationId) {
      getSmartReplies();
    }
  }, [conversationId, enabled, getSmartReplies]);

  // Listen for new messages and regenerate replies
  useEffect(() => {
    if (!enabled || !conversationId) {
      return;
    }

    console.log('[useSmartReplies] Setting up message listener for conversation:', conversationId);
    
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(1) // Only listen to the most recent message
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        console.log('[useSmartReplies] New message detected, regenerating replies');
        // Debounce the regeneration to avoid too many API calls
        debouncedGenerateReplies();
      }
    }, (error) => {
      console.error('[useSmartReplies] Error listening to messages:', error);
    });

    return () => {
      console.log('[useSmartReplies] Cleaning up message listener');
      unsubscribe();
    };
  }, [enabled, conversationId, debouncedGenerateReplies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isGeneratingRef.current = false;
    };
  }, []);

  return {
    replies,
    loading,
    error,
    generateReplies: debouncedGenerateReplies,
    clearReplies,
    refreshReplies,
    getCachedReplies,
    getSmartReplies,
  };
}
