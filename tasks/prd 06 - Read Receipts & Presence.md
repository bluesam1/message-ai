# PRD 06: Read Receipts & Presence

## Overview
Implement read receipts to show message read status and online presence indicators to show when users are active. These social features enhance user awareness and engagement without blocking core messaging functionality.

**Timeline:** Hours 17-19 of 24-hour MVP development  
**Priority:** CRITICAL (Core requirement)

---

## Goals
1. Track and display when messages have been read
2. Show online/offline status for users
3. Display "last seen" timestamps for offline users
4. Update presence in real-time with minimal server load
5. Implement debounced updates to reduce Firestore writes

---

## User Stories
- **US-014:** As a user, I want to see read receipts so I know when my messages have been read
- **US-015:** As a user, I want to see online/offline status so I know when someone is available
- **US-PRESENCE-001:** As a user, I want to see "last seen" time for offline users so I know when they were last active
- **US-PRESENCE-002:** As a user, I want read receipts to work in group chats so I know who has read my messages

---

## Functional Requirements

### Read Receipts for One-on-One Chats

1. Update `readBy` array when user views conversation:
   ```typescript
   messages/{messageId}
     - readBy: string[] (array of userIds who have read)
   ```

2. Mark messages as read when:
   - User opens a conversation
   - User scrolls message into view (if implementing lazy loading)
   - User has conversation open in foreground

3. Batch mark messages as read:
   - When conversation opens, mark all unread messages as read
   - Use single Firestore batch write for performance
   - Update local SQLite simultaneously

4. Display read status for own messages:
   - **Sent:** Single checkmark (message in Firestore)
   - **Delivered:** Double checkmark (recipient received via listener)
   - **Read:** Double blue checkmark (recipient marked as read)

5. Only track read status for direct messages initially
   - Group read tracking is more complex (see separate section)

### Read Receipts for Group Chats

6. Track `readBy` array for group messages (same schema)

7. Display read count on message:
   - "Read by 3 of 5" below message
   - Show blue checkmarks when all have read
   - Gray checkmarks when partially read

8. Optional: Tap to view who has read (can defer to post-MVP)
   - Show list of members who have/haven't read
   - Display avatars and names

### Online Presence Indicators

9. Update user's `online` status in Firestore:
   ```typescript
   users/{userId}
     - online: boolean
     - lastSeen: timestamp
   ```

10. Set `online: true` when:
    - User authenticates
    - App comes to foreground
    - User performs any action (debounced)

11. Set `online: false` when:
    - User signs out
    - App goes to background (with 30s delay)
    - User explicitly goes offline (optional feature)

12. Use Firebase `onDisconnect()` to handle crashes:
    ```typescript
    const userRef = ref(database, `status/${userId}`);
    onDisconnect(userRef).set({
      online: false,
      lastSeen: serverTimestamp(),
    });
    ```

### Presence Display

13. On conversation list:
    - Show green dot next to online users
    - Show "last seen" time for offline users

14. On chat screen header:
    - Show "Online" for active users (green text)
    - Show "Last seen [time ago]" for offline users (gray text)
    - Update in real-time as status changes

15. Presence indicator states:
    - **Online:** Green dot + "Online" text
    - **Offline < 1 hour:** "Last seen 30m ago"
    - **Offline > 1 hour:** "Last seen at 2:30 PM"
    - **Offline > 24 hours:** "Last seen yesterday"
    - **Offline > 7 days:** "Last seen on 10/15"

### Debouncing & Performance

16. Debounce presence updates:
    - Don't update Firestore on every interaction
    - Use 300ms debounce timer
    - Batch status updates when possible

17. Debounce read receipts:
    - Mark messages as read after 1 second of viewing
    - Batch multiple read updates together

18. Cache presence data locally:
    - Don't query Firestore for presence on every render
    - Use real-time listener for active conversations only
    - Update local cache when changes detected

### Background Handling

19. On app backgrounded:
    - Wait 30 seconds before marking offline
    - Allows quick app switching without status flicker
    - Cancel timer if app returns to foreground

20. On app foregrounded:
    - Immediately mark online
    - Sync latest presence for all active conversations

---

## Non-Goals (Out of Scope)
- ❌ Typing indicators (optional feature, can defer)
- ❌ Custom status messages ("Available", "Busy", etc.)
- ❌ Precise "typing..." animation timing
- ❌ Read receipt privacy settings (hide read status)
- ❌ "Delivered" vs "Read" distinction in groups (too complex)
- ❌ Presence history/analytics

---

## Performance Requirements

| Action | Target | Maximum |
|--------|--------|---------|
| Mark message as read | < 50ms (local) | 100ms |
| Batch read update | < 200ms | 500ms |
| Update presence status | < 100ms | 200ms |
| Debounce delay | 300ms | 500ms |

---

## Technical Considerations

### Read Receipt Service
```typescript
// src/services/messaging/readReceiptService.ts
export const readReceiptService = {
  markMessagesAsRead: async (
    messageIds: string[],
    userId: string
  ) => {
    const batch = writeBatch(db);
    
    messageIds.forEach(messageId => {
      const messageRef = doc(db, 'messages', messageId);
      batch.update(messageRef, {
        readBy: arrayUnion(userId),
      });
    });
    
    await batch.commit();
    
    // Update local SQLite
    await sqliteService.markMessagesAsRead(messageIds, userId);
  },
  
  getUnreadMessages: async (
    conversationId: string,
    userId: string
  ): Promise<string[]> => {
    // Query messages where readBy doesn't include userId
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      where('readBy', 'not-in', [userId])
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.id);
  },
};
```

### Presence Service
```typescript
// src/services/user/presenceService.ts
import { debounce } from 'lodash';

let presenceTimer: NodeJS.Timeout | null = null;

export const presenceService = {
  initialize: async (userId: string) => {
    // Set online immediately
    await updatePresence(userId, true);
    
    // Set up disconnect handler
    const userStatusRef = ref(realtimeDb, `status/${userId}`);
    await onDisconnect(userStatusRef).set({
      online: false,
      lastSeen: serverTimestamp(),
    });
  },
  
  setOnline: debounce(async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), {
      online: true,
      lastSeen: Date.now(),
    });
  }, 300),
  
  setOffline: async (userId: string, delayMs: number = 30000) => {
    // Cancel existing timer
    if (presenceTimer) clearTimeout(presenceTimer);
    
    // Set offline after delay
    presenceTimer = setTimeout(async () => {
      await updateDoc(doc(db, 'users', userId), {
        online: false,
        lastSeen: Date.now(),
      });
    }, delayMs);
  },
  
  cancelOfflineTimer: () => {
    if (presenceTimer) {
      clearTimeout(presenceTimer);
      presenceTimer = null;
    }
  },
  
  listenToPresence: (userId: string, callback: (online: boolean, lastSeen: number) => void) => {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, (snapshot) => {
      const data = snapshot.data();
      if (data) {
        callback(data.online, data.lastSeen);
      }
    });
  },
};
```

### Presence Display Utility
```typescript
// src/utils/presenceUtils.ts
export function formatLastSeen(lastSeen: number): string {
  const now = Date.now();
  const diff = now - lastSeen;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  if (hours < 24) return `Last seen ${hours}h ago`;
  if (days === 1) return 'Last seen yesterday';
  if (days < 7) return `Last seen ${days} days ago`;
  
  return `Last seen on ${new Date(lastSeen).toLocaleDateString()}`;
}

export function getPresenceColor(online: boolean): string {
  return online ? '#4CAF50' : '#9E9E9E';
}

export function getPresenceText(online: boolean, lastSeen: number): string {
  if (online) return 'Online';
  return formatLastSeen(lastSeen);
}
```

### App State Handling
```typescript
// src/hooks/useAppState.ts
import { useEffect } from 'react';
import { AppState } from 'react-native';

export function usePresenceUpdates(userId: string) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        presenceService.cancelOfflineTimer();
        presenceService.setOnline(userId);
      } else if (state === 'background' || state === 'inactive') {
        presenceService.setOffline(userId, 30000);
      }
    });
    
    return () => subscription.remove();
  }, [userId]);
}
```

---

## Design Considerations

### Read Receipt Icons
- Sent (single checkmark): ✓ (gray)
- Delivered (double checkmark): ✓✓ (gray)
- Read (double checkmark): ✓✓ (blue)
- Failed: ❗ (red)

### Presence Indicator
```
Conversation List:
┌────────────────────────────┐
│ 🟢 Alice                   │
│    Hey there!   2:30 PM    │
├────────────────────────────┤
│ ⚫ Bob                     │
│    Thanks!   Yesterday     │
│    Last seen 2h ago        │
└────────────────────────────┘

Chat Header:
┌────────────────────────────┐
│ ← Alice                    │
│   🟢 Online                │
└────────────────────────────┘

or

┌────────────────────────────┐
│ ← Bob                      │
│   Last seen 2h ago         │
└────────────────────────────┘
```

---

## Success Metrics
- ✅ Read receipts update when messages viewed
- ✅ Online status updates in real-time
- ✅ "Last seen" displays correctly for offline users
- ✅ Presence updates debounced (< 1 write per 300ms)
- ✅ Background/foreground transitions handled correctly
- ✅ Read receipts work in group chats

---

## Acceptance Criteria
- [ ] Messages marked as read when conversation opened
- [ ] Read status stored in Firestore `readBy` array
- [ ] Own messages show correct read receipt icons
- [ ] One-on-one read receipts show blue checkmarks when read
- [ ] Group messages show "Read by X of Y" count
- [ ] Online status updates on login/logout
- [ ] Green dot shows for online users on conversation list
- [ ] "Online" text shows in chat header for active users
- [ ] "Last seen" time displays for offline users
- [ ] Last seen formatting works (minutes, hours, days)
- [ ] Presence updates debounced to reduce Firestore writes
- [ ] App backgrounding waits 30s before marking offline
- [ ] App foregrounding immediately marks online
- [ ] onDisconnect handler configured for crash scenarios
- [ ] No performance degradation from presence updates

---

## Testing Requirements

### Unit Tests
```typescript
// __tests__/utils/presenceUtils.test.ts
describe('formatLastSeen', () => {
  it('should return "Just now" for < 1 minute', () => {
    const lastSeen = Date.now() - 30000; // 30 seconds ago
    expect(formatLastSeen(lastSeen)).toBe('Just now');
  });
  
  it('should return minutes for < 1 hour', () => {
    const lastSeen = Date.now() - 300000; // 5 minutes ago
    expect(formatLastSeen(lastSeen)).toMatch(/Last seen \d+m ago/);
  });
  
  it('should return hours for < 24 hours', () => {
    const lastSeen = Date.now() - 7200000; // 2 hours ago
    expect(formatLastSeen(lastSeen)).toMatch(/Last seen \d+h ago/);
  });
  
  it('should return "yesterday" for 1 day ago', () => {
    const lastSeen = Date.now() - 86400000; // 1 day ago
    expect(formatLastSeen(lastSeen)).toBe('Last seen yesterday');
  });
});

describe('getPresenceText', () => {
  it('should return "Online" for online users', () => {
    expect(getPresenceText(true, Date.now())).toBe('Online');
  });
  
  it('should return formatted time for offline users', () => {
    const lastSeen = Date.now() - 300000;
    expect(getPresenceText(false, lastSeen)).toMatch(/Last seen/);
  });
});
```

### Manual Testing
- [ ] Open conversation, verify messages marked as read
- [ ] Send message from another device, verify blue checkmarks appear
- [ ] Close app, reopen, verify still shows as online
- [ ] Background app for 30s, verify status changes to offline
- [ ] Test "last seen" formatting with various time differences
- [ ] Test group read receipts show correct count
- [ ] Force close app (simulate crash), verify onDisconnect triggers
- [ ] Test debouncing: rapid actions shouldn't cause excessive writes
- [ ] Monitor Firestore usage - should not exceed reasonable limits
- [ ] Test on both Android and iOS

---

## Open Questions
- Should users be able to disable read receipts? (Recommendation: Not for MVP)
- How long should we wait before marking offline on background? (Recommendation: 30 seconds)

---

## Dependencies
- **Depends on:** PRD 03 (Core Messaging) - extends messaging with social features
- **Can develop in parallel with:** PRD 07 (Image Sharing), PRD 08 (Push Notifications)

---

## Resources
- [Firebase Realtime Database Presence](https://firebase.google.com/docs/database/web/offline-capabilities#section-presence)
- [React Native AppState](https://reactnative.dev/docs/appstate)
- [Lodash Debounce](https://lodash.com/docs/4.17.15#debounce)


