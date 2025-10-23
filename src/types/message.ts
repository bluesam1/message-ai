/**
 * Message and Conversation types for MessageAI
 * Matches Firestore collection structures
 */

/**
 * Message status enum
 * - pending: Message is being sent
 * - sent: Message successfully uploaded to Firestore
 * - delivered: Message received by recipient
 * - failed: Message failed to send
 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';

/**
 * Conversation type enum
 * - direct: One-on-one conversation
 * - group: Group conversation (multiple participants)
 */
export type ConversationType = 'direct' | 'group';

/**
 * AI metadata for messages
 * Stores AI-generated content like translations, explanations, and definitions
 */
export interface AIMetadata {
  /** Detected language of the original message */
  detectedLang?: string;
  
  /** Translations keyed by language code (e.g., { en: "Hello", es: "Hola" }) */
  translatedText?: { [lang: string]: string };
  
  /** Cultural context explanation */
  explanation?: string;
  
  /** Slang or idiom definition */
  slangDefinition?: string;
}

/**
 * Message interface
 * Represents a single message in a conversation
 * Stored in both Firestore (messages collection) and SQLite (messages table)
 */
export interface Message {
  /** Unique message ID (format: msg_timestamp_randomstring) */
  id: string;
  
  /** ID of the conversation this message belongs to */
  conversationId: string;
  
  /** User ID of the message sender */
  senderId: string;
  
  /** Message text content */
  text: string;
  
  /** Optional image URL (for image messages) */
  imageUrl: string | null;
  
  /** Message timestamp (milliseconds since epoch) */
  timestamp: number;
  
  /** Message delivery status */
  status: MessageStatus;
  
  /** Array of user IDs who have read this message */
  readBy: string[];
  
  /** Message creation timestamp (milliseconds since epoch) */
  createdAt: number;
  
  /** AI-generated metadata (translations, explanations, definitions) */
  aiMeta?: AIMetadata;
}

/**
 * Conversation interface
 * Represents a conversation between users
 * Stored in both Firestore (conversations collection) and SQLite (conversations table)
 */
export interface Conversation {
  /** Unique conversation ID */
  id: string;
  
  /** Array of participant user IDs */
  participants: string[];
  
  /** Conversation type (direct or group) */
  type: ConversationType;
  
  /** Group name (required for group conversations, null for direct) */
  groupName: string | null;
  
  /** Group photo URL (optional for group conversations) */
  groupPhoto: string | null;
  
  /** User ID of the conversation creator (for groups, the user who created it) */
  createdBy: string;
  
  /** Preview of the last message sent */
  lastMessage: string;
  
  /** Timestamp of the last message (milliseconds since epoch) */
  lastMessageTime: number;
  
  /** Conversation creation timestamp (milliseconds since epoch) */
  createdAt: number;
  
  /** Last update timestamp (milliseconds since epoch) */
  updatedAt: number;
}

/**
 * Partial message for optimistic updates
 * Used when creating a message before Firestore confirmation
 */
export interface PendingMessage extends Omit<Message, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: number;
}

/**
 * Message with sender information
 * Extended message type that includes sender details for UI display
 */
export interface MessageWithSender extends Message {
  senderName?: string;
  senderPhotoURL?: string;
}

/**
 * Conversation with participant information
 * Extended conversation type that includes participant details for UI display
 */
export interface ConversationWithParticipants extends Conversation {
  participantNames?: string[];
  participantPhotoURLs?: string[];
  otherParticipantId?: string; // For direct conversations, the ID of the other user
  otherParticipantName?: string;
  otherParticipantPhotoURL?: string | null;
}

