/**
 * Firestore Collection Structure Documentation
 * 
 * This file documents the Firestore database schema for MessageAI.
 * It serves as a reference for developers and ensures consistency across the application.
 */

/**
 * FIRESTORE COLLECTIONS STRUCTURE
 * ================================
 * 
 * This application uses the following Firestore collections:
 * 
 * 1. users - User profiles and authentication data
 * 2. conversations - Conversation metadata
 * 3. messages - Individual messages within conversations
 */

/**
 * COLLECTION: conversations
 * =========================
 * 
 * Path: /conversations/{conversationId}
 * 
 * Purpose: Stores metadata about conversations (direct and group chats)
 * 
 * Schema:
 * {
 *   id: string                    // Auto-generated document ID
 *   participants: string[]        // Array of user IDs participating in the conversation
 *   type: "direct" | "group"      // Type of conversation
 *   groupName: string | null      // Group name (required for groups, null for direct)
 *   groupPhoto: string | null     // Group photo URL (optional for groups)
 *   createdBy: string             // User ID of the conversation creator
 *   lastMessage: string           // Preview text of the most recent message
 *   lastMessageTime: timestamp    // Firestore timestamp of the last message
 *   createdAt: timestamp          // Firestore timestamp when conversation was created
 *   updatedAt: timestamp          // Firestore timestamp when conversation was last updated
 *   aiPrefs: {                    // AI preferences per user (added in PRD 2.2) - Map of userId to preferences
 *     [userId: string]: {
 *       targetLang: string,       // Target language for auto-translation (ISO 639-1 code, e.g., "en", "es", "fr")
 *       autoTranslate: boolean,   // Enable/disable auto-translation for incoming messages
 *       defaultTone?: string      // Default tone for AI replies (future feature in PRD 2.3)
 *     }
 *   }
 * }
 * 
 * Indexes:
 * - participants (array-contains) + lastMessageTime (desc) - For querying user's conversations
 * 
 * Security Rules:
 * - Users can read conversations where they are a participant
 * - Users can create conversations if they are in the participants array
 * - Users can update conversations if they are a participant
 * 
 * Example Direct Conversation:
 * {
 *   id: "conv_1698765432101_a5b2c",
 *   participants: ["user123", "user456"],
 *   type: "direct",
 *   groupName: null,
 *   groupPhoto: null,
 *   createdBy: "user123",
 *   lastMessage: "Hey, how are you?",
 *   lastMessageTime: Timestamp(1698765432101),
 *   createdAt: Timestamp(1698765000000),
 *   updatedAt: Timestamp(1698765432101)
 * }
 * 
 * Example Group Conversation:
 * {
 *   id: "conv_1698765999999_x7y8z",
 *   participants: ["user123", "user456", "user789"],
 *   type: "group",
 *   groupName: "Team Project",
 *   groupPhoto: null,
 *   createdBy: "user123",
 *   lastMessage: "Let's schedule a meeting",
 *   lastMessageTime: Timestamp(1698765999999),
 *   createdAt: Timestamp(1698765000000),
 *   updatedAt: Timestamp(1698765999999)
 * }
 */

/**
 * COLLECTION: messages
 * ====================
 * 
 * Path: /messages/{messageId}
 * 
 * Purpose: Stores individual messages sent in conversations
 * 
 * Schema:
 * {
 *   id: string                           // Auto-generated message ID (format: msg_timestamp_random)
 *   conversationId: string               // ID of the parent conversation
 *   senderId: string                     // User ID of the message sender
 *   text: string                         // Message text content
 *   imageUrl: string | null              // URL of attached image (null if no image)
 *   timestamp: timestamp                 // Firestore timestamp when message was sent
 *   status: "pending" | "sent" | "delivered" | "failed"  // Message delivery status
 *   readBy: string[]                     // Array of user IDs who have read this message
 *   createdAt: timestamp                 // Firestore timestamp when message document was created
 *   aiMeta: {                            // AI-generated metadata (optional, added in PRD 2.1)
 *     detectedLang?: string,             // Detected language of the message (ISO 639-1 code)
 *     translatedText?: {                 // Translations keyed by language code
 *       [lang: string]: string           // e.g., { "en": "Hello", "es": "Hola" }
 *     },
 *     explanation?: string,              // Cultural context explanation
 *     slangDefinition?: string,          // Slang/idiom definition
 *     feedback?: "positive" | "negative" // User rating of translation quality (added in PRD 2.2)
 *   }
 * }
 * 
 * Indexes:
 * - conversationId + timestamp (desc) - For querying messages in a conversation
 * - conversationId + status - For querying pending/failed messages
 * 
 * Security Rules:
 * - Users can read messages from conversations they participate in
 * - Users can create messages if they are the sender and a participant in the conversation
 * - Users can update messages to mark them as read (add their ID to readBy array)
 * 
 * Example Document (without AI metadata):
 * {
 *   id: "msg_1698765432101_k3m9n2p",
 *   conversationId: "conv_1698765432101_a5b2c",
 *   senderId: "user123",
 *   text: "Hey, how are you?",
 *   imageUrl: null,
 *   timestamp: Timestamp(1698765432101),
 *   status: "sent",
 *   readBy: ["user123"],
 *   createdAt: Timestamp(1698765432101)
 * }
 * 
 * Example Document (with AI metadata):
 * {
 *   id: "msg_1698765432102_x4y5z",
 *   conversationId: "conv_1698765432101_a5b2c",
 *   senderId: "user456",
 *   text: "Estoy bien, gracias!",
 *   imageUrl: null,
 *   timestamp: Timestamp(1698765432102),
 *   status: "sent",
 *   readBy: ["user123", "user456"],
 *   createdAt: Timestamp(1698765432102),
 *   aiMeta: {
 *     detectedLang: "es",
 *     translatedText: {
 *       "en": "I'm good, thanks!"
 *     },
 *     explanation: "Common Spanish greeting response, informal and friendly.",
 *     slangDefinition: null,
 *     feedback: "positive"
 *   }
 * }
 */

/**
 * COLLECTION: aiUsage
 * ===================
 * 
 * Path: /aiUsage/{usageId}
 * 
 * Purpose: Tracks AI feature usage for monitoring and cost analysis (added in PRD 2.1)
 * 
 * Schema:
 * {
 *   userId: string                     // User ID who made the request
 *   featureType: "translate" | "explain" | "define"  // Type of AI feature used
 *   inputTokens: number                // Number of input tokens used
 *   outputTokens: number               // Number of output tokens used
 *   totalTokens: number                // Total tokens (input + output)
 *   model: string                      // Model used (e.g., "gpt-4o-mini")
 *   cost: number                       // Cost in USD
 *   timestamp: timestamp               // When the request was made
 * }
 * 
 * Indexes:
 * - userId + timestamp (desc) - For querying a user's usage history
 * - timestamp (desc) - For overall usage analytics
 * 
 * Security Rules:
 * - Only Cloud Functions can write to this collection
 * - Users can read their own usage documents
 * 
 * Example Document:
 * {
 *   userId: "user123",
 *   featureType: "translate",
 *   inputTokens: 25,
 *   outputTokens: 18,
 *   totalTokens: 43,
 *   model: "gpt-4o-mini",
 *   cost: 0.0000065,
 *   timestamp: Timestamp(1698765432103)
 * }
 */

/**
 * COLLECTION: users
 * =================
 * 
 * Path: /users/{userId}
 * 
 * Purpose: Stores user profile information and presence status
 * (Documented in PRD 02 - Authentication System)
 * (Presence documented in PRD 06 - Read Receipts & Presence)
 * 
 * Schema:
 * {
 *   uid: string              // Firebase Auth UID
 *   email: string            // User email address
 *   displayName: string      // User display name
 *   photoURL: string | null  // Profile photo URL
 *   online: boolean          // Whether user is currently online
 *   lastSeen: timestamp      // Last activity timestamp (updated when user goes offline)
 *   createdAt: timestamp     // Account creation timestamp
 *   expoPushTokens: string[] // Array of Expo push tokens for push notifications (multiple devices)
 *   preferredLanguage: string // Preferred language for auto-translate (ISO 639-1 code, e.g., "en", "es", "zh"). Default: "en" (added in PRD 2.2)
 * }
 * 
 * Indexes:
 * - email - For user search by email
 * - displayName - For user search by name
 * 
 * Security Rules:
 * - All authenticated users can read user documents (for displaying names/photos/presence)
 * - Users can only update their own document (including online status)
 * 
 * Presence Update Pattern:
 * - online is set to true when user logs in or app becomes active
 * - online is set to false when user logs out or after 30s of app being backgrounded
 * - lastSeen is updated whenever online changes to false
 * - Updates are debounced (300ms) to reduce Firestore writes
 */

/**
 * QUERY PATTERNS
 * ==============
 * 
 * 1. Get user's conversations (ordered by recent activity):
 *    query(
 *      collection(db, 'conversations'),
 *      where('participants', 'array-contains', userId),
 *      orderBy('lastMessageTime', 'desc')
 *    )
 * 
 * 2. Get messages in a conversation (most recent first, limited):
 *    query(
 *      collection(db, 'messages'),
 *      where('conversationId', '==', conversationId),
 *      orderBy('timestamp', 'desc'),
 *      limit(100)
 *    )
 * 
 * 3. Find existing direct conversation between two users:
 *    query(
 *      collection(db, 'conversations'),
 *      where('participants', '==', [userId1, userId2]),
 *      where('type', '==', 'direct'),
 *      limit(1)
 *    )
 *    Note: This requires participants to be in consistent order (alphabetically sorted)
 * 
 * 4. Search users by email:
 *    query(
 *      collection(db, 'users'),
 *      where('email', '>=', searchTerm),
 *      where('email', '<=', searchTerm + '\uf8ff'),
 *      limit(10)
 *    )
 */

/**
 * FIRESTORE RULES SUMMARY
 * =======================
 * 
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     
 *     // Users collection
 *     match /users/{userId} {
 *       allow read: if request.auth != null;
 *       allow write: if request.auth.uid == userId;
 *     }
 *     
 *     // Conversations collection
 *     match /conversations/{conversationId} {
 *       allow read: if request.auth.uid in resource.data.participants;
 *       allow create: if request.auth.uid in request.resource.data.participants;
 *       allow update: if request.auth.uid in resource.data.participants;
 *     }
 *     
 *     // Messages collection
 *     match /messages/{messageId} {
 *       allow read: if request.auth != null;
 *       allow create: if request.auth.uid == request.resource.data.senderId;
 *       allow update: if request.auth != null;
 *     }
 *   }
 * }
 */

// Export empty object to make this a valid TypeScript module
export {};

