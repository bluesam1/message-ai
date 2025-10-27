import { getFirestore } from 'firebase-admin/firestore';
import { MessageContext } from '../types/rag';

export class MessageService {
  private static instance: MessageService;
  private db: FirebaseFirestore.Firestore;

  private constructor() {
    this.db = getFirestore();
  }

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  /**
   * Get recent messages from a conversation
   */
  async getRecentMessages(
    conversationId: string,
    limit: number = 30
  ): Promise<MessageContext[]> {
    const messagesSnapshot = await this.db
      .collection('messages')
      .where('conversationId', '==', conversationId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const messages: MessageContext[] = [];
    
    messagesSnapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        text: data.text || '',
        senderId: data.senderId || '',
        timestamp: data.timestamp?.toMillis?.() || data.timestamp || Date.now(),
        relevanceScore: 0,
        language: data.language || 'en',
        tone: data.tone || 'neutral'
      });
    });

    return messages.reverse(); // Return in chronological order
  }

  /**
   * Get a specific message by ID
   */
  async getMessageById(messageId: string): Promise<MessageContext | null> {
    try {
      const messageDoc = await this.db.collection('messages').doc(messageId).get();
      
      if (!messageDoc.exists) {
        return null;
      }

      const data = messageDoc.data()!;
      return {
        id: messageDoc.id,
        text: data.text || '',
        senderId: data.senderId || '',
        timestamp: data.timestamp?.toMillis?.() || data.timestamp || Date.now(),
        relevanceScore: 0,
        language: data.language || 'en',
        tone: data.tone || 'neutral'
      };
    } catch (error) {
      console.error('[MessageService] Error getting message by ID:', error);
      return null;
    }
  }

  /**
   * Save a message to Firestore
   */
  async saveMessage(messageData: any): Promise<string> {
    try {
      const docRef = await this.db.collection('messages').add(messageData);
      return docRef.id;
    } catch (error) {
      console.error('[MessageService] Error saving message:', error);
      throw error;
    }
  }

  /**
   * Get messages by conversation with pagination
   */
  async getMessagesByConversation(
    conversationId: string,
    limit: number = 50,
    startAfter?: string
  ): Promise<{ messages: MessageContext[]; lastDocId?: string }> {
    try {
      let query = this.db
        .collection('messages')
        .where('conversationId', '==', conversationId)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      if (startAfter) {
        const startAfterDoc = await this.db.collection('messages').doc(startAfter).get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }

      const snapshot = await query.get();
      const messages: MessageContext[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          text: data.text || '',
          senderId: data.senderId || '',
          timestamp: data.timestamp?.toMillis?.() || data.timestamp || Date.now(),
          relevanceScore: 0,
          language: data.language || 'en',
          tone: data.tone || 'neutral'
        });
      });

      const lastDocId = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : undefined;

      return {
        messages: messages.reverse(), // Return in chronological order
        lastDocId
      };
    } catch (error) {
      console.error('[MessageService] Error getting messages by conversation:', error);
      throw error;
    }
  }

  /**
   * Get message count for a conversation
   */
  async getMessageCount(conversationId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection('messages')
        .where('conversationId', '==', conversationId)
        .get();
      
      return snapshot.size;
    } catch (error) {
      console.error('[MessageService] Error getting message count:', error);
      return 0;
    }
  }

  /**
   * Update message metadata
   */
  async updateMessageMetadata(
    messageId: string,
    metadata: Partial<{
      language: string;
      tone: string;
      relevanceScore: number;
    }>
  ): Promise<boolean> {
    try {
      await this.db.collection('messages').doc(messageId).update(metadata);
      return true;
    } catch (error) {
      console.error('[MessageService] Error updating message metadata:', error);
      return false;
    }
  }
}

// Export singleton instance
export const messageService = MessageService.getInstance();
