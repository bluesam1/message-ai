import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { translationService } from './translationService';

export interface NotificationData {
  conversationId: string;
  messageId: string;
  senderName: string;
  messageType: 'text' | 'image';
  type: 'new_message';
}

export interface NotificationRecipient {
  userId: string;
  tokens: string[];
  title: string;
  body: string;
}

export interface NotificationResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}

/**
 * Notification Service for handling push notifications
 */
export class NotificationService {
  private static instance: NotificationService;
  private expo: Expo;
  private db: FirebaseFirestore.Firestore;

  private constructor() {
    this.expo = new Expo();
    this.db = getFirestore();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send push notification for a new message
   */
  async sendMessageNotification(
    message: any,
    conversationId: string,
    messageId: string
  ): Promise<NotificationResult | null> {
    const { senderId, text, imageUrl } = message;
    
    console.log(`[NotificationService] New message ${messageId} from ${senderId} in conversation ${conversationId}`);
    
    try {
      // Get conversation details
      const conversationDoc = await this.db.doc(`conversations/${conversationId}`).get();
      if (!conversationDoc.exists) {
        console.log(`[NotificationService] Conversation ${conversationId} not found, skipping notification`);
        return null;
      }
      
      const conversation = conversationDoc.data()!;
      const { participants, type, groupName } = conversation;
      
      // Filter out the sender
      const recipients = participants.filter((participantId: string) => participantId !== senderId);
      
      if (recipients.length === 0) {
        console.log(`[NotificationService] No recipients for message ${messageId}, skipping notification`);
        return null;
      }
      
      console.log(`[NotificationService] Sending notifications to ${recipients.length} recipients: ${recipients.join(', ')}`);
      
      // Get Expo push tokens for all recipients
      const userDocs = await Promise.all(
        recipients.map((recipientId: string) => 
          this.db.doc(`users/${recipientId}`).get()
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
        console.log(`[NotificationService] No Expo push tokens found for recipients, skipping notification`);
        return null;
      }
      
      console.log(`[NotificationService] Found ${allTokens.length} Expo push tokens for notification`);
      
      // Get sender info for notification title
      const senderDoc = await this.db.doc(`users/${senderId}`).get();
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
            // Use translation service to detect language
            detectedLang = 'en'; // Default fallback
            console.log(`[NotificationService] Using default language: ${detectedLang}`);
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
              console.log(`[NotificationService] Using existing translation for ${targetLang}`);
              continue;
            }
            
            // Translate using translation service
            try {
              const translatedText = await translationService.translate(text, targetLang, detectedLang, senderId);
              translationCache[targetLang] = translatedText;
              console.log(`[NotificationService] Translated to ${targetLang}: "${translatedText}"`);
            } catch (translateError) {
              console.error(`[NotificationService] Error translating to ${targetLang}:`, translateError);
              // Use original text as fallback
              translationCache[targetLang] = text;
            }
          }
        } catch (error) {
          console.error('[NotificationService] Error in translation process:', error);
          // Continue with original text
        }
      }
      
      // Create personalized notifications for each recipient
      const recipientNotifications = await this.createRecipientNotifications(
        recipients,
        userTokensMap,
        aiPrefs,
        translationCache,
        message,
        senderName,
        type,
        groupName,
        imageUrl
      );
      
      console.log(`[NotificationService] Prepared ${recipientNotifications.length} personalized notifications`);
      
      // Update conversation document with translated lastMessage for each recipient
      if (Object.keys(translationCache).length > 0) {
        await this.updateConversationWithTranslations(conversationId, aiPrefs, translationCache, text);
      }
      
      // Send notifications
      return await this.sendNotifications(recipientNotifications, conversationId, messageId, senderName, message);
      
    } catch (error) {
      console.error(`[NotificationService] Error sending push notification for message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Create personalized notifications for each recipient
   */
  private async createRecipientNotifications(
    recipients: string[],
    userTokensMap: { [userId: string]: string[] },
    aiPrefs: any,
    translationCache: { [lang: string]: string },
    message: any,
    senderName: string,
    type: string,
    groupName: string,
    imageUrl?: string
  ): Promise<NotificationRecipient[]> {
    const recipientNotifications: NotificationRecipient[] = [];
    
    for (const recipientId of recipients) {
      const recipientTokens = userTokensMap[recipientId] || [];
      if (recipientTokens.length === 0) continue;
      
      // Check if recipient has auto-translate enabled
      const recipientPrefs = aiPrefs[recipientId];
      const hasAutoTranslate = recipientPrefs?.autoTranslate;
      const targetLang = recipientPrefs?.targetLang;
      
      // Determine message text to use
      let messageText = message.text;
      
      // If recipient has auto-translate enabled, use translated text
      if (hasAutoTranslate && targetLang && !imageUrl) {
        // Use translated text from cache or existing aiMeta
        if (translationCache[targetLang]) {
          messageText = translationCache[targetLang];
          console.log(`[NotificationService] Using translated notification for ${recipientId} (${targetLang}): "${messageText}"`);
        } else if (message.aiMeta?.translatedText?.[targetLang]) {
          messageText = message.aiMeta.translatedText[targetLang];
          console.log(`[NotificationService] Using existing translated text for ${recipientId} (${targetLang}): "${messageText}"`);
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
    
    return recipientNotifications;
  }

  /**
   * Update conversation document with translations
   */
  private async updateConversationWithTranslations(
    conversationId: string,
    aiPrefs: any,
    translationCache: { [lang: string]: string },
    originalText: string
  ): Promise<void> {
    try {
      console.log(`[NotificationService] Updating conversation document with translations...`);
      
      // Get the conversation document
      const conversationRef = this.db.doc(`conversations/${conversationId}`);
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
              console.log(`[NotificationService] Will update lastMessage for ${participantId} with translation to ${userPrefs.targetLang}`);
            }
          }
        }
        
        // Update the conversation document with personalized lastMessage
        if (Object.keys(updates).length > 0) {
          await conversationRef.update({
            'lastMessage': originalText, // Keep original as default
            'lastMessageTranslations': updates, // Store personalized translations
            'updatedAt': admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[NotificationService] Updated conversation with personalized translations for ${Object.keys(updates).length} participants`);
        }
      }
    } catch (updateError) {
      console.error(`[NotificationService] Error updating conversation document:`, updateError);
      // Don't throw - continue with notifications
    }
  }

  /**
   * Send notifications via Expo
   */
  private async sendNotifications(
    recipientNotifications: NotificationRecipient[],
    conversationId: string,
    messageId: string,
    senderName: string,
    message: any
  ): Promise<NotificationResult> {
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
      console.log(`[NotificationService] No valid Expo push tokens found`);
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }
    
    console.log(`[NotificationService] Sending ${messages.length} notifications with personalized content`);
    
    // Send notifications in chunks (Expo recommends chunks of 100)
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log(`[NotificationService] Sent chunk of ${chunk.length} notifications`);
      } catch (error) {
        console.error('[NotificationService] Error sending push notification chunk:', error);
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
        console.error(`[NotificationService] Error sending to token ${index}:`, ticket.message);
        
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
    
    console.log(`[NotificationService] Notifications sent: ${successCount} success, ${failureCount} failures`);
    
    // Remove invalid tokens from Firestore
    if (invalidTokens.length > 0) {
      await this.removeInvalidTokens(invalidTokens, tokenToUserMap);
    }
    
    return { successCount, failureCount, invalidTokens };
  }

  /**
   * Remove invalid tokens from Firestore
   */
  private async removeInvalidTokens(
    invalidTokens: string[],
    tokenToUserMap: { [token: string]: string }
  ): Promise<void> {
    console.log(`[NotificationService] Removing ${invalidTokens.length} invalid Expo push tokens`);
    
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
      await this.db.doc(`users/${userId}`).update({
        expoPushTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
      });
      console.log(`[NotificationService] Removed ${tokensToRemove.length} invalid tokens from user ${userId}`);
    });
    
    await Promise.all(tokenRemovalPromises);
  }

  /**
   * Send batch notifications
   */
  async sendBatchNotifications(
    notifications: Array<{
      message: any;
      conversationId: string;
      messageId: string;
    }>
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    for (const notification of notifications) {
      const result = await this.sendMessageNotification(
        notification.message,
        notification.conversationId,
        notification.messageId
      );
      
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
