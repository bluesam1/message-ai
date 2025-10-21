# PRD 03: Core One-on-One Messaging

## Overview
Implement real-time one-on-one messaging with optimistic UI updates, message persistence, and high-performance message rendering. This is the core functionality of MessageAI.

**Timeline:** Hours 5-10 of 24-hour MVP development  
**Priority:** CRITICAL (Core feature)

---

## Goals
1. Enable users to start one-on-one conversations
2. Send and receive text messages in real-time
3. Provide instant UI feedback with optimistic updates
4. Persist messages locally in SQLite
5. Achieve 60 FPS scrolling performance with 100+ messages
6. Write unit tests for message logic (70%+ coverage)

---

## User Stories
- **US-004:** As a user, I want to start a chat with another user so we can communicate privately
- **US-005:** As a user, I want to send text messages with instant UI feedback so the app feels responsive
- **US-006:** As a user, I want to receive messages in real-time so I can have a live conversation
- **US-007:** As a user, I want messages to persist after restart so I don't lose conversation history
- **US-MSG-001:** As a user, I want to see when my message is sending/sent/delivered so I know its status
- **US-MSG-002:** As a user, I want to scroll through message history smoothly so the app feels fast

---

## Functional Requirements

### Data Models

#### Firestore Collections
1. **Conversations Collection:**
   ```
   conversations/{conversationId}
     - id: string (auto-generated)
     - participants: string[] (array of userIds)
     - type: "direct" | "group"
     - lastMessage: string
     - lastMessageTime: timestamp
     - createdAt: timestamp
     - updatedAt: timestamp
   ```

2. **Messages Collection:**
   ```
   messages/{messageId}
     - id: string (auto-generated)
     - conversationId: string (indexed)
     - senderId: string
     - text: string
     - imageUrl: string | null
     - timestamp: timestamp
     - status: "pending" | "sent" | "delivered" | "failed"
     - readBy: string[] (array of userIds)
     - createdAt: timestamp
   ```

#### SQLite Schema
3. Create local SQLite tables:
   ```sql
   CREATE TABLE conversations (
     id TEXT PRIMARY KEY,
     participants TEXT,  -- JSON array
     type TEXT,
     lastMessage TEXT,
     lastMessageTime INTEGER,
     updatedAt INTEGER
   );

   CREATE TABLE messages (
     id TEXT PRIMARY KEY,
     conversationId TEXT,
     senderId TEXT,
     text TEXT,
     imageUrl TEXT,
     timestamp INTEGER,
     status TEXT,
     readBy TEXT,  -- JSON array
     createdAt INTEGER,
     FOREIGN KEY (conversationId) REFERENCES conversations(id)
   );

   CREATE INDEX idx_messages_conversation ON messages(conversationId, timestamp);
   ```

### Starting Conversations
4. Create "New Chat" button on conversations list screen
5. Show user picker (search users by email or display name)
6. When user selected, check if conversation already exists:
   - Query Firestore for conversation with both participants
   - If exists, navigate to existing conversation
   - If not, create new conversation document
7. Navigate to chat screen with conversationId

### Sending Messages
8. Implement message input component with:
   - Text input field
   - Send button (enabled only when text is non-empty)
9. On send button press:
   - Generate unique messageId (timestamp + random suffix)
   - Create message object with status: "pending"
   - **Optimistic update:** Immediately add to local state and SQLite
   - Display message in UI with "sending" indicator
   - Upload to Firestore
   - Update message status to "sent" on success
   - Update message status to "failed" on error (show retry option)
10. Update conversation's `lastMessage` and `lastMessageTime`

### Receiving Messages
11. Set up Firestore real-time listener on messages collection:
    ```typescript
    query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(100)
    )
    ```
12. On new message received:
    - Save to SQLite
    - Add to local state
    - Scroll to bottom if user is near bottom
    - Update conversation's last message

### Message Display
13. Implement chat screen with FlatList:
    - Inverted list (newest at bottom)
    - Messages grouped by sender
    - Show sender avatar and name
    - Different styles for own messages vs others
    - Timestamp display (relative: "Just now", "5m ago", or absolute)
14. Message component optimizations:
    - Use `React.memo` to prevent unnecessary re-renders
    - Use `getItemLayout` for consistent heights (if possible)
15. FlatList performance settings:
    ```jsx
    <FlatList
      data={messages}
      inverted
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={20}
      updateCellsBatchingPeriod={50}
      getItemLayout={(data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
    />
    ```

### Message Status Indicators
16. Display status for sent messages:
    - Pending: Single gray checkmark or loading spinner
    - Sent: Single checkmark (message in Firestore)
    - Delivered: Double checkmark (recipient received)
    - Failed: Red exclamation mark with retry button

### Loading Strategy
17. On conversation open:
    - **Immediate:** Load last 100 messages from SQLite (cache-first)
    - **Background:** Set up Firestore listener for real-time updates
    - **Merge:** Combine cached and live messages, remove duplicates
18. Implement pull-to-refresh to load older messages (pagination)

---

## Non-Goals (Out of Scope)
- ❌ Message editing (post-MVP)
- ❌ Message deletion (post-MVP)
- ❌ Message reactions (post-MVP)
- ❌ Message forwarding (post-MVP)
- ❌ Voice messages (post-MVP)
- ❌ Video messages (post-MVP)
- ❌ Typing indicators (optional, can defer)
- ❌ Message search (post-MVP)
- ❌ Link previews (post-MVP)

---

## Performance Requirements

| Action | Target | Maximum |
|--------|--------|---------|
| Message send (UI) | < 50ms | 100ms |
| Open conversation | < 100ms | 200ms |
| Scroll 100+ messages | 60 FPS | 55 FPS |
| Message render | < 16ms | 33ms |

**Rule:** If you exceed maximum times, stop and optimize before continuing.

---

## Technical Considerations

### Service Architecture
```typescript
// src/services/messaging/messageService.ts
export const messageService = {
  sendMessage: async (conversationId, text, senderId) => {
    const messageId = generateMessageId();
    const message = {
      id: messageId,
      conversationId,
      senderId,
      text,
      timestamp: Date.now(),
      status: 'pending',
      readBy: [senderId],
    };
    
    // Optimistic update
    await sqliteService.saveMessage(message);
    
    // Upload to Firestore
    try {
      await setDoc(doc(db, 'messages', messageId), message);
      await updateMessageStatus(messageId, 'sent');
    } catch (error) {
      await updateMessageStatus(messageId, 'failed');
      throw error;
    }
  },
  
  listenToMessages: (conversationId, callback) => {
    // Set up Firestore listener
  },
  
  loadCachedMessages: async (conversationId) => {
    // Load from SQLite
  },
};
```

### SQLite Service
```typescript
// src/services/sqlite/sqliteService.ts
export const sqliteService = {
  initDatabase: async () => {
    // Create tables if not exist
  },
  
  saveMessage: async (message) => {
    // Insert or replace message
  },
  
  getMessages: async (conversationId, limit = 100) => {
    // Query messages ordered by timestamp
  },
  
  updateMessageStatus: async (messageId, status) => {
    // Update message status
  },
};
```

### Message ID Generation
```typescript
// src/utils/messageUtils.ts
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}
```

### Optimistic UI Pattern
```typescript
const sendMessage = async (text: string) => {
  const tempMessage = {
    id: generateMessageId(),
    text,
    status: 'pending',
    // ... other fields
  };
  
  // 1. Add to UI immediately
  setMessages(prev => [...prev, tempMessage]);
  
  // 2. Save to SQLite
  await sqliteService.saveMessage(tempMessage);
  
  // 3. Upload to Firestore
  try {
    await messageService.sendMessage(tempMessage);
    // Status updated via Firestore listener
  } catch (error) {
    updateMessageStatus(tempMessage.id, 'failed');
  }
};
```

---

## Design Considerations

### Chat Screen Layout
```
┌─────────────────────────────┐
│ ← Back   [User Name]    ⋮   │ ← Header
├─────────────────────────────┤
│                             │
│  [Other's message]          │
│  [Timestamp]                │
│                             │
│          [My message] ✓✓    │
│          [Timestamp]        │
│                             │
│  [Other's message]          │
│                             │
└─────────────────────────────┘
│ [Text Input]  [Send Button] │ ← Input bar
└─────────────────────────────┘
```

### Message Bubble Styling
- Own messages: Right-aligned, blue/purple background
- Other messages: Left-aligned, gray background
- Show avatar for other users
- Rounded corners, padding
- Max width: 80% of screen

---

## Success Metrics
- ✅ Messages appear in UI < 50ms after sending
- ✅ Real-time updates work (receive messages instantly)
- ✅ Messages persist across app restarts
- ✅ Scrolling 100+ messages maintains 60 FPS
- ✅ No duplicate messages after restart
- ✅ 70%+ unit test coverage for message utilities

---

## Acceptance Criteria
- [ ] Users can start new one-on-one conversations
- [ ] Text messages send successfully to Firestore
- [ ] Messages appear instantly in sender's UI (optimistic update)
- [ ] Real-time listener receives new messages
- [ ] Messages saved to SQLite on send/receive
- [ ] Conversation list shows last message and timestamp
- [ ] Chat screen displays messages in correct order
- [ ] Own messages aligned right, others aligned left
- [ ] Message status indicators work (pending/sent/failed)
- [ ] FlatList scrolls smoothly at 60 FPS with 100+ messages
- [ ] Messages load from SQLite on app restart
- [ ] No duplicate messages after syncing
- [ ] Error handling for failed sends (retry option)
- [ ] Unit tests written for message utilities (ID generation, status updates)
- [ ] Tests pass in < 30 seconds

---

## Testing Requirements

### Unit Tests
```typescript
// __tests__/utils/messageUtils.test.ts
describe('generateMessageId', () => {
  it('should generate unique IDs', () => {});
  it('should include timestamp', () => {});
});

describe('getRelativeTime', () => {
  it('should return "Just now" for recent messages', () => {});
  it('should return minutes for < 1 hour', () => {});
});

// __tests__/services/messageService.test.ts
describe('messageService', () => {
  it('should handle optimistic updates', () => {});
  it('should transition status from pending to sent', () => {});
  it('should mark failed messages correctly', () => {});
});
```

### Manual Testing
- [ ] Send message, verify it appears immediately
- [ ] Send message from another device, verify real-time delivery
- [ ] Send 100+ messages, test scrolling performance
- [ ] Close app, reopen, verify messages still visible
- [ ] Test with slow network (throttle network)
- [ ] Test with no network (should show pending status)
- [ ] Test on both Android and iOS

---

## Open Questions
- None

---

## Dependencies
- **Depends on:** PRD 02 (Authentication System) - users must be authenticated
- **Blocks:** PRD 04 (Offline Support), PRD 05 (Group Chat), PRD 07 (Image Sharing)

---

## Resources
- [Firestore Real-Time Listeners](https://firebase.google.com/docs/firestore/query-data/listen)
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [React Native FlatList Performance](https://reactnative.dev/docs/optimizing-flatlist-configuration)


