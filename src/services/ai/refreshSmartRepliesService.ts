/**
 * Client service for manually refreshing smart replies
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

interface RefreshSmartRepliesRequest {
  conversationId: string;
  userId: string;
}

interface RefreshSmartRepliesResponse {
  success: boolean;
  message?: string;
  replies?: string[];
  contextAnalysis?: {
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    entities: string[];
    language: string;
    tone: string;
    messageCount: number;
    analyzedAt: number;
  };
  error?: string;
}

/**
 * Service for manually refreshing smart replies
 */
export class RefreshSmartRepliesService {
  private functions = getFunctions();

  /**
   * Manually refresh smart replies for a conversation
   */
  async refreshSmartReplies(
    conversationId: string,
    userId: string
  ): Promise<RefreshSmartRepliesResponse> {
    try {
      const refreshSmartReplies = httpsCallable<RefreshSmartRepliesRequest, RefreshSmartRepliesResponse>(
        this.functions,
        'refreshSmartReplies'
      );

      const result = await refreshSmartReplies({
        conversationId,
        userId
      });

      return result.data;
    } catch (error) {
      console.error('Failed to refresh smart replies:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh smart replies'
      };
    }
  }
}
