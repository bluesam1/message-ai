# Tasks: PRD 03 - Core One-on-One Messaging

## Relevant Files

- `src/types/message.ts` - TypeScript types for messages and conversations
- `src/utils/messageUtils.ts` - Message utility functions (ID generation, relative time, deduplication)
- `src/utils/messageUtils.test.ts` - Unit tests for message utilities
- `src/config/firestoreSchema.ts` - Firestore collection structure documentation
- `src/services/sqlite/sqliteService.ts` - SQLite database service for local message persistence
- `src/services/sqlite/sqliteService.test.ts` - Unit tests for SQLite service
- `src/services/messaging/messageService.ts` - Core messaging service with send/receive logic
- `src/services/messaging/messageService.test.ts` - Unit tests for message service
- `src/services/messaging/conversationService.ts` - Conversation management service
- `src/services/messaging/conversationService.test.ts` - Unit tests for conversation service
- `src/components/chat/MessageBubble.tsx` - Individual message bubble component
- `src/components/chat/MessageBubble.test.tsx` - Unit tests for MessageBubble
- `src/components/chat/MessageInput.tsx` - Message input component with send button
- `src/components/chat/MessageInput.test.tsx` - Unit tests for MessageInput
- `src/components/chat/MessageList.tsx` - Optimized FlatList for message display
- `src/components/chat/MessageList.test.tsx` - Unit tests for MessageList
- `src/components/users/UserPicker.tsx` - User selection component for starting chats
- `src/components/users/UserPicker.test.tsx` - Unit tests for UserPicker
- `app/(tabs)/conversations.tsx` - Conversations list screen with "New Chat" button
- `app/(tabs)/chat/[id].tsx` - Individual chat screen
- `src/hooks/useMessages.ts` - Custom hook for message management
- `src/hooks/useConversation.ts` - Custom hook for conversation management

### Notes

- Unit tests should typically be placed alongside the code files they are testing
- Use `npx jest [optional/path/to/test/file]` to run tests
- Follow performance requirements: message send UI < 50ms, scroll at 60 FPS
- Implement optimistic UI updates for instant feedback

## Tasks

- [x] 1.0 Set up data models and database infrastructure
  - [x] 1.1 Create `src/types/message.ts` with Message and Conversation TypeScript interfaces matching Firestore structure
  - [x] 1.2 Create `src/utils/messageUtils.ts` with `generateMessageId()` function (format: msg_timestamp_randomstring)
  - [x] 1.3 Add `getRelativeTime(timestamp)` function to messageUtils for displaying "Just now", "5m ago", etc.
  - [x] 1.4 Add `formatTimestamp(timestamp)` utility for absolute time display
  - [x] 1.5 Document Firestore collection structures in comments (conversations and messages collections)

- [x] 2.0 Implement SQLite local persistence layer
  - [x] 2.1 Create `src/services/sqlite/sqliteService.ts` and initialize with expo-sqlite
  - [x] 2.2 Implement `initDatabase()` to create conversations and messages tables with proper schema
  - [x] 2.3 Add index on messages(conversationId, timestamp) for query performance
  - [x] 2.4 Implement `saveMessage(message)` with INSERT OR REPLACE logic
  - [x] 2.5 Implement `getMessages(conversationId, limit)` to retrieve messages ordered by timestamp DESC
  - [x] 2.6 Implement `updateMessageStatus(messageId, status)` for status transitions
  - [x] 2.7 Implement `saveConversation(conversation)` for conversation persistence
  - [x] 2.8 Implement `getConversations()` to retrieve all conversations ordered by lastMessageTime DESC
  - [x] 2.9 Implement `deleteMessage(messageId)` and `deleteConversation(conversationId)` for cleanup

- [x] 3.0 Create conversation management system
  - [x] 3.1 Create `src/services/messaging/conversationService.ts` with findOrCreateConversation logic
  - [x] 3.2 Implement Firestore query to check if conversation exists between two users
  - [x] 3.3 Implement conversation creation with proper participant array and metadata
  - [x] 3.4 Create `src/components/users/UserPicker.tsx` with searchable user list (query by email/displayName)
  - [x] 3.5 Add "New Chat" button to conversations list screen (`app/(tabs)/index.tsx`)
  - [x] 3.6 Implement navigation flow: New Chat → UserPicker → findOrCreate → Chat Screen
  - [x] 3.7 Update conversations list UI to display lastMessage, lastMessageTime, and participant info

- [x] 4.0 Build message sending functionality with optimistic updates
  - [x] 4.1 Create `src/components/chat/MessageInput.tsx` with TextInput and Send button
  - [x] 4.2 Enable Send button only when text is non-empty (trim whitespace)
  - [x] 4.3 Create `src/services/messaging/messageService.ts` with `sendMessage()` function
  - [x] 4.4 Implement optimistic update: generate messageId, create message object with status 'pending'
  - [x] 4.5 Add message to local state immediately for instant UI feedback
  - [x] 4.6 Save message to SQLite before Firestore upload
  - [x] 4.7 Upload message to Firestore messages collection with proper error handling
  - [x] 4.8 Update message status to 'sent' on successful upload, 'failed' on error
  - [x] 4.9 Update conversation's lastMessage and lastMessageTime in both Firestore and SQLite
  - [x] 4.10 Add retry button/logic for failed messages
  - [x] 4.11 Clear input field after successful send

- [x] 5.0 Implement real-time message receiving
  - [x] 5.1 Create `listenToMessages(conversationId, callback)` in messageService with Firestore onSnapshot
  - [x] 5.2 Set up query with where('conversationId', '==', conversationId) and orderBy('timestamp', 'desc')
  - [x] 5.3 Implement message deduplication logic (check if message already exists by ID)
  - [x] 5.4 Save received messages to SQLite for offline access
  - [x] 5.5 Update local state with new messages
  - [x] 5.6 Implement auto-scroll to bottom when user is near bottom of list
  - [x] 5.7 Create `loadCachedMessages(conversationId)` to load from SQLite on conversation open
  - [x] 5.8 Implement cache-first strategy: load SQLite immediately, then set up Firestore listener
  - [x] 5.9 Merge cached and live messages without duplicates
  - [x] 5.10 Clean up Firestore listener on conversation unmount

- [x] 6.0 Create message display UI with performance optimizations
  - [x] 6.1 Create `src/components/chat/MessageBubble.tsx` with React.memo for memoization
  - [x] 6.2 Implement different styles for own messages (right-aligned, blue) vs others (left-aligned, gray)
  - [x] 6.3 Add avatar display for other users' messages
  - [x] 6.4 Add timestamp display using getRelativeTime utility
  - [x] 6.5 Add message status indicators (pending: spinner, sent: ✓, delivered: ✓✓, failed: ❌)
  - [x] 6.6 Create `src/components/chat/MessageList.tsx` with FlatList component
  - [x] 6.7 Configure FlatList with performance settings: inverted, removeClippedSubviews, maxToRenderPerBatch=10, windowSize=10
  - [x] 6.8 Implement getItemLayout if message heights are consistent for better performance
  - [x] 6.9 Create chat screen at `app/chat/[id].tsx` with MessageList and MessageInput
  - [x] 6.10 Add header with back button and recipient name
  - [x] 6.11 Implement pull-to-refresh for loading older messages (pagination)
  - [x] 6.12 Create `src/hooks/useMessages.ts` custom hook to manage message state and listeners
  - [x] 6.13 Create `src/hooks/useConversation.ts` custom hook for conversation metadata

- [x] 7.0 Write comprehensive unit tests
  - [x] 7.1 Create `__tests__/utils/messageUtils.test.ts` and test generateMessageId (uniqueness, format)
  - [x] 7.2 Test getRelativeTime with various time differences (< 1min, < 1hr, < 1day, > 1day)
  - [x] 7.3 Create `__tests__/services/messageService.test.ts` and test sendMessage with optimistic updates
  - [x] 7.4 Test status transitions from pending → sent and pending → failed
  - [x] 7.5 Test listenToMessages callback receives new messages
  - [x] 7.6 Create `__tests__/services/sqlite/sqliteService.test.ts` and test database initialization
  - [x] 7.7 Test saveMessage and getMessages CRUD operations
  - [x] 7.8 Test message deduplication in getMessages
  - [x] 7.9 Create `__tests__/services/conversationService.test.ts` and test findOrCreateConversation
  - [x] 7.10 Test conversation creation and retrieval
  - [x] 7.11 Create `__tests__/components/chat/MessageBubble.test.tsx` and test rendering for own/other messages
  - [x] 7.12 Test status indicator display
  - [x] 7.13 Create `__tests__/components/chat/MessageInput.test.tsx` and test send button enabled/disabled state
  - [x] 7.14 Test message sending on button press
  - [x] 7.15 Run all tests with `npx jest` and verify 70%+ coverage
  - [x] 7.16 Fix any failing tests and ensure tests run in < 30 seconds


