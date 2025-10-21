# PRD 05: Group Chat

## Overview
Enable users to create group conversations with 3+ participants, add members by email, prevent duplicate additions, and send/receive group messages. Extends the one-on-one messaging infrastructure to support multi-party conversations.

**Timeline:** Hours 14-17 of 24-hour MVP development  
**Priority:** CRITICAL (Core requirement)

---

## Goals
1. Allow users to create group conversations with 3+ participants
2. Enable adding members to groups by email address
3. Prevent duplicate member additions
4. Support sending and receiving messages in group context
5. Display group member list
6. Write unit tests for group logic (70%+ coverage)

---

## User Stories
- **US-009:** As a user, I want to create a group chat with 3+ users so we can have group conversations
- **US-010:** As a user, I want to add members to a group by email so I can invite specific people
- **US-011:** As a user, I want the app to prevent duplicate additions so I don't accidentally add someone twice
- **US-GROUP-001:** As a user, I want to see who's in the group so I know who will receive my messages
- **US-GROUP-002:** As a user, I want to name my group so I can identify it easily
- **US-GROUP-003:** As a group member, I want to receive all group messages so I don't miss conversations

---

## Functional Requirements

### Data Model Updates

1. Update conversation document schema to support groups:
   ```
   conversations/{conversationId}
     - id: string
     - participants: string[] (array of userIds, 2+ for direct, 3+ for group)
     - type: "direct" | "group"
     - groupName: string | null (required for groups)
     - groupPhoto: string | null (optional, can defer)
     - createdBy: string (userId of creator)
     - lastMessage: string
     - lastMessageTime: timestamp
     - createdAt: timestamp
     - updatedAt: timestamp
   ```

2. Messages work the same way - no schema changes needed
   - `conversationId` links to group conversation
   - `readBy` array tracks who has read (for read receipts)

### Creating Groups

3. Add "New Group" button on conversations list
4. Show group creation flow:
   - **Step 1:** Enter group name (required, 3-50 characters)
   - **Step 2:** Add members by email
     - Search/input field for email addresses
     - Validate email format
     - Look up user by email in Firestore `users` collection
     - If found, add to pending members list
     - If not found, show error: "No user found with this email"
   - **Step 3:** Review members (show display names and avatars)
   - Require minimum 2 other members (3 total including creator)

5. On group creation:
   - Generate unique conversationId
   - Create conversation document with type: "group"
   - Add creator and all selected members to `participants[]`
   - Set `groupName` from user input
   - Set `createdBy` to current user's ID
   - Navigate to group chat screen

### Adding Members to Existing Groups

6. Show "Add Members" option in group chat header menu
7. Open member picker (same as group creation)
8. For each selected email:
   - Validate email format
   - Look up user in Firestore
   - Check if already in `participants[]`
   - If duplicate, show warning: "User already in group"
   - If new, add to group

9. Update conversation document:
   - Add new user IDs to `participants[]` array using `arrayUnion`
   - Update `updatedAt` timestamp

10. Post system message in chat (optional but nice):
    - "[User] added [New Member] to the group"

### Displaying Group Conversations

11. On conversation list:
    - Show group name as conversation title
    - Show group icon (default: first letter of group name or group avatar)
    - Show last message and sender name: "Alice: Hello everyone"
    - Show participant count: "5 members"

12. On chat screen header:
    - Display group name
    - Show member count
    - Add "Group Info" button (⋮ menu)

13. Group Info screen:
    - Display group name (editable by creator - optional for MVP)
    - List all members with avatars and names
    - Show "Add Members" button
    - Show "Leave Group" button (optional for MVP, can defer)

### Group Messaging

14. Sending messages in groups works same as one-on-one:
    - Message includes `conversationId` (which is the group)
    - All participants with active Firestore listeners receive message
    - Message saved to local SQLite for each participant

15. Displaying group messages:
    - Show sender name above each message (if different from previous)
    - Show sender avatar next to message
    - Own messages still aligned right
    - Others' messages aligned left with avatar

16. Read receipts in groups:
    - Track `readBy[]` array per message
    - Show read count: "Read by 3 of 5"
    - Tap to see list of who has read (optional, can defer)

### Validation & Error Handling

17. Email validation:
    - Must match email regex pattern
    - Must exist in `users` collection
    - If not found, suggest they sign up first

18. Duplicate prevention:
    - Check `participants[]` array before adding
    - Show clear error message if duplicate
    - Don't allow creator to add themselves

19. Minimum participants:
    - Enforce 3+ total members for group creation
    - Show error if user tries to create with < 2 others

---

## Non-Goals (Out of Scope)
- ❌ Remove members from group (optional feature, can defer)
- ❌ Leave group (optional, can defer)
- ❌ Group admin roles (post-MVP)
- ❌ Group permissions (mute members, etc.)
- ❌ Group photo upload (can defer, use default icon)
- ❌ Edit group name after creation (optional)
- ❌ Group invitations via link (post-MVP)
- ❌ Group chat limits (max participants)

---

## Performance Requirements

| Action | Target | Maximum |
|--------|--------|---------|
| Create group | < 500ms | 1s |
| Add member | < 300ms | 500ms |
| Load group messages | < 150ms | 300ms |
| Send group message | < 100ms | 200ms |

---

## Technical Considerations

### Conversation Service Updates
```typescript
// src/services/messaging/conversationService.ts
export const conversationService = {
  createGroup: async (
    groupName: string,
    participantEmails: string[],
    creatorId: string
  ) => {
    // Look up user IDs from emails
    const participantIds = await getUserIdsByEmails(participantEmails);
    
    // Validate minimum participants
    if (participantIds.length < 2) {
      throw new Error('Group must have at least 3 members');
    }
    
    // Create conversation document
    const conversationId = generateConversationId();
    await setDoc(doc(db, 'conversations', conversationId), {
      id: conversationId,
      type: 'group',
      groupName,
      participants: [creatorId, ...participantIds],
      createdBy: creatorId,
      lastMessage: '',
      lastMessageTime: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return conversationId;
  },
  
  addMembersToGroup: async (
    conversationId: string,
    newMemberEmails: string[]
  ) => {
    // Look up user IDs
    const newMemberIds = await getUserIdsByEmails(newMemberEmails);
    
    // Get existing participants
    const conversation = await getConversation(conversationId);
    
    // Check for duplicates
    const duplicates = newMemberIds.filter(id =>
      conversation.participants.includes(id)
    );
    
    if (duplicates.length > 0) {
      throw new Error('Some users are already in the group');
    }
    
    // Add to group
    await updateDoc(doc(db, 'conversations', conversationId), {
      participants: arrayUnion(...newMemberIds),
      updatedAt: Date.now(),
    });
  },
};
```

### User Lookup Utility
```typescript
// src/utils/userLookup.ts
export async function getUserByEmail(email: string): Promise<User | null> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.toLowerCase()));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as User;
}

export async function getUserIdsByEmails(
  emails: string[]
): Promise<string[]> {
  const promises = emails.map(email => getUserByEmail(email));
  const users = await Promise.all(promises);
  
  return users
    .filter(user => user !== null)
    .map(user => user!.id);
}
```

### Validation Utilities
```typescript
// src/utils/groupValidation.ts
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function isDuplicateMember(
  memberId: string,
  existingMembers: string[]
): boolean {
  return existingMembers.includes(memberId);
}

export function validateGroupName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Group name is required' };
  }
  if (name.length < 3) {
    return { valid: false, error: 'Group name must be at least 3 characters' };
  }
  if (name.length > 50) {
    return { valid: false, error: 'Group name must be less than 50 characters' };
  }
  return { valid: true };
}
```

---

## Design Considerations

### Group Creation Flow
```
Screen 1: Name Group
┌────────────────────────┐
│ Create Group           │
├────────────────────────┤
│ Group Name:            │
│ [Text Input]           │
│                        │
│ [Next Button]          │
└────────────────────────┘

Screen 2: Add Members
┌────────────────────────┐
│ Add Members            │
├────────────────────────┤
│ Enter email:           │
│ [Email Input] [Add]    │
│                        │
│ Members (2):           │
│ • Alice (alice@...)    │
│ • Bob (bob@...)        │
│                        │
│ [Create Group]         │
└────────────────────────┘
```

### Group Chat Header
```
┌────────────────────────────┐
│ ← [Group Icon] Group Name  │
│   5 members            ⋮   │
└────────────────────────────┘
```

### Group Message Display
```
┌──────────────────────────┐
│ Alice                    │
│ [Avatar] Hello everyone  │
│          10:30 AM        │
│                          │
│                Hello! ✓✓ │
│               10:31 AM   │
│                          │
│ Bob                      │
│ [Avatar] Hey there       │
│          10:32 AM        │
└──────────────────────────┘
```

---

## Success Metrics
- ✅ Users can create groups with 3+ members
- ✅ Email lookup finds existing users
- ✅ Duplicate member prevention works
- ✅ Group messages send to all participants
- ✅ Group member list displays correctly
- ✅ 70%+ unit test coverage for group validation

---

## Acceptance Criteria
- [ ] "New Group" button visible on conversations list
- [ ] Group creation flow implemented (name + add members)
- [ ] Email validation works (format and user existence)
- [ ] User lookup by email returns correct user
- [ ] Duplicate member check prevents re-adding
- [ ] Minimum 3 participants enforced
- [ ] Group conversation created in Firestore with correct schema
- [ ] Group appears in conversation list with name and member count
- [ ] Group chat screen displays group name and member count
- [ ] Messages sent in group received by all members
- [ ] Group messages show sender name and avatar
- [ ] "Add Members" functionality works for existing groups
- [ ] Group Info screen shows member list
- [ ] Unit tests for email validation written
- [ ] Unit tests for duplicate prevention written
- [ ] Unit tests for group name validation written
- [ ] Tests pass in < 30 seconds

---

## Testing Requirements

### Unit Tests
```typescript
// __tests__/utils/groupValidation.test.ts
describe('isValidEmail', () => {
  it('should validate correct email format', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });
  
  it('should reject invalid email', () => {
    expect(isValidEmail('notanemail')).toBe(false);
  });
});

describe('isDuplicateMember', () => {
  it('should detect duplicate member', () => {
    const existing = ['user1', 'user2'];
    expect(isDuplicateMember('user1', existing)).toBe(true);
  });
  
  it('should allow new member', () => {
    const existing = ['user1', 'user2'];
    expect(isDuplicateMember('user3', existing)).toBe(false);
  });
});

describe('validateGroupName', () => {
  it('should accept valid group name', () => {
    const result = validateGroupName('Team Chat');
    expect(result.valid).toBe(true);
  });
  
  it('should reject empty name', () => {
    const result = validateGroupName('');
    expect(result.valid).toBe(false);
  });
  
  it('should reject name too short', () => {
    const result = validateGroupName('ab');
    expect(result.valid).toBe(false);
  });
});

// __tests__/services/conversationService.test.ts
describe('conversationService', () => {
  it('should create group with valid participants', async () => {});
  it('should throw error for < 3 participants', async () => {});
  it('should prevent adding duplicate members', async () => {});
});
```

### Manual Testing
- [ ] Create group with 3 users, verify appears in list
- [ ] Create group with 2 users, verify error shown
- [ ] Add member with invalid email, verify error shown
- [ ] Add member with email not in system, verify error shown
- [ ] Try to add duplicate member, verify prevented
- [ ] Send message in group from one user, verify all receive it
- [ ] Test group with 5+ members
- [ ] Add new member to existing group
- [ ] View group info screen, verify all members listed
- [ ] Test on both Android and iOS

---

## Open Questions
- Should we allow group name editing after creation? (Recommendation: Yes, but defer to post-MVP)
- What's the maximum group size? (Recommendation: No limit for MVP, add later if needed)
- Can non-creators add members? (Recommendation: Yes for MVP, add admin roles later)

---

## Dependencies
- **Depends on:** PRD 03 (Core Messaging) - extends one-on-one to groups
- **Blocks:** None (other features can develop in parallel)

---

## Resources
- [Firestore Array Operations](https://firebase.google.com/docs/firestore/manage-data/add-data#update_elements_in_an_array)
- [Email Validation Regex](https://emailregex.com/)



