/**
 * Unified Message Processing Function
 * 
 * Handles both auto-translation and push notifications for new messages.
 * This replaces the separate autoTranslateOrchestrator and sendPushNotification functions
 * to avoid duplicate processing and potential conflicts.
 * 
 * Workflow:
 * 1. Detect message language (if not already detected)
 * 2. Process auto-translations for conversation participants
 * 3. Send personalized push notifications
 * 
 * Triggered on: New message created in /messages/{messageId}
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { translationService } from '../services/translationService';
import { notificationService } from '../services/notificationService';
import { smartRepliesService } from '../services/smartRepliesService';
import { detectLanguage } from '../utils/languageDetection';

export const processNewMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { messageId } = context.params;
    const { conversationId, senderId, text } = message;
    
    console.log(`[processNewMessage] Processing message ${messageId} in conversation ${conversationId}`);
    
    try {
      // Skip if message has no text or is too short
      if (!text || text.trim().length < 3) {
        console.log(`[processNewMessage] Skipping: message too short or empty`);
        return null;
      }
      
      // Step 1: Detect message language (if not already detected)
      let detectedLanguage = message.aiMeta?.detectedLang;
      if (!detectedLanguage) {
        console.log(`[processNewMessage] Step 1: Detecting language...`);
        detectedLanguage = await detectLanguage(text, senderId);
        
        if (detectedLanguage === 'unknown') {
          console.log(`[processNewMessage] Language detection failed, using 'unknown'`);
        } else {
          console.log(`[processNewMessage] Detected language: ${detectedLanguage}`);
        }
        
        // Save detected language to avoid re-processing
        await snap.ref.update({
          'aiMeta.detectedLang': detectedLanguage,
        });
      } else {
        console.log(`[processNewMessage] Using existing detected language: ${detectedLanguage}`);
      }
      
      // Step 2: Get conversation preferences for auto-translation
      console.log(`[processNewMessage] Step 2: Retrieving conversation preferences...`);
      const conversationRef = admin.firestore().doc(`conversations/${conversationId}`);
      const conversationDoc = await conversationRef.get();
      
      if (!conversationDoc.exists) {
        console.log(`[processNewMessage] Conversation not found, skipping auto-translation`);
        // Still send notifications even if conversation not found
        await notificationService.sendMessageNotification(message, conversationId, messageId);
        return null;
      }
      
      const conversation = conversationDoc.data()!;
      const { participants, aiPrefs = {} } = conversation;
      
      // Step 3: Process auto-translations for participants who need them
      console.log(`[processNewMessage] Step 3: Processing auto-translations...`);
      const translationPromises: Promise<void>[] = [];
      const translations: { [lang: string]: string } = {};
      
      for (const participantId of participants) {
        if (participantId === senderId) continue; // Skip sender
        
        const userPrefs = aiPrefs[participantId];
        if (userPrefs?.autoTranslate && userPrefs.targetLang && userPrefs.targetLang !== detectedLanguage) {
          console.log(`[processNewMessage] Auto-translating for user ${participantId} to ${userPrefs.targetLang}`);
          
          const translationPromise = translationService.translate(text, userPrefs.targetLang, detectedLanguage, senderId)
            .then(translatedText => {
              translations[userPrefs.targetLang] = translatedText;
              console.log(`[processNewMessage] Translated to ${userPrefs.targetLang}: "${translatedText}"`);
            })
            .catch(error => {
              console.error(`[processNewMessage] Translation failed for ${userPrefs.targetLang}:`, error);
            });
          
          translationPromises.push(translationPromise);
        }
      }
      
      // Wait for all translations to complete
      if (translationPromises.length > 0) {
        await Promise.all(translationPromises);
        
        // Update message with translations
        if (Object.keys(translations).length > 0) {
          await snap.ref.update({
            'aiMeta.translatedText': translations,
          });
          console.log(`[processNewMessage] Saved ${Object.keys(translations).length} translations to message`);
        }
      } else {
        console.log(`[processNewMessage] No auto-translations needed`);
      }
      
      // Step 4: Send push notifications (with personalized translations)
      console.log(`[processNewMessage] Step 4: Sending push notifications...`);
      await notificationService.sendMessageNotification(message, conversationId, messageId);
      
      // Step 5: Generate smart replies for all participants
      console.log(`[processNewMessage] Step 5: Generating smart replies...`);
      console.log(`[processNewMessage] Participants for smart replies: ${participants.length} participants`);
      
      // Generate smart replies for all participants (synchronously to ensure completion)
      const smartRepliesPromises = participants.map(async (participantId: string) => {
        const startTime = Date.now();
        try {
          const userPrefs = aiPrefs[participantId];
          const targetLanguage = userPrefs?.targetLang || 'en';
          
          console.log(`[processNewMessage] Starting smart replies generation for user ${participantId} (lang: ${targetLanguage})`);
          
          const result = await smartRepliesService.generateSmartRepliesForUser(
            conversationId,
            participantId,
            { 
              senderId,
              targetLanguage,
              forceRefresh: true
            }
          );
          
          const duration = Date.now() - startTime;
          console.log(`[processNewMessage] Smart replies generated successfully for user ${participantId} (${duration}ms)`);
          
          return { participantId, success: true, result };
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[processNewMessage] Smart replies generation failed for user ${participantId} (${duration}ms): ${errorMsg}`);
          return { participantId, success: false, error };
        }
      });
      
      // Wait for all smart replies to complete
      const results = await Promise.all(smartRepliesPromises);
      
      const successful = results.filter(r => r.success);
      
      console.log(`[processNewMessage] Smart replies generation completed: ${successful.length}/${participants.length} successful`);
      
      console.log(`[processNewMessage] Message processing completed successfully`);
      return null;
      
    } catch (error) {
      console.error(`[processNewMessage] Error processing message ${messageId}:`, error);
      return null;
    }
  });
