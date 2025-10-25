/**
 * Smart Replies Service
 * 
 * Handles API calls and caching for context-aware smart replies
 */

import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { 
  GenerateSmartRepliesRequest, 
  GenerateSmartRepliesResponse,
  SmartRepliesService as ISmartRepliesService 
} from '../../types/ai';

/**
 * Smart Replies Service implementation
 */
export class SmartRepliesService implements ISmartRepliesService {
  private generateSmartRepliesCallable: any;

  constructor() {
    console.log('[SmartRepliesService] Initializing service...');
    // Initialize Cloud Function callable
    this.generateSmartRepliesCallable = httpsCallable(functions, 'generateSmartReplies');
    console.log('[SmartRepliesService] Service initialized with callable:', !!this.generateSmartRepliesCallable);
  }

  /**
   * Generate smart replies for a conversation
   * @param conversationId - ID of the conversation
   * @param userId - ID of the user requesting replies
   * @returns Promise with smart replies response
   */
  async generateReplies(
    conversationId: string, 
    userId: string
  ): Promise<GenerateSmartRepliesResponse> {
    try {
      console.log('[SmartRepliesService] generateReplies method called with:', { conversationId, userId });
      console.log('[SmartRepliesService] Generating smart replies for conversation:', conversationId, 'user:', userId);
      
      const request: GenerateSmartRepliesRequest = {
        conversationId,
        userId,
      };

      console.log('[SmartRepliesService] Calling Cloud Function with request:', request);
      const result = await this.generateSmartRepliesCallable(request);
      console.log('[SmartRepliesService] Cloud Function response:', result);
      return result.data as GenerateSmartRepliesResponse;
    } catch (error) {
      console.error('Error generating smart replies:', error);
      
      // Return fallback response on error
      return {
        replies: ["AI had a hard time fulfilling your request. Try again later."],
        conversationLanguage: 'unknown',
        conversationTone: 'neutral',
        tokensUsed: 0,
        cached: false,
      };
    }
  }

  /**
   * Get cached smart replies from conversation document
   * @param conversationId - ID of the conversation
   * @returns Promise with cached replies or null if not found/expired
   */
  async getCachedReplies(conversationId: string): Promise<string[] | null> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);

      if (!conversationDoc.exists()) {
        return null;
      }

      const data = conversationDoc.data();
      const cache = data.smartRepliesCache;

      if (!cache || !cache.replies || !Array.isArray(cache.replies)) {
        return null;
      }

      // Check if cache is still valid (less than 5 minutes old)
      const now = new Date();
      const cacheTime = cache.lastUpdated?.toDate();
      
      if (!cacheTime || (now.getTime() - cacheTime.getTime()) > 300000) { // 5 minutes
        return null;
      }

      return cache.replies;
    } catch (error) {
      console.error('Error getting cached replies:', error);
      return null;
    }
  }

  /**
   * Clear smart replies cache for a conversation
   * @param conversationId - ID of the conversation
   */
  async clearCache(conversationId: string): Promise<void> {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        smartRepliesCache: null,
      });
    } catch (error) {
      console.error('Error clearing smart replies cache:', error);
    }
  }

  /**
   * Check if smart replies are available for a conversation
   * @param conversationId - ID of the conversation
   * @returns Promise with boolean indicating if replies are available
   */
  async hasCachedReplies(conversationId: string): Promise<boolean> {
    const cached = await this.getCachedReplies(conversationId);
    return cached !== null && cached.length > 0;
  }

  /**
   * Get smart replies with fallback to generation if cache is empty
   * @param conversationId - ID of the conversation
   * @param userId - ID of the user requesting replies
   * @returns Promise with smart replies
   */
  async getSmartReplies(
    conversationId: string, 
    userId: string
  ): Promise<string[]> {
    // Try to get cached replies first
    const cached = await this.getCachedReplies(conversationId);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Generate new replies if cache is empty or expired
    const response = await this.generateReplies(conversationId, userId);
    return response.replies;
  }
}

// Export singleton instance
export const smartRepliesService = new SmartRepliesService();
