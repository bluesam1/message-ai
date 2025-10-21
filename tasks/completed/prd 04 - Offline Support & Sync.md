# PRD 04: Offline Support & Sync

## Overview
Enable users to send messages while offline, queue them locally, and automatically sync when connectivity is restored. Ensure message persistence survives app restarts and handles edge cases like duplicate prevention.

**Timeline:** Hours 10-14 of 24-hour MVP development  
**Priority:** CRITICAL (Core requirement)

---

## Goals
1. Allow users to send messages without internet connection
2. Queue pending messages locally in SQLite
3. Automatically sync queued messages when online
4. Prevent duplicate messages during sync
5. Handle conflicts and edge cases gracefully
6. Achieve 70%+ unit test coverage for offline logic

---

## User Stories
- **US-008:** As a user, I want to send messages while offline so I can compose replies without waiting for connectivity
- **US-OFFLINE-001:** As a user, I want queued messages to send automatically when I reconnect so I don't have to manually retry
- **US-OFFLINE-002:** As a user, I want to see my offline messages with a "pending" indicator so I know they haven't sent yet
- **US-OFFLINE-003:** As a user, I want messages to persist across app restarts even if they haven't synced so I don't lose my drafts

---

## Functional Requirements

### Offline Detection
1. Monitor network connectivity state using `@react-native-community/netinfo`
2. Maintain global `isOnline` state in app
3. Display connectivity indicator in UI:
   - Offline: Show banner "You're offline. Messages will send when connected."
   - Reconnecting: Show "Reconnecting..."
   - Online: Hide banner (or briefly show "Back online")

### Offline Message Queue
4. Create `pendingMessages` table in SQLite:
   ```sql
   CREATE TABLE pendingMessages (
     id TEXT PRIMARY KEY,
     conversationId TEXT,
     senderId TEXT,
     text TEXT,
     imageUrl TEXT,
     timestamp INTEGER,
     retryCount INTEGER DEFAULT 0,
     createdAt INTEGER
   );
   ```

5. When user sends message while offline:
   - Generate unique message ID
   - Save to `pendingMessages` table
   - Save to main `messages` table with status "pending"
   - Display in UI with "pending" indicator (clock icon or single checkmark)

### Automatic Sync
6. Listen to network state changes
7. When transitioning from offline → online:
   - Trigger sync process immediately
   - Query all messages with status "pending" from `pendingMessages`
   - Process queue in chronological order (oldest first)

8. For each pending message:
   - Upload to Firestore
   - Update conversation's `lastMessage` and `lastMessageTime`
   - On success:
     - Update message status to "sent" in local SQLite
     - Remove from `pendingMessages` table
     - Update UI
   - On failure:
     - Increment `retryCount`
     - If retryCount < 3, keep in queue for next retry
     - If retryCount >= 3, mark as "failed" and notify user

### Duplicate Prevention
9. Use deterministic message IDs (include timestamp + sender ID + random suffix)
10. Before uploading to Firestore, check if message with same ID already exists:
    ```typescript
    const docRef = doc(db, 'messages', messageId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, message);
    }
    ```
11. When receiving messages from Firestore, check SQLite before inserting:
    - Query local DB for message ID
    - If exists, skip insertion
    - If new, insert into SQLite

### Message Deduplication Logic
12. Implement message merging when loading conversations:
    ```typescript
    function mergeMessages(cachedMessages, liveMessages) {
      const messageMap = new Map();
      
      // Add cached messages first
      cachedMessages.forEach(msg => messageMap.set(msg.id, msg));
      
      // Live messages override cached (fresher data)
      liveMessages.forEach(msg => messageMap.set(msg.id, msg));
      
      return Array.from(messageMap.values())
        .sort((a, b) => a.timestamp - b.timestamp);
    }
    ```

### Retry Mechanism
13. Implement exponential backoff for retries:
    - First retry: Immediate
    - Second retry: Wait 5 seconds
    - Third retry: Wait 15 seconds
    - After 3 failures: Mark as failed, show manual retry button

14. Provide manual retry option:
    - Show "!" icon on failed messages
    - Tap message to show "Retry" button
    - On retry, reset retryCount and attempt upload again

### Background Sync
15. When app is backgrounded with pending messages:
    - Keep pending messages in SQLite
    - On app resume, check connectivity
    - If online, trigger sync process

---

## Non-Goals (Out of Scope)
- ❌ Background sync while app is completely closed (requires background tasks)
- ❌ Conflict resolution for edited messages (no editing in MVP)
- ❌ Offline image uploads (images require connection in MVP)
- ❌ Intelligent sync scheduling (use simple immediate sync)
- ❌ Sync status dashboard for users

---

## Performance Requirements

| Action | Target | Maximum |
|--------|--------|---------|
| Add to offline queue | < 20ms | 50ms |
| Sync 10 messages | < 2s | 5s |
| Sync 100 messages | < 10s | 20s |
| Duplicate check | < 10ms | 20ms |

---

## Technical Considerations

### Network Monitoring Service
```typescript
// src/services/network/networkService.ts
import NetInfo from '@react-native-community/netinfo';

let isOnline = true;
const listeners: Array<(online: boolean) => void> = [];

export const networkService = {
  initialize: () => {
    NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      isOnline = state.isConnected ?? false;
      
      // Notify listeners
      listeners.forEach(listener => listener(isOnline));
      
      // Trigger sync if reconnected
      if (wasOffline && isOnline) {
        syncService.syncPendingMessages();
      }
    });
  },
  
  isOnline: () => isOnline,
  
  subscribe: (listener: (online: boolean) => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  },
};
```

### Offline Queue Service
```typescript
// src/services/messaging/offlineQueueService.ts
export const offlineQueueService = {
  addToQueue: async (message: Message) => {
    await db.executeSql(
      'INSERT INTO pendingMessages (id, conversationId, senderId, text, timestamp, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [message.id, message.conversationId, message.senderId, message.text, message.timestamp, Date.now()]
    );
  },
  
  getPendingMessages: async (): Promise<Message[]> => {
    const result = await db.executeSql(
      'SELECT * FROM pendingMessages ORDER BY timestamp ASC'
    );
    return result.rows._array;
  },
  
  removeFromQueue: async (messageId: string) => {
    await db.executeSql('DELETE FROM pendingMessages WHERE id = ?', [messageId]);
  },
  
  incrementRetryCount: async (messageId: string) => {
    await db.executeSql(
      'UPDATE pendingMessages SET retryCount = retryCount + 1 WHERE id = ?',
      [messageId]
    );
  },
};
```

### Sync Service
```typescript
// src/services/messaging/syncService.ts
export const syncService = {
  syncPendingMessages: async () => {
    if (!networkService.isOnline()) return;
    
    const pending = await offlineQueueService.getPendingMessages();
    
    for (const message of pending) {
      try {
        // Check if already uploaded
        const exists = await checkMessageExists(message.id);
        if (exists) {
          await offlineQueueService.removeFromQueue(message.id);
          continue;
        }
        
        // Upload to Firestore
        await messageService.uploadMessage(message);
        
        // Update local status
        await sqliteService.updateMessageStatus(message.id, 'sent');
        
        // Remove from queue
        await offlineQueueService.removeFromQueue(message.id);
        
      } catch (error) {
        console.error(`Failed to sync message ${message.id}:`, error);
        
        await offlineQueueService.incrementRetryCount(message.id);
        const retryCount = await getRetryCount(message.id);
        
        if (retryCount >= 3) {
          await sqliteService.updateMessageStatus(message.id, 'failed');
        }
      }
    }
  },
};
```

### Deduplication Utility
```typescript
// src/utils/messageDeduplication.ts
export function deduplicateMessages(messages: Message[]): Message[] {
  const seen = new Set<string>();
  return messages.filter(msg => {
    if (seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });
}

export function mergeMessageLists(
  cached: Message[],
  live: Message[]
): Message[] {
  const map = new Map<string, Message>();
  
  cached.forEach(msg => map.set(msg.id, msg));
  live.forEach(msg => map.set(msg.id, msg)); // Live overwrites cached
  
  return Array.from(map.values())
    .sort((a, b) => a.timestamp - b.timestamp);
}
```

---

## Design Considerations

### Offline Indicator Banner
```
┌─────────────────────────────────────┐
│ ⚠️  You're offline. Messages will   │
│     send when connected.            │
└─────────────────────────────────────┘
```

### Message Status Icons
- Pending (offline): 🕒 Clock icon or single gray checkmark
- Sending (online): Spinner animation
- Sent: Single checkmark ✓
- Delivered: Double checkmark ✓✓
- Failed: ❗ Red exclamation mark + "Retry" option

---

## Success Metrics
- ✅ Messages sent offline appear in UI immediately
- ✅ Queued messages sync automatically on reconnection
- ✅ No duplicate messages after sync
- ✅ Sync completes within performance targets
- ✅ Failed messages show retry option after 3 attempts
- ✅ 70%+ unit test coverage for offline logic

---

## Acceptance Criteria
- [ ] NetInfo integrated and monitoring network state
- [ ] Offline banner displays when disconnected
- [ ] Users can send messages while offline
- [ ] Offline messages saved to `pendingMessages` table
- [ ] Messages show "pending" status indicator
- [ ] Sync process triggers on reconnection
- [ ] Queued messages upload to Firestore in order
- [ ] Successfully synced messages removed from queue
- [ ] Message status updates to "sent" after sync
- [ ] No duplicate messages in conversation
- [ ] Retry mechanism works with exponential backoff
- [ ] Failed messages (3+ retries) show manual retry button
- [ ] Deduplication logic prevents duplicate insertions
- [ ] App restart preserves pending messages
- [ ] Unit tests cover queue operations (add, remove, retry)
- [ ] Unit tests cover deduplication logic
- [ ] Tests pass in < 30 seconds

---

## Testing Requirements

### Unit Tests
```typescript
// __tests__/services/offlineQueueService.test.ts
describe('offlineQueueService', () => {
  it('should add message to queue', async () => {});
  it('should retrieve pending messages in order', async () => {});
  it('should remove message from queue', async () => {});
  it('should increment retry count', async () => {});
});

// __tests__/utils/messageDeduplication.test.ts
describe('deduplicateMessages', () => {
  it('should remove duplicate message IDs', () => {
    const messages = [
      { id: '1', text: 'Hello' },
      { id: '2', text: 'World' },
      { id: '1', text: 'Hello' }, // Duplicate
    ];
    const result = deduplicateMessages(messages);
    expect(result).toHaveLength(2);
  });
});

describe('mergeMessageLists', () => {
  it('should prefer live messages over cached', () => {
    const cached = [{ id: '1', text: 'Old', status: 'pending' }];
    const live = [{ id: '1', text: 'Old', status: 'sent' }];
    const result = mergeMessageLists(cached, live);
    expect(result[0].status).toBe('sent');
  });
  
  it('should combine unique messages', () => {
    const cached = [{ id: '1', text: 'Cached' }];
    const live = [{ id: '2', text: 'Live' }];
    const result = mergeMessageLists(cached, live);
    expect(result).toHaveLength(2);
  });
});
```

### Manual Testing
- [ ] Turn off WiFi/data, send message, verify it appears with pending status
- [ ] Turn WiFi/data back on, verify message syncs automatically
- [ ] Send 10 messages offline, reconnect, verify all sync in order
- [ ] Close app with pending messages, reopen offline, verify messages still pending
- [ ] Simulate Firestore failure (disconnect), verify retry mechanism
- [ ] Force 3 failures, verify manual retry button appears
- [ ] Test duplicate prevention: send same message twice while offline
- [ ] Test on both Android and iOS

---

## Open Questions
- Should we batch sync messages (e.g., 10 at a time) or one by one? (Recommendation: One by one to update UI progressively)
- What happens if user sends 500 messages offline? (Recommendation: Add queue limit of 100 messages, warn user)

---

## Dependencies
- **Depends on:** PRD 03 (Core Messaging) - extends messaging with offline capabilities
- **Blocks:** None (other features can develop in parallel)

---

## Resources
- [@react-native-community/netinfo](https://github.com/react-native-netinfo/react-native-netinfo)
- [Expo SQLite Transactions](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Firebase Offline Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)



