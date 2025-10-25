/**
 * Tone Adjustment Service
 * 
 * Handles API calls for formality adjustment and rephrase functionality
 */

import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { 
  RephraseMessageRequest, 
  RephraseMessageResponse,
  RephraseHistory,
  ToneAdjustmentService as IToneAdjustmentService 
} from '../../types/ai';

/**
 * Tone Adjustment Service implementation
 */
export class ToneAdjustmentService implements IToneAdjustmentService {
  private rephraseMessageCallable: any;

  constructor() {
    // Initialize Cloud Function callable
    this.rephraseMessageCallable = httpsCallable(functions, 'rephraseMessage');
  }

  /**
   * Rephrase a message to be more formal or casual
   * @param text - Original message text
   * @param tone - Target tone ('formal' or 'casual')
   * @returns Promise with rephrased message response
   */
  async rephraseMessage(
    text: string, 
    tone: 'formal' | 'casual'
  ): Promise<RephraseMessageResponse> {
    try {
      console.log('[ToneAdjustmentService] Rephrasing message:', { text, tone });
      
      const request: RephraseMessageRequest = {
        text,
        tone,
      };

      console.log('[ToneAdjustmentService] Calling Cloud Function with request:', request);
      const result = await this.rephraseMessageCallable(request);
      console.log('[ToneAdjustmentService] Cloud Function response:', result);
      return result.data as RephraseMessageResponse;
    } catch (error) {
      console.error('Error rephrasing message:', error);
      
      // Return fallback response on error
      return {
        rephrasedText: text, // Return original text on error
        originalText: text,
        tone: tone,
        tokensUsed: 0,
      };
    }
  }

  /**
   * Save rephrase history to a message's aiMeta
   * @param messageId - ID of the message
   * @param history - Rephrase history to save
   */
  async saveRephraseHistory(
    messageId: string, 
    history: RephraseHistory
  ): Promise<void> {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        'aiMeta.rephraseHistory': history,
      });
    } catch (error) {
      console.error('Error saving rephrase history:', error);
    }
  }

  /**
   * Get rephrase history from a message
   * @param messageId - ID of the message
   * @returns Promise with rephrase history or null if not found
   */
  async getRephraseHistory(messageId: string): Promise<RephraseHistory | null> {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);

      if (!messageDoc.exists()) {
        return null;
      }

      const data = messageDoc.data();
      return data.aiMeta?.rephraseHistory || null;
    } catch (error) {
      console.error('Error getting rephrase history:', error);
      return null;
    }
  }

  /**
   * Rephrase message and save history
   * @param text - Original message text
   * @param tone - Target tone ('formal' or 'casual')
   * @param messageId - Optional message ID to save history
   * @returns Promise with rephrased message response
   */
  async rephraseAndSave(
    text: string, 
    tone: 'formal' | 'casual',
    messageId?: string
  ): Promise<RephraseMessageResponse> {
    const response = await this.rephraseMessage(text, tone);

    // Save history if messageId is provided
    if (messageId && response.rephrasedText !== text) {
      const history: RephraseHistory = {
        original: text,
        [tone]: response.rephrasedText,
      };

      await this.saveRephraseHistory(messageId, history);
    }

    return response;
  }

  /**
   * Check if a message has been rephrased before
   * @param messageId - ID of the message
   * @returns Promise with boolean indicating if message has rephrase history
   */
  async hasRephraseHistory(messageId: string): Promise<boolean> {
    const history = await this.getRephraseHistory(messageId);
    return history !== null;
  }

  /**
   * Get existing rephrase for a specific tone
   * @param messageId - ID of the message
   * @param tone - Tone to get rephrase for
   * @returns Promise with existing rephrase or null if not found
   */
  async getExistingRephrase(
    messageId: string, 
    tone: 'formal' | 'casual'
  ): Promise<string | null> {
    const history = await this.getRephraseHistory(messageId);
    if (!history) {
      return null;
    }

    return history[tone] || null;
  }
}

// Export singleton instance
export const toneAdjustmentService = new ToneAdjustmentService();
