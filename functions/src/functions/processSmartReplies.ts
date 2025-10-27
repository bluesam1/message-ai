/**
 * Unified Smart Replies Processing
 * 
 * Handles both automatic and manual smart replies generation.
 * This replaces backgroundSmartReplies.ts and refreshSmartReplies.ts
 * with a single, unified approach.
 * 
 * Triggers:
 * 1. Automatic: New message created, settings updated, conversation updated
 * 2. Manual: User-triggered refresh via callable function
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { https } from 'firebase-functions/v2';
import { logger } from 'firebase-functions';
import { smartRepliesService } from '../services/smartRepliesService';
import { conversationSettingsService } from '../services/conversationSettingsService';
import { ConversationSettings } from '../types/conversationSettings';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * AUTOMATIC TRIGGERS
 */

/**
 * Triggered when a new message is created
 */
export const onMessageCreated = onDocumentCreated('messages/{messageId}', async (event) => {
  const message = event.data?.data();
  if (!message) {
    logger.warn('No message data found');
    return null;
  }
  
  const { messageId } = event.params;
  const { conversationId, senderId } = message;
  
  logger.info('New message created, checking for smart replies generation', {
    messageId,
    conversationId,
    senderId
  });

  try {
    // Get conversation participants
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    if (!conversationDoc.exists) {
      logger.warn('Conversation not found', { conversationId });
      return null;
    }

    const conversation = conversationDoc.data()!;
    const participants = conversation.participants || [];

    // Generate smart replies for all participants (including sender)
    const generationPromises = participants.map(async (participantId: string) => {
      try {
        // Get user's language preference for smart replies
        const userPrefs = conversation.aiPrefs?.[participantId];
        const targetLanguage = userPrefs?.targetLang || 'en';
        
        logger.info('Smart replies language preferences:', {
          participantId,
          userPrefs,
          targetLanguage,
          autoTranslate: userPrefs?.autoTranslate
        });
        
        const result = await smartRepliesService.generateSmartRepliesForUser(
          conversationId,
          participantId,
          { 
            senderId,
            targetLanguage,
            forceRefresh: true // Always regenerate for new messages
          }
        );

          if (result.success) {
            logger.info('Smart replies generated successfully', {
              conversationId,
              userId: participantId,
              cacheHit: result.cacheHit,
              processingTime: result.processingTime
            });
          } else {
            logger.error('Smart replies generation failed', {
              conversationId,
              userId: participantId,
              error: result.error
            });
          }

          return result;
        } catch (error) {
          logger.error('Error generating smart replies for user', {
            conversationId,
            userId: participantId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return null;
        }
      });

    await Promise.all(generationPromises);
    return null;

  } catch (error) {
    logger.error('Error in onMessageCreated smart replies', {
      messageId,
      conversationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
});

/**
 * Triggered when conversation settings are updated
 */
export const onConversationSettingsUpdated = onDocumentUpdated('conversationSettings/{settingsId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) {
    logger.warn('No data for conversation settings update event');
    return null;
  }

  logger.info('Conversation settings updated', {
    settingsId: event.params.settingsId,
    conversationId: afterData.conversationId,
    userId: afterData.userId
  });

  // Check if regeneration is required
  const requiresRegeneration = conversationSettingsService.requiresRegeneration(
    beforeData as ConversationSettings,
    afterData as ConversationSettings
  );

  if (!requiresRegeneration) {
    logger.info('Smart replies regeneration not required for settings update');
    return null;
  }

  try {
    const result = await smartRepliesService.generateSmartRepliesForUser(
      afterData.conversationId,
      afterData.userId,
      { forceRefresh: true }
    );

    if (result.success) {
      logger.info('Smart replies regenerated after settings update', {
        conversationId: afterData.conversationId,
        userId: afterData.userId,
        processingTime: result.processingTime
      });
    } else {
      logger.error('Failed to regenerate smart replies after settings update', {
        conversationId: afterData.conversationId,
        userId: afterData.userId,
        error: result.error
      });
    }

    return null;
  } catch (error) {
    logger.error('Error regenerating smart replies after settings update', {
      conversationId: afterData.conversationId,
      userId: afterData.userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
});

/**
 * Triggered when a conversation document is updated
 */
export const onConversationUpdated = onDocumentUpdated('conversations/{conversationId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) {
    logger.warn('No data for conversation update event');
    return null;
  }

  logger.info('Conversation updated', {
    conversationId: event.params.conversationId
  });

  // Check if participants changed
  const beforeParticipants = beforeData.participants || [];
  const afterParticipants = afterData.participants || [];
  
  const newParticipants = afterParticipants.filter((id: string) => !beforeParticipants.includes(id));
  
  if (newParticipants.length === 0) {
    logger.info('No new participants, skipping smart replies generation');
    return null;
  }

  try {
    // Generate smart replies for new participants
    const generationPromises = newParticipants.map(async (participantId: string) => {
      try {
        const result = await smartRepliesService.generateSmartRepliesForUser(
          event.params.conversationId,
          participantId,
          { forceRefresh: true }
        );

        if (result.success) {
          logger.info('Smart replies generated for new participant', {
            conversationId: event.params.conversationId,
            userId: participantId,
            processingTime: result.processingTime
          });
        } else {
          logger.error('Failed to generate smart replies for new participant', {
            conversationId: event.params.conversationId,
            userId: participantId,
            error: result.error
          });
        }

        return result;
      } catch (error) {
        logger.error('Error generating smart replies for new participant', {
          conversationId: event.params.conversationId,
          userId: participantId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
      }
    });

    await Promise.all(generationPromises);
    return null;

  } catch (error) {
    logger.error('Error in onConversationUpdated smart replies', {
      conversationId: event.params.conversationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
});

/**
 * MANUAL TRIGGERS
 */

interface RefreshSmartRepliesRequest {
  conversationId: string;
  userId: string;
}


/**
 * Manual refresh function to regenerate smart replies
 * This allows users to manually trigger smart replies generation
 */
export const refreshSmartReplies = https.onCall(
  async (request: https.CallableRequest<RefreshSmartRepliesRequest>) => {
    try {
      const { conversationId, userId } = request.data;

      if (!conversationId || !userId) {
        throw new Error('conversationId and userId are required');
      }

      logger.info('Manual smart replies refresh requested', { conversationId, userId });

      // Use the unified service method with force refresh
      const result = await smartRepliesService.generateSmartRepliesForUser(
        conversationId,
        userId,
        { forceRefresh: true }
      );

      if (result.success && result.smartReplies) {
        logger.info('Manual smart replies refresh completed successfully', {
          conversationId,
          userId,
          replyCount: result.smartReplies.replies.length,
          processingTime: result.processingTime
        });

        return {
          success: true,
          message: 'Smart replies refreshed successfully',
          replies: result.smartReplies.replies,
          contextAnalysis: result.smartReplies.contextAnalysis
        };
      } else {
        throw new Error(result.error || 'Smart replies generation failed');
      }

    } catch (error) {
      logger.error('Manual smart replies refresh failed', error, { 
        conversationId: request.data?.conversationId,
        userId: request.data?.userId 
      });
      
      return {
        success: false,
        message: `Failed to refresh smart replies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
);
