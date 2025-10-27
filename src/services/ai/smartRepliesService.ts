/**
 * Client service for fetching smart replies from Firestore
 */

import { getFirestore, doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { SmartReplies } from '../../../functions/src/types/rag';

export interface SmartRepliesState {
  replies: string[];
  loading: boolean;
  error: string | null;
  generatedAt: number | null;
  contextAnalysis: {
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    entities: string[];
    language: string;
    tone: 'formal' | 'casual' | 'auto';
    messageCount: number;
    analyzedAt: number;
  } | null;
}

/**
 * Smart replies service for client-side integration
 */
export class SmartRepliesService {
  private db = getFirestore();
  private listeners: Map<string, Unsubscribe> = new Map();

  /**
   * Gets smart replies for a conversation and user
   */
  async getSmartReplies(
    conversationId: string,
    userId: string
  ): Promise<SmartRepliesState> {
    try {
      const smartRepliesId = `${conversationId}_${userId}`;
      const smartRepliesDoc = doc(this.db, 'smartReplies', smartRepliesId);
      const smartRepliesSnapshot = await getDoc(smartRepliesDoc);

      if (!smartRepliesSnapshot.exists()) {
        return {
          replies: [],
          loading: false,
          error: null,
          generatedAt: null,
          contextAnalysis: null
        };
      }

      const data = smartRepliesSnapshot.data() as SmartReplies;
      
      return {
        replies: data.replies || [],
        loading: false,
        error: null,
        generatedAt: data.generatedAt,
        contextAnalysis: data.contextAnalysis
      };
    } catch (error) {
      console.error('Failed to get smart replies:', error);
      return {
        replies: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load smart replies',
        generatedAt: null,
        contextAnalysis: null
      };
    }
  }

  /**
   * Subscribes to smart replies updates for a conversation and user
   */
  subscribeToSmartReplies(
    conversationId: string,
    userId: string,
    onUpdate: (state: SmartRepliesState) => void
  ): () => void {
    const smartRepliesId = `${conversationId}_${userId}`;
    
    // Remove existing listener if any
    this.unsubscribeFromSmartReplies(conversationId, userId);

    const smartRepliesDoc = doc(this.db, 'smartReplies', smartRepliesId);
    
    const unsubscribe = onSnapshot(
      smartRepliesDoc,
      (snapshot) => {
        if (!snapshot.exists()) {
          onUpdate({
            replies: [],
            loading: false,
            error: null,
            generatedAt: null,
            contextAnalysis: null
          });
          return;
        }

        const data = snapshot.data() as SmartReplies;
        
        onUpdate({
          replies: data.replies || [],
          loading: false,
          error: null,
          generatedAt: data.generatedAt,
          contextAnalysis: data.contextAnalysis
        });
      },
      (error) => {
        console.error('Smart replies subscription error:', error);
        onUpdate({
          replies: [],
          loading: false,
          error: error.message,
          generatedAt: null,
          contextAnalysis: null
        });
      }
    );

    this.listeners.set(smartRepliesId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Unsubscribes from smart replies updates
   */
  unsubscribeFromSmartReplies(conversationId: string, userId: string): void {
    const smartRepliesId = `${conversationId}_${userId}`;
    const unsubscribe = this.listeners.get(smartRepliesId);
    
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(smartRepliesId);
    }
  }

  /**
   * Unsubscribes from all smart replies listeners
   */
  unsubscribeFromAllSmartReplies(): void {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }

  /**
   * Checks if smart replies are expired
   */
  isExpired(smartReplies: SmartReplies): boolean {
    if (!smartReplies.expiresAt) {
      return false; // No expiration set
    }
    
    return Date.now() > smartReplies.expiresAt;
  }

  /**
   * Gets the age of smart replies in minutes
   */
  getAge(smartReplies: SmartReplies): number {
    if (!smartReplies.generatedAt) {
      return 0;
    }
    
    return Math.floor((Date.now() - smartReplies.generatedAt) / (1000 * 60));
  }

  /**
   * Checks if smart replies need refresh (older than 1 hour)
   */
  needsRefresh(smartReplies: SmartReplies): boolean {
    return this.getAge(smartReplies) > 60; // 1 hour
  }

  /**
   * Formats smart replies for display
   */
  formatReplies(replies: string[]): string[] {
    return replies.map(reply => reply.trim()).filter(reply => reply.length > 0);
  }

  /**
   * Gets smart replies summary for debugging
   */
  getSummary(smartReplies: SmartReplies): {
    id: string;
    conversationId: string;
    userId: string;
    repliesCount: number;
    age: number;
    expired: boolean;
    needsRefresh: boolean;
    contextAnalysis: any;
  } {
    return {
      id: smartReplies.id,
      conversationId: smartReplies.conversationId,
      userId: smartReplies.userId,
      repliesCount: smartReplies.replies.length,
      age: this.getAge(smartReplies),
      expired: this.isExpired(smartReplies),
      needsRefresh: this.needsRefresh(smartReplies),
      contextAnalysis: smartReplies.contextAnalysis
    };
  }
}