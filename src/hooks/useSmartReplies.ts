/**
 * React hook for smart replies state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SmartRepliesService, SmartRepliesState } from '../services/ai/smartRepliesService';
import { RefreshSmartRepliesService } from '../services/ai/refreshSmartRepliesService';

export interface UseSmartRepliesOptions {
  conversationId: string;
  userId: string;
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export interface UseSmartRepliesReturn {
  // State
  replies: string[];
  loading: boolean;
  error: string | null;
  generatedAt: number | null;
  contextAnalysis: SmartRepliesState['contextAnalysis'];
  
  // Actions
  refresh: () => Promise<void>;
  clearError: () => void;
  generateReplies: () => Promise<void>;
  clearReplies: () => void;
  refreshReplies: () => Promise<void>;
  manualRefresh: () => Promise<void>; // New manual refresh function
  
  // Status
  hasReplies: boolean;
  isExpired: boolean;
  needsRefresh: boolean;
  age: number; // in minutes
}

/**
 * Hook for managing smart replies state
 */
export function useSmartReplies({
  conversationId,
  userId,
  enabled = true,
  autoRefresh = true,
  refreshInterval = 5 * 60 * 1000 // 5 minutes
}: UseSmartRepliesOptions): UseSmartRepliesReturn {
  const [state, setState] = useState<SmartRepliesState>({
    replies: [],
    loading: true,
    error: null,
    generatedAt: null,
    contextAnalysis: null
  });

  const smartRepliesService = useRef(new SmartRepliesService());
  const refreshSmartRepliesService = useRef(new RefreshSmartRepliesService());
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubscribedRef = useRef(false);

  /**
   * Refresh smart replies
   */
  const refresh = useCallback(async () => {
    if (!enabled || !conversationId || !userId) {
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const newState = await smartRepliesService.current.getSmartReplies(
        conversationId,
        userId
      );
      
      setState(newState);
    } catch (error) {
      console.error('Failed to refresh smart replies:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh smart replies'
      }));
    }
  }, [enabled, conversationId, userId]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Manually refresh smart replies by triggering server-side generation
   */
  const manualRefresh = useCallback(async () => {
    if (!enabled || !conversationId || !userId) {
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await refreshSmartRepliesService.current.refreshSmartReplies(
        conversationId,
        userId
      );

      if (result.success) {
        // Update state with new replies
        setState(prev => ({
          ...prev,
          replies: result.replies || [],
          contextAnalysis: result.contextAnalysis ? {
            ...result.contextAnalysis,
            tone: result.contextAnalysis.tone as 'auto' | 'formal' | 'casual'
          } : null,
          generatedAt: Date.now(),
          loading: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Failed to refresh smart replies'
        }));
      }
    } catch (error) {
      console.error('Failed to manually refresh smart replies:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh smart replies'
      }));
    }
  }, [enabled, conversationId, userId]);

  /**
   * Set up auto-refresh
   */
  const setupAutoRefresh = useCallback(() => {
    if (!autoRefresh || !enabled) {
      return;
    }

    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Set up new timeout
    refreshTimeoutRef.current = setTimeout(() => {
      refresh();
    }, refreshInterval) as any;
  }, [autoRefresh, enabled, refreshInterval, refresh]);

  /**
   * Subscribe to smart replies updates
   */
  const subscribe = useCallback(() => {
    if (!enabled || !conversationId || !userId || isSubscribedRef.current) {
      return;
    }

    isSubscribedRef.current = true;
    
    const unsubscribe = smartRepliesService.current.subscribeToSmartReplies(
      conversationId,
      userId,
      (newState) => {
        setState(newState);
        
        // Set up auto-refresh if needed
        if (autoRefresh && newState.replies.length > 0) {
          setupAutoRefresh();
        }
      }
    );

    return unsubscribe;
  }, [enabled, conversationId, userId, autoRefresh, setupAutoRefresh]);

  /**
   * Unsubscribe from smart replies updates
   */
  const unsubscribe = useCallback(() => {
    if (isSubscribedRef.current) {
      smartRepliesService.current.unsubscribeFromSmartReplies(conversationId, userId);
      isSubscribedRef.current = false;
    }
  }, [conversationId, userId]);

  // Set up subscription on mount and when dependencies change
  useEffect(() => {
    if (enabled) {
      const unsubscribe = subscribe();
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } else {
      unsubscribe();
    }
  }, [enabled, subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [unsubscribe]);

  // Initial load
  useEffect(() => {
    if (enabled) {
      refresh();
    }
  }, [enabled, refresh]);

  // Computed values
  const hasReplies = state.replies.length > 0;
  const isExpired = state.generatedAt ? 
    (Date.now() - state.generatedAt) > (24 * 60 * 60 * 1000) : false; // 24 hours
  const needsRefresh = state.generatedAt ? 
    (Date.now() - state.generatedAt) > (60 * 60 * 1000) : false; // 1 hour
  const age = state.generatedAt ? 
    Math.floor((Date.now() - state.generatedAt) / (1000 * 60)) : 0; // in minutes

  return {
    // State
    replies: state.replies,
    loading: state.loading,
    error: state.error,
    generatedAt: state.generatedAt,
    contextAnalysis: state.contextAnalysis,
    
    // Actions
    refresh,
    clearError,
    generateReplies: refresh, // Alias for refresh
    clearReplies: clearError, // Alias for clearError
    refreshReplies: manualRefresh, // Alias for manualRefresh (triggers RAG pipeline)
    manualRefresh, // Manual refresh function
    
    // Status
    hasReplies,
    isExpired,
    needsRefresh,
    age
  };
}

/**
 * Hook for smart replies with manual refresh only
 */
export function useSmartRepliesManual({
  conversationId,
  userId,
  enabled = true
}: Omit<UseSmartRepliesOptions, 'autoRefresh' | 'refreshInterval'>): UseSmartRepliesReturn {
  return useSmartReplies({
    conversationId,
    userId,
    enabled,
    autoRefresh: false
  });
}

/**
 * Hook for smart replies with custom refresh interval
 */
export function useSmartRepliesWithInterval({
  conversationId,
  userId,
  enabled = true,
  refreshInterval = 5 * 60 * 1000
}: UseSmartRepliesOptions): UseSmartRepliesReturn {
  return useSmartReplies({
    conversationId,
    userId,
    enabled,
    autoRefresh: true,
    refreshInterval
  });
}