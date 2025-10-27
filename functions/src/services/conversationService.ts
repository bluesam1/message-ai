import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

export interface ConversationData {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  createdAt: number;
  updatedAt: number;
  type: 'direct' | 'group';
  title?: string;
  aiPrefs?: {
    [userId: string]: {
      autoTranslate: boolean;
      targetLang: string;
    };
  };
}

export class ConversationService {
  private static instance: ConversationService;
  private db: FirebaseFirestore.Firestore;

  private constructor() {
    this.db = getFirestore();
  }

  public static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService();
    }
    return ConversationService.instance;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<ConversationData | null> {
    try {
      const conversationDoc = await this.db.collection('conversations').doc(conversationId).get();
      
      if (!conversationDoc.exists) {
        return null;
      }

      const data = conversationDoc.data()!;
      return {
        id: conversationDoc.id,
        participants: data.participants || [],
        lastMessage: data.lastMessage,
        createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
        type: data.type || 'direct',
        title: data.title,
        aiPrefs: data.aiPrefs
      };
    } catch (error) {
      console.error('[ConversationService] Error getting conversation:', error);
      return null;
    }
  }

  /**
   * Get conversation participants
   */
  async getParticipants(conversationId: string): Promise<string[]> {
    try {
      const conversation = await this.getConversation(conversationId);
      return conversation?.participants || [];
    } catch (error) {
      console.error('[ConversationService] Error getting participants:', error);
      return [];
    }
  }

  /**
   * Update last message in conversation
   */
  async updateLastMessage(
    conversationId: string,
    lastMessage: {
      text: string;
      senderId: string;
      timestamp: number;
    }
  ): Promise<boolean> {
    try {
      await this.db.collection('conversations').doc(conversationId).update({
        lastMessage,
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.error('[ConversationService] Error updating last message:', error);
      return false;
    }
  }

  /**
   * Update conversation AI preferences for a user
   */
  async updateAIPreferences(
    conversationId: string,
    userId: string,
    preferences: {
      autoTranslate: boolean;
      targetLang: string;
    }
  ): Promise<boolean> {
    try {
      const conversationRef = this.db.collection('conversations').doc(conversationId);
      
      await conversationRef.update({
        [`aiPrefs.${userId}`]: preferences,
        updatedAt: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('[ConversationService] Error updating AI preferences:', error);
      return false;
    }
  }

  /**
   * Get AI preferences for a user in a conversation
   */
  async getAIPreferences(
    conversationId: string,
    userId: string
  ): Promise<{ autoTranslate: boolean; targetLang: string } | null> {
    try {
      const conversation = await this.getConversation(conversationId);
      
      if (!conversation?.aiPrefs?.[userId]) {
        return null;
      }

      return conversation.aiPrefs[userId];
    } catch (error) {
      console.error('[ConversationService] Error getting AI preferences:', error);
      return null;
    }
  }

  /**
   * Check if user is participant in conversation
   */
  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    try {
      const participants = await this.getParticipants(conversationId);
      return participants.includes(userId);
    } catch (error) {
      console.error('[ConversationService] Error checking participant:', error);
      return false;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    participants: string[],
    type: 'direct' | 'group' = 'direct',
    title?: string
  ): Promise<string | null> {
    try {
      const conversationData = {
        participants,
        type,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const docRef = await this.db.collection('conversations').add(conversationData);
      return docRef.id;
    } catch (error) {
      console.error('[ConversationService] Error creating conversation:', error);
      return null;
    }
  }

  /**
   * Update conversation title (for groups)
   */
  async updateTitle(conversationId: string, title: string): Promise<boolean> {
    try {
      await this.db.collection('conversations').doc(conversationId).update({
        title,
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.error('[ConversationService] Error updating title:', error);
      return false;
    }
  }

  /**
   * Add participant to conversation
   */
  async addParticipant(conversationId: string, userId: string): Promise<boolean> {
    try {
      const conversationRef = this.db.collection('conversations').doc(conversationId);
      
      await conversationRef.update({
        participants: admin.firestore.FieldValue.arrayUnion(userId),
        updatedAt: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('[ConversationService] Error adding participant:', error);
      return false;
    }
  }

  /**
   * Remove participant from conversation
   */
  async removeParticipant(conversationId: string, userId: string): Promise<boolean> {
    try {
      const conversationRef = this.db.collection('conversations').doc(conversationId);
      
      await conversationRef.update({
        participants: admin.firestore.FieldValue.arrayRemove(userId),
        updatedAt: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('[ConversationService] Error removing participant:', error);
      return false;
    }
  }
}

// Export singleton instance
export const conversationService = ConversationService.getInstance();
