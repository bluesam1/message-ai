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
 * Example Document:
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
 */

/**
 * COLLECTION: users
 * =================
 * 
 * Path: /users/{userId}
 * 
 * Purpose: Stores user profile information
 * (Documented in PRD 02 - Authentication System)
 * 
 * Schema:
 * {
 *   uid: string              // Firebase Auth UID
 *   email: string            // User email address
 *   displayName: string      // User display name
 *   photoURL: string | null  // Profile photo URL
 *   createdAt: timestamp     // Account creation timestamp
 *   lastSeen: timestamp      // Last activity timestamp
 * }
 * 
 * Indexes:
 * - email - For user search by email
 * - displayName - For user search by name
 * 
 * Security Rules:
 * - All authenticated users can read user documents (for displaying names/photos)
 * - Users can only update their own document
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

