/**
 * Batch Translate Messages
 * 
 * Triggered when a user enables auto-translate for a conversation.
 * Translates recent messages (last 50) that haven't been translated yet.
 * 
 * This ensures users immediately see translations for existing messages
 * when they enable the feature.
 */

import * as functions from 'firebase-functions';
import { translationService } from '../services/translationService';
import { messageService } from '../services/messageService';

// OpenAI initialization is now handled by utility functions


/**
 * Batch Translate Recent Messages
 * 
 * Triggered when conversation.aiPrefs is updated
 * Checks if a user enabled auto-translate and translates recent messages
 */
export const batchTranslateMessages = functions.firestore
  .document('conversations/{conversationId}')
  .onUpdate(async (change, context) => {
    const { conversationId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Check if aiPrefs was updated
    const beforePrefs = beforeData.aiPrefs || {};
    const afterPrefs = afterData.aiPrefs || {};
    
    // Find users who just enabled auto-translate
    const newlyEnabledUsers: Array<{ userId: string; targetLang: string }> = [];
    
    for (const [userId, prefs] of Object.entries(afterPrefs) as Array<[string, any]>) {
      const wasEnabled = beforePrefs[userId]?.autoTranslate;
      const isEnabled = prefs.autoTranslate;
      
      if (!wasEnabled && isEnabled && prefs.targetLang) {
        newlyEnabledUsers.push({ userId, targetLang: prefs.targetLang });
      }
    }
    
    if (newlyEnabledUsers.length === 0) {
      return null;
    }
    
    console.log(`[Batch Translate] ${newlyEnabledUsers.length} users enabled auto-translate in conversation ${conversationId}`);
    
    // Fetch recent messages using message service
    const messages = await messageService.getRecentMessages(conversationId, 50);
    
    if (messages.length === 0) {
      console.log(`[Batch Translate] No messages found in conversation ${conversationId}`);
      return null;
    }
    
    console.log(`[Batch Translate] Found ${messages.length} recent messages to check`);
    
    // Process translations for each newly enabled user
    const translationPromises = newlyEnabledUsers.map(async ({ userId, targetLang }) => {
      console.log(`[Batch Translate] Processing translations for user ${userId} (target: ${targetLang})`);
      
      let translatedCount = 0;
      let skippedCount = 0;
      
      for (const message of messages) {
        const messageId = message.id;
        
        // Skip messages from the user themselves
        if (message.senderId === userId) {
          continue;
        }
        
        // Skip if no text content
        if (!message.text || typeof message.text !== 'string') {
          continue;
        }
        
        try {
          // Use translation service to translate the message
          const translatedText = await translationService.translate(message.text, targetLang, undefined, userId);
          
          // Update message with translation using message service
          await messageService.updateMessageMetadata(messageId, {
            language: targetLang,
            tone: 'neutral'
          });
          
          translatedCount++;
          console.log(`[Batch Translate] Translated message ${messageId} to ${targetLang}: "${translatedText}"`);
          
        } catch (error) {
          console.error(`[Batch Translate] Error translating message ${messageId}:`, error);
          // Continue with other messages even if one fails
        }
      }
      
      console.log(`[Batch Translate] User ${userId}: Translated ${translatedCount} messages, skipped ${skippedCount}`);
    });
    
    await Promise.all(translationPromises);
    
    console.log(`[Batch Translate] Batch translation complete for conversation ${conversationId}`);
    return null;
  });

