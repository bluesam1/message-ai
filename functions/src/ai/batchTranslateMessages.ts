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
import * as admin from 'firebase-admin';
import { detectLanguage } from '../utils/languageDetection';
import { translateText } from '../utils/translation';

// OpenAI initialization is now handled by utility functions

interface AIMetadata {
  detectedLang?: string;
  translatedText?: { [lang: string]: string };
  explanation?: string;
  slangDefinition?: string;
  feedback?: 'positive' | 'negative';
}

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
    
    // Fetch recent messages (last 50 messages)
    const messagesSnapshot = await admin.firestore()
      .collection('messages')
      .where('conversationId', '==', conversationId)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    if (messagesSnapshot.empty) {
      console.log(`[Batch Translate] No messages found in conversation ${conversationId}`);
      return null;
    }
    
    console.log(`[Batch Translate] Found ${messagesSnapshot.size} recent messages to check`);
    
    // Process translations for each newly enabled user
    const translationPromises = newlyEnabledUsers.map(async ({ userId, targetLang }) => {
      console.log(`[Batch Translate] Processing translations for user ${userId} (target: ${targetLang})`);
      
      let translatedCount = 0;
      let skippedCount = 0;
      
      for (const messageDoc of messagesSnapshot.docs) {
        const messageData = messageDoc.data();
        const messageId = messageDoc.id;
        
        // Skip messages from the user themselves
        if (messageData.senderId === userId) {
          continue;
        }
        
        // Check if translation already exists
        const aiMeta: AIMetadata = messageData.aiMeta || {};
        if (aiMeta.translatedText?.[targetLang]) {
          skippedCount++;
          continue; // Already translated
        }
        
        // Skip if no text content
        if (!messageData.text || typeof messageData.text !== 'string') {
          continue;
        }
        
        try {
          // Detect language if not already detected
          let detectedLang = aiMeta.detectedLang;
          
          if (!detectedLang) {
            detectedLang = await detectLanguage(messageData.text, userId);
          }
          
          // Skip translation if already in target language
          if (detectedLang === targetLang) {
            console.log(`[Batch Translate] Message ${messageId} already in ${targetLang}, skipping`);
            
            // Update with detected language if not set
            if (!aiMeta.detectedLang) {
              await messageDoc.ref.update({
                'aiMeta.detectedLang': detectedLang,
              });
            }
            
            skippedCount++;
            continue;
          }
          
          // Translate the message
          const translatedText = await translateText(messageData.text, targetLang, detectedLang, userId);
          
          // Update message with translation
          const updatedTranslations = aiMeta.translatedText || {};
          updatedTranslations[targetLang] = translatedText;
          
          await messageDoc.ref.update({
            'aiMeta.detectedLang': detectedLang,
            'aiMeta.translatedText': updatedTranslations,
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

