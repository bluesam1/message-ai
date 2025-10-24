/**
 * Cloud Functions for MessageAI
 * 
 * Functions:
 * 1. onPresenceChange - Mirrors RTDB presence to Firestore
 * 2. (Future) sendPushNotification - Sends push notifications on new messages
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { detectLanguage } from './utils/languageDetection';
import { translateText } from './utils/translation';

// Initialize Firebase Admin
admin.initializeApp();

// OpenAI initialization is now handled by utility functions

// Initialize Expo SDK with access token (optional but recommended for production)
// Get access token from: https://expo.dev/accounts/[account]/settings/access-tokens
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  // If no access token, Expo will use unauthenticated mode (limited rate)
});

/**
 * Mirror Presence from RTDB to Firestore
 * 
 * Listens to changes in /status/{uid} in Realtime Database
 * and mirrors the data to Firestore users/{uid} collection.
 * 
 * This ensures:
 * - Offline status is updated even when client crashes/disconnects
 * - Firestore queries can be used for user lists with presence
 * - UI components can read from Firestore (existing code works)
 * 
 * Triggered on: Any write to /status/{uid} in RTDB
 * 
 * IMPORTANT: Must specify the RTDB instance name for non-default databases
 */
export const onPresenceChange = functions.database
  .instance('msg-ai-1-default-rtdb')
  .ref('/status/{uid}')
  .onWrite(async (change, context) => {
    const { uid } = context.params;
    
    // Get the data after the write
    const status = change.after.val();
    
    // Debug: Log the raw status data
    console.log(`[Cloud Function] Raw status data for user ${uid}:`, JSON.stringify(status));
    
    // If status was deleted, set user offline
    if (!status) {
      console.log(`[Cloud Function] Status deleted for user ${uid}, setting offline`);
      await admin.firestore().doc(`users/${uid}`).update({
        online: false,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });
      return null;
    }
    
    // Mirror RTDB presence to Firestore
    const online = status.state === 'online';
    
    // Handle RTDB serverTimestamp properly
    // When RTDB writes serverTimestamp(), it's stored as a number (milliseconds since epoch)
    // The Firebase JS SDK's serverTimestamp() creates {".sv": "timestamp"} which RTDB resolves server-side
    let lastSeen: number;
    
    console.log(`[Cloud Function] lastSeenAt type: ${typeof status.lastSeenAt}, value:`, status.lastSeenAt);
    
    if (typeof status.lastSeenAt === 'number') {
      // Already resolved to a timestamp (normal case)
      lastSeen = status.lastSeenAt;
      console.log(`[Cloud Function] Using RTDB timestamp: ${lastSeen}`);
    } else if (status.lastSeenAt && typeof status.lastSeenAt === 'object') {
      // Still a server value object (shouldn't happen, but handle it)
      console.warn(`[Cloud Function] lastSeenAt is still an object for user ${uid}:`, status.lastSeenAt);
      lastSeen = Date.now();
    } else {
      // Fallback: use current server time
      console.warn(`[Cloud Function] lastSeenAt is missing/invalid for user ${uid}`);
      lastSeen = Date.now();
    }
    
    console.log(`[Cloud Function] Mirroring presence for user ${uid}: ${online ? 'online' : 'offline'}, lastSeen: ${lastSeen}`);
    
    try {
      // Use Firestore FieldValue.serverTimestamp() for consistency
      // This ensures Firestore always stores it as a proper Timestamp
      await admin.firestore().doc(`users/${uid}`).update({
        online,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`[Cloud Function] Successfully updated Firestore for user ${uid} with server timestamp`);
    } catch (error) {
      console.error(`[Cloud Function] Error updating Firestore for user ${uid}:`, error);
      
      // If document doesn't exist, we can't update it
      // This is OK - the document might not be created yet
      if ((error as any).code === 5) {
        console.log(`[Cloud Function] User document doesn't exist yet for ${uid}, skipping`);
      } else {
        throw error;
      }
    }
    
    return null;
  });

/**
 * Send Push Notifications on New Messages
 * 
 * Listens to new messages in Firestore and sends FCM notifications
 * to recipients who aren't currently viewing the conversation.
 * 
 * Triggered on: New message created in /messages/{messageId}
 * 
 * Features:
 * - Filters out the message sender
 * - Supports both direct and group conversations
 * - Handles image messages with special formatting
 * - Removes invalid FCM tokens automatically
 * - Includes conversation navigation data
 */
export const sendPushNotification = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { messageId } = context.params;
    const { conversationId, senderId, text, imageUrl } = message;
    
    console.log(`[Cloud Function] New message ${messageId} from ${senderId} in conversation ${conversationId}`);
    
    try {
      // Get conversation details
      const conversationDoc = await admin.firestore().doc(`conversations/${conversationId}`).get();
      if (!conversationDoc.exists) {
        console.log(`[Cloud Function] Conversation ${conversationId} not found, skipping notification`);
        return null;
      }
      
      const conversation = conversationDoc.data()!;
      const { participants, type, groupName } = conversation;
      
      // Filter out the sender
      const recipients = participants.filter((participantId: string) => participantId !== senderId);
      
      if (recipients.length === 0) {
        console.log(`[Cloud Function] No recipients for message ${messageId}, skipping notification`);
        return null;
      }
      
      console.log(`[Cloud Function] Sending notifications to ${recipients.length} recipients:`, recipients);
      
      // Get Expo push tokens for all recipients
      const userDocs = await Promise.all(
        recipients.map((recipientId: string) => 
          admin.firestore().doc(`users/${recipientId}`).get()
        )
      );
      
      const allTokens: string[] = [];
      const userTokensMap: { [userId: string]: string[] } = {};
      
      userDocs.forEach((userDoc, index) => {
        if (userDoc.exists) {
          const userData = userDoc.data()!;
          const expoPushTokens = userData.expoPushTokens || [];
          allTokens.push(...expoPushTokens);
          userTokensMap[recipients[index]] = expoPushTokens;
        }
      });
      
      if (allTokens.length === 0) {
        console.log(`[Cloud Function] No Expo push tokens found for recipients, skipping notification`);
        return null;
      }
      
      console.log(`[Cloud Function] Found ${allTokens.length} Expo push tokens for notification`);
      
      // Get sender info for notification title
      const senderDoc = await admin.firestore().doc(`users/${senderId}`).get();
      const senderName = senderDoc.exists ? senderDoc.data()!.displayName : 'Unknown User';
      
      // Get conversation AI preferences for translation
      const aiPrefs = conversation.aiPrefs || {};
      
      // Detect message language if text exists and recipients need translation
      let detectedLang: string | undefined;
      const recipientsNeedingTranslation = recipients.filter((recipientId: string) => {
        const recipientPrefs = aiPrefs[recipientId];
        return recipientPrefs?.autoTranslate && recipientPrefs?.targetLang && !imageUrl;
      });
      
      // Translate inline for recipients who need it (if not already translated)
      const translationCache: { [lang: string]: string } = {};
      
      if (text && recipientsNeedingTranslation.length > 0) {
        try {
          // Check if we already have translations in aiMeta
          const existingTranslations: { [lang: string]: string } = message.aiMeta?.translatedText || {};
          detectedLang = message.aiMeta?.detectedLang;
          
          // Detect language if not already detected
          if (!detectedLang) {
            detectedLang = await detectLanguage(text, senderId);
            console.log(`[Cloud Function] Detected language: ${detectedLang}`);
          }
          
          // Translate for each unique target language needed
          const uniqueTargetLangs = new Set<string>(
            recipientsNeedingTranslation
              .map((recipientId: string) => aiPrefs[recipientId]?.targetLang)
              .filter((lang: string | undefined): lang is string => lang !== undefined && lang !== detectedLang)
          );
          
          for (const targetLang of uniqueTargetLangs) {
            
            // Check if translation already exists
            if (existingTranslations[targetLang]) {
              translationCache[targetLang] = existingTranslations[targetLang];
              console.log(`[Cloud Function] Using existing translation for ${targetLang}`);
              continue;
            }
            
            // Translate
            try {
              const translatedText = await translateText(text, targetLang, detectedLang, senderId);
              translationCache[targetLang] = translatedText;
              console.log(`[Cloud Function] Translated to ${targetLang}: "${translatedText}"`);
            } catch (translateError) {
              console.error(`[Cloud Function] Error translating to ${targetLang}:`, translateError);
              // Use original text as fallback
              translationCache[targetLang] = text;
            }
          }
        } catch (error) {
          console.error('[Cloud Function] Error in translation process:', error);
          // Continue with original text
        }
      }
      
      // Create personalized notifications for each recipient based on their auto-translate preferences
      const recipientNotifications: Array<{ userId: string; tokens: string[]; title: string; body: string }> = [];
      
      for (const recipientId of recipients) {
        const recipientTokens = userTokensMap[recipientId] || [];
        if (recipientTokens.length === 0) continue;
        
        // Check if recipient has auto-translate enabled
        const recipientPrefs = aiPrefs[recipientId];
        const hasAutoTranslate = recipientPrefs?.autoTranslate;
        const targetLang = recipientPrefs?.targetLang;
        
        // Determine message text to use
        let messageText = text;
        
        // If recipient has auto-translate enabled, use translated text
        if (hasAutoTranslate && targetLang && !imageUrl) {
          // Use translated text from cache or existing aiMeta
          if (translationCache[targetLang]) {
            messageText = translationCache[targetLang];
            console.log(`[Cloud Function] Using translated notification for ${recipientId} (${targetLang}): "${messageText}"`);
          } else if (message.aiMeta?.translatedText?.[targetLang]) {
            messageText = message.aiMeta.translatedText[targetLang];
            console.log(`[Cloud Function] Using existing translated text for ${recipientId} (${targetLang}): "${messageText}"`);
          }
        }
        
        // Format notification title and body
        let title: string;
        let body: string;
        
        if (type === 'group') {
          title = `${groupName}`;
          if (imageUrl) {
            body = `${senderName} sent an image`;
          } else {
            body = `${senderName}: ${messageText}`;
          }
        } else {
          title = senderName;
          if (imageUrl) {
            body = '📷 Sent an image';
          } else {
            body = messageText;
          }
        }
        
        // Truncate body if too long
        if (body.length > 100) {
          body = body.substring(0, 97) + '...';
        }
        
        recipientNotifications.push({
          userId: recipientId,
          tokens: recipientTokens,
          title,
          body,
        });
      }
      
      console.log(`[Cloud Function] Prepared ${recipientNotifications.length} personalized notifications`);
      
      // Update conversation document with translated lastMessage for each recipient
      if (Object.keys(translationCache).length > 0) {
        try {
          console.log(`[Cloud Function] Updating conversation document with translations...`);
          
          // Get the conversation document
          const conversationRef = admin.firestore().doc(`conversations/${conversationId}`);
          const conversationDoc = await conversationRef.get();
          
          if (conversationDoc.exists) {
            const conversationData = conversationDoc.data();
            const participants = conversationData?.participants || [];
            
            // Update lastMessage for each participant based on their language preference
            const updates: { [userId: string]: string } = {};
            
            for (const participantId of participants) {
              const userPrefs = aiPrefs[participantId];
              if (userPrefs?.autoTranslate && userPrefs.targetLang) {
                const translatedText = translationCache[userPrefs.targetLang];
                if (translatedText) {
                  updates[participantId] = translatedText;
                  console.log(`[Cloud Function] Will update lastMessage for ${participantId} with translation to ${userPrefs.targetLang}`);
                }
              }
            }
            
            // Update the conversation document with personalized lastMessage
            if (Object.keys(updates).length > 0) {
              await conversationRef.update({
                'lastMessage': text, // Keep original as default
                'lastMessageTranslations': updates, // Store personalized translations
                'updatedAt': admin.firestore.FieldValue.serverTimestamp(),
              });
              console.log(`[Cloud Function] Updated conversation with personalized translations for ${Object.keys(updates).length} participants`);
            }
          }
        } catch (updateError) {
          console.error(`[Cloud Function] Error updating conversation document:`, updateError);
          // Don't throw - continue with notifications
        }
      }
      
      // Filter and create Expo push messages
      const messages: ExpoPushMessage[] = [];
      const tokenToUserMap: { [token: string]: string } = {}; // Map tokens to user IDs for cleanup
      
      for (const notification of recipientNotifications) {
        const validTokens = notification.tokens.filter(token => Expo.isExpoPushToken(token));
        
        for (const token of validTokens) {
          tokenToUserMap[token] = notification.userId;
          messages.push({
            to: token,
            sound: 'default',
            title: notification.title,
            body: notification.body,
            data: {
              conversationId: conversationId || '',
              messageId: messageId || '',
              senderName: message.senderName || senderName || 'Unknown',
              messageType: message.imageUrl ? 'image' : 'text',
              type: 'new_message',
            },
            channelId: 'messages', // Android notification channel
            priority: 'high',
            badge: 1, // iOS badge count
          });
        }
      }
      
      if (messages.length === 0) {
        console.log(`[Cloud Function] No valid Expo push tokens found`);
        return null;
      }
      
      console.log(`[Cloud Function] Sending ${messages.length} notifications with personalized content`);
      
      // Send notifications in chunks (Expo recommends chunks of 100)
      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];
      
      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          console.log(`[Cloud Function] Sent chunk of ${chunk.length} notifications`);
        } catch (error) {
          console.error('[Cloud Function] Error sending push notification chunk:', error);
        }
      }
      
      // Check for errors in tickets
      let successCount = 0;
      let failureCount = 0;
      const invalidTokens: string[] = [];
      
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          successCount++;
        } else if (ticket.status === 'error') {
          failureCount++;
          console.error(`[Cloud Function] Error sending to token ${index}:`, ticket.message);
          
          // Collect invalid tokens
          if (
            ticket.details?.error === 'DeviceNotRegistered' ||
            ticket.message?.includes('not registered')
          ) {
            const token = messages[index]?.to;
            if (token && typeof token === 'string') {
              invalidTokens.push(token);
            }
          }
        }
      });
      
      console.log(`[Cloud Function] Notifications sent: ${successCount} success, ${failureCount} failures`);
      
      // Remove invalid tokens from Firestore
      if (invalidTokens.length > 0) {
        console.log(`[Cloud Function] Removing ${invalidTokens.length} invalid Expo push tokens`);
        
        // Group invalid tokens by user
        const userInvalidTokens: { [userId: string]: string[] } = {};
        for (const token of invalidTokens) {
          const userId = tokenToUserMap[token];
          if (userId) {
            if (!userInvalidTokens[userId]) {
              userInvalidTokens[userId] = [];
            }
            userInvalidTokens[userId].push(token);
          }
        }
        
        // Remove tokens for each user
        const tokenRemovalPromises = Object.entries(userInvalidTokens).map(async ([userId, tokensToRemove]) => {
          await admin.firestore().doc(`users/${userId}`).update({
            expoPushTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
          });
          console.log(`[Cloud Function] Removed ${tokensToRemove.length} invalid tokens from user ${userId}`);
        });
        
        await Promise.all(tokenRemovalPromises);
      }
      
      return null;
    } catch (error) {
      console.error(`[Cloud Function] Error sending push notification for message ${messageId}:`, error);
      return null;
    }
  });

/**
 * AI-Powered Features
 * Export the AI Cloud Functions
 */
export { translateMessage } from './ai/translateMessage';
export { explainContext } from './ai/explainContext';
export { defineSlang } from './ai/defineSlang';
export { detectLanguage } from './ai/detectLanguage';
export { autoTranslateOrchestrator } from './ai/autoTranslateOrchestrator';
export { batchTranslateMessages } from './ai/batchTranslateMessages';

