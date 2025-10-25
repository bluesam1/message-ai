import { https } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { checkRateLimit } from '../utils/rateLimiter';
import {
  validateAuth,
  withErrorHandling,
} from '../utils/errorHandling';
import { getOpenAIClient, getOpenAIModel } from '../utils/openai';
import { logTokenUsage } from '../utils/costMonitoring';

interface GenerateSmartRepliesRequest {
  conversationId: string;
  userId: string;
}

interface GenerateSmartRepliesResponse {
  replies: string[];
  tokensUsed: number;
  cached: boolean;
}

interface MessageData {
  text: string;
  senderId: string;
  timestamp: admin.firestore.Timestamp;
  aiMeta?: {
    detectedLang?: string;
  };
}

interface ConversationData {
  aiPrefs?: {
    targetLang?: string;
    defaultTone?: 'formal' | 'casual' | 'neutral';
  };
  smartRepliesCache?: {
    replies: string[];
    lastUpdated: admin.firestore.Timestamp;
    userId: string;
  };
}

/**
 * Cloud Function to generate context-aware smart replies using OpenAI
 */
export const generateSmartReplies = https.onCall(
  async (request: https.CallableRequest<GenerateSmartRepliesRequest>) => {
    return withErrorHandling(async () => {
      // Validate authentication
      const userId = validateAuth(request);

      // Check rate limit
      try {
        checkRateLimit(userId);
      } catch (error: any) {
        throw new https.HttpsError('resource-exhausted', error.message);
      }

      // Validate input
      const conversationId = request.data.conversationId;
      if (!conversationId || typeof conversationId !== 'string') {
        throw new https.HttpsError(
          'invalid-argument',
          'conversationId is required and must be a string'
        );
      }

      console.log(`Smart replies request from ${userId} for conversation ${conversationId}`);

      try {
        const db = admin.firestore();

        // Check for cached replies first
        const conversationRef = db.collection('conversations').doc(conversationId);
        const conversationDoc = await conversationRef.get();
        
        if (!conversationDoc.exists) {
          throw new https.HttpsError('not-found', 'Conversation not found');
        }

        const conversationData = conversationDoc.data() as ConversationData;
        
        // Check if we have valid cached replies (less than 5 minutes old)
        const now = admin.firestore.Timestamp.now();
        const cacheAge = conversationData.smartRepliesCache?.lastUpdated;
        const isCacheValid = cacheAge && 
          (now.seconds - cacheAge.seconds) < 300 && // 5 minutes
          conversationData.smartRepliesCache?.userId === userId;

        if (isCacheValid && conversationData.smartRepliesCache?.replies) {
          console.log('Returning cached smart replies');
          return {
            replies: conversationData.smartRepliesCache.replies,
            tokensUsed: 0,
            cached: true,
          } as GenerateSmartRepliesResponse;
        }

        // Fetch recent messages (last 10 messages)
        const messagesSnapshot = await db
          .collection('messages')
          .where('conversationId', '==', conversationId)
          .orderBy('timestamp', 'desc')
          .limit(10)
          .get();

        if (messagesSnapshot.empty) {
          throw new https.HttpsError('not-found', 'No messages found in conversation');
        }

        const messages: MessageData[] = messagesSnapshot.docs.map(doc => ({
          text: doc.data().text,
          senderId: doc.data().senderId,
          timestamp: doc.data().timestamp,
          aiMeta: doc.data().aiMeta,
        }));

        // Get user's preferred language from conversation data
        // aiPrefs is a map of userId -> preferences, so we access the specific user's preferences
        const userPrefs = (conversationData.aiPrefs as any)?.[userId];
        const userLanguage = userPrefs?.targetLang || 'en'; // Default to English

        // Create context for OpenAI
        const contextMessages = messages
          .slice(0, 5) // Use last 5 messages for context
          .reverse() // Reverse to get chronological order
          .map(msg => `${msg.senderId === userId ? 'You' : 'Other'}: ${msg.text}`)
          .join('\n');

        const client = getOpenAIClient();
        const model = getOpenAIModel();

        console.log(`[generateSmartReplies] User ${userId} language preferences:`, {
          userPrefs,
          userLanguage,
          hasUserPrefs: !!userPrefs
        });
        
        const systemPrompt = `You are a helpful messaging assistant. Generate 3 diverse, relevant reply suggestions for a specific user based on the conversation context.

CONVERSATION CONTEXT:
- Target User's Preferred Language: ${userLanguage}
- Recent messages:
${contextMessages}

REQUIREMENTS:
- Generate exactly 3 replies for the user who requested them
- Each reply: 10-30 words
- Write ALL replies in the target user's preferred language: ${userLanguage}
- Be contextually relevant to the recent messages
- Be diverse (different approaches/angles)
- Be concise and natural
- Sound like the target user would naturally respond
- Make replies sound like clickable suggestions (not full sentences)
- IMPORTANT: Generate replies as if you are the target user responding to the conversation

Return as JSON array: ["reply1", "reply2", "reply3"]`;

        const response = await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: `Generate 3 smart replies for the user in their preferred language (${userLanguage}). The replies should sound like the user would naturally respond to this conversation.`,
            },
          ],
          temperature: 0.8, // Higher for more diverse replies
          max_tokens: 300,
        });

        const content = response.choices[0]?.message?.content?.trim() || '';
        const tokensUsed = response.usage?.total_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;

        // Parse JSON response
        let replies: string[];
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length === 3) {
            replies = parsed.map(reply => reply.trim()).filter(reply => reply.length > 0);
          } else {
            throw new Error('Invalid response format');
          }
        } catch (parseError) {
          console.error('Failed to parse OpenAI response:', parseError);
          // Fallback replies
          replies = [
            "Thanks for the message!",
            "I'll get back to you soon.",
            "Let me think about that."
          ];
        }

        // Ensure we have exactly 3 replies
        while (replies.length < 3) {
          replies.push(`Reply ${replies.length + 1}`);
        }

        // Cache the replies
        await conversationRef.update({
          smartRepliesCache: {
            replies: replies.slice(0, 3),
            lastUpdated: admin.firestore.Timestamp.now(),
            userId: userId,
          },
        });

        // Log token usage for cost tracking
        await logTokenUsage(
          userId,
          'smart_replies',
          model,
          tokensUsed,
          outputTokens
        );

        const responseData: GenerateSmartRepliesResponse = {
          replies: replies.slice(0, 3),
          tokensUsed,
          cached: false,
        };

        console.log(`Smart replies generated successfully: ${tokensUsed} tokens used`);

        return responseData;
      } catch (error: any) {
        console.error('Error generating smart replies:', error);
        
        // Return fallback message on error
        return {
          replies: ["AI had a hard time fulfilling your request. Try again later."],
          tokensUsed: 0,
          cached: false,
        } as GenerateSmartRepliesResponse;
      }
    });
  }
);


