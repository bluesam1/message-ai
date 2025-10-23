# PRD 2.5: User Management & Safety

**Phase:** 2 - International Communicator  
**Sub-Phase:** 2.5  
**Duration:** 4-6 hours  
**Dependencies:** Phase 1 complete (core messaging working)

---

## 🎯 Objective

Give users control over their conversations and interactions through features for leaving/deleting chats, blocking users, and managing conversation preferences. Enhance safety and user autonomy while maintaining data integrity.

---

## 📋 Scope

### Leaving & Deleting Chats

**Group Chats: Leave**
- User can leave a group chat they're part of
- System removes user from participants list
- System message notifies remaining members: "[User] left the chat"
- User can no longer send or receive messages in that group
- If last participant leaves, conversation is deleted entirely

**Direct Chats: Delete**
- User can delete a one-on-one conversation
- Conversation marked as hidden for that user (soft delete)
- Other participant still sees conversation
- When both users delete, conversation can be archived or purged

**Technical Requirements**
- Add "Leave Chat" option to group conversation long-press menu
- Add "Delete Chat" option to direct conversation long-press menu
- Confirmation dialog with clear explanation of action
- Update Firestore conversation document (remove from participants or add to hiddenFor)
- Add system message when user leaves group
- Delete conversation document if no participants remain
- Update local SQLite to hide conversation from list
- Sync deletion across devices

### Blocking Users

**User Experience**
- User can block another user from profile screen or conversation menu
- Confirmation dialog explains what blocking does:
  - Blocked user cannot send messages
  - Online status hidden from blocked user
  - Existing conversations hidden from view
  - Can unblock later from settings
- Blocked users stored in user profile
- Blocked user's messages filtered from UI

**Technical Requirements**
- Add "Block User" button to user profile screen
- Add "Block User" option to conversation menu (direct chats only)
- Confirmation dialog with clear explanation
- Update user document with blocked users array
- Filter Firestore queries to exclude blocked users
- Hide conversations with blocked users
- Prevent blocked users from starting new conversations
- Hide online/offline status from blocked users
- Add "Blocked Users" list in settings (with unblock option)

### Related Features

**Archive Conversations**
- User can archive conversations (hide from main list)
- Archived conversations accessible in "Archived" folder
- New message in archived conversation unarchives it automatically

**Mute Notifications**
- User can mute notifications per conversation
- Muted conversations show mute icon
- Messages still visible, just no notifications
- Unmute option available

**Report User (Placeholder)**
- "Report User" option in menu (future moderation feature)
- Currently shows "Coming soon" message
- Logs report for future implementation

---

## 🗄️ Data Model Changes

### Firestore Schema Extensions

**users collection:**
Add blocking and preference fields:

```typescript
blockedUsers: string[],        // Array of blocked user IDs
mutedConversations: string[]   // Array of muted conversation IDs
```

**conversations collection:**
Add visibility and archive fields:

```typescript
hiddenFor: string[],          // User IDs who deleted this chat
archivedBy: string[]          // User IDs who archived this chat
```

**messages collection:**
Add soft delete flag:

```typescript
isDeleted: boolean            // Soft delete flag (preserve for sync integrity)
```

---

## 👤 User Stories

**Leaving & Deleting:**
- **US-054:** As a user, I can leave a group chat I no longer want to be part of.
- **US-055:** As a group member, I want to see a notification when someone leaves the chat.
- **US-056:** As a user, I can delete a one-on-one conversation from my view.
- **US-057:** As a user, I expect deleted conversations to remain for the other person until they also delete.

**Blocking:**
- **US-058:** As a user, I can block another user to prevent them from contacting me.
- **US-059:** As a user, I want blocked users' messages to be hidden from my view.
- **US-060:** As a user, I want my online status hidden from blocked users.
- **US-061:** As a user, I can view my list of blocked users and unblock them if needed.

**Archive & Mute:**
- **US-062:** As a user, I can archive conversations to clean up my main list without deleting them.
- **US-063:** As a user, I can mute notifications for specific conversations without leaving them.

---

## ✅ Success Criteria

### Functional Requirements: Leave/Delete
- [ ] User can leave group chat from conversation menu
- [ ] System message appears when user leaves
- [ ] User removed from participants array in Firestore
- [ ] Last participant leaving deletes conversation entirely
- [ ] User can delete direct chat (marked as hidden, not deleted)
- [ ] Deleted chats remain for other participant
- [ ] When both users delete, conversation archived/purged
- [ ] Confirmation dialogs clear and helpful

### Functional Requirements: Blocking
- [ ] User can block another user from profile or menu
- [ ] Blocked users array updated in Firestore
- [ ] Conversations with blocked users hidden from list
- [ ] Blocked users cannot send new messages
- [ ] Online status hidden from blocked users
- [ ] Blocked users list accessible in settings
- [ ] User can unblock from blocked users list
- [ ] Firestore security rules enforce blocking

### Functional Requirements: Archive/Mute
- [ ] User can archive conversation (moves to archive folder)
- [ ] New message in archived conversation unarchives it
- [ ] User can mute conversation (no notifications)
- [ ] Mute icon visible on muted conversations
- [ ] User can unmute conversation

### Performance Targets
| Metric | Target | Maximum |
|--------|--------|---------|
| Leave/Delete Action | < 500ms | 1s |
| Block User Action | < 500ms | 1s |
| Archive/Mute Action | < 200ms | 500ms |
| Blocked User Filter | < 100ms | 200ms |

### Quality Requirements
- Data integrity maintained (no orphaned messages or conversations)
- Real-time sync of leave/delete actions across devices
- Firestore security rules prevent blocked users from writing
- Clear user feedback for all actions (toasts, confirmations)

---

## 🎨 UI/UX Requirements

### Conversation Long-Press Menu

**Group Chats:**
- Archive
- Mute Notifications
- Leave Chat (destructive action, confirm required)

**Direct Chats:**
- Archive
- Mute Notifications
- Block User
- Delete Chat (destructive action, confirm required)

### Confirmation Dialogs

**Leave Group Chat:**
```
Title: Leave "[Group Name]"?
Body: You will no longer receive messages from this group. 
      Other members will be notified that you left.
Actions: [Cancel] [Leave]
```

**Delete Conversation:**
```
Title: Delete Conversation?
Body: This conversation will be removed from your list. 
      [Other user] will still be able to see it.
Actions: [Cancel] [Delete]
```

**Block User:**
```
Title: Block [User Name]?
Body: They won't be able to contact you or see when you're online.
      You can unblock them later from Settings.
Actions: [Cancel] [Block]
```

### Settings Screen

**Blocked Users Section:**
- List of blocked users with avatars and names
- "Unblock" button next to each
- Empty state: "No blocked users"

**Archived Conversations:**
- Separate folder in conversation list
- Swipe gesture to unarchive
- Empty state: "No archived conversations"

---

## 🚫 Out of Scope

- Remove user from group (admin-only feature, future)
- Group admin controls (promotions, permissions, etc.)
- User reporting and moderation system (placeholder only)
- Message deletion or editing
- Conversation export or backup

---

## 🧪 Testing Requirements

### Leave Group Chat Testing
- [ ] User leaves group, verify removed from participants
- [ ] System message appears for remaining members
- [ ] Verify user cannot send messages after leaving
- [ ] Last participant leaves, conversation deleted
- [ ] Test with 2-person group (should delete when one leaves)

### Delete Conversation Testing
- [ ] Delete direct chat, verify hidden for user
- [ ] Other user still sees conversation
- [ ] Both users delete, verify conversation archived
- [ ] Test deleting with unread messages
- [ ] Verify deleted conversation doesn't reappear on new message

### Block User Testing
- [ ] Block user, verify added to blockedUsers array
- [ ] Conversations with blocked user hidden
- [ ] Blocked user cannot send new messages
- [ ] Online status hidden from blocked user
- [ ] Unblock user, verify conversations reappear
- [ ] Test blocking conversation starter (should hide conversation)

### Archive/Mute Testing
- [ ] Archive conversation, verify moves to archive folder
- [ ] New message in archived conversation unarchives it
- [ ] Mute conversation, verify no notifications
- [ ] Unmute conversation, verify notifications resume
- [ ] Test archive/mute persistence across app restarts

### Data Integrity Testing
- [ ] No orphaned messages after delete/leave
- [ ] Firestore writes complete successfully
- [ ] SQLite mirrors Firestore state
- [ ] Real-time sync across multiple devices
- [ ] Security rules prevent blocked users from writing

---

## 📊 Performance Benchmarks

### Action Response Times
- Leave group: < 500ms (UI update) + < 1s (Firestore write)
- Delete conversation: < 200ms (UI update) + < 500ms (Firestore write)
- Block user: < 500ms (UI update) + < 1s (Firestore write)
- Archive: < 100ms (UI update) + < 200ms (Firestore write)

### Query Performance
- Conversation list with blocked users filtered: < 500ms
- Archived conversations load: < 300ms

### Data Consistency
- Real-time sync of leave/delete: < 2s across devices
- Block action reflected on other devices: < 3s

---

## 🔐 Security & Privacy Considerations

**Firestore Security Rules:**
- Users can only add themselves to `hiddenFor` or `archivedBy`
- Users can only remove themselves from `participants`
- Users can only update their own `blockedUsers` array
- Blocked users cannot write to conversations with blocking user
- System messages for leaving are write-protected

**Privacy:**
- Blocked users do not know they've been blocked (no notification)
- Deleted conversations remain private (other user cannot see deletion status)
- User data (blockedUsers, archivedBy) not exposed to other users

**Data Retention:**
- Soft delete strategy preserves data integrity
- Hard deletion only when all participants delete conversation
- Blocked user data retained in case of unblock

---

## 📝 Documentation Requirements

- [ ] Update README with user management features
- [ ] Document blocking system and privacy implications
- [ ] Create user guide for leaving groups and blocking users
- [ ] Document Firestore schema changes (blockedUsers, hiddenFor, etc.)
- [ ] Add troubleshooting guide for common scenarios

---

## 🎬 Demo Requirements

For sub-phase completion, demonstrate:

1. **Leave Group:** Leave a group chat, show system message for others
2. **Delete Conversation:** Delete direct chat, verify hidden but persists for other user
3. **Block User:** Block a user, show conversations hidden and online status hidden
4. **Unblock User:** Unblock from settings, show conversations reappear
5. **Archive:** Archive conversation, show it moves to archive folder
6. **Mute:** Mute conversation, send message, verify no notification

---

## 🚀 Deployment Checklist

- [ ] Firestore schema updated (blockedUsers, hiddenFor, archivedBy)
- [ ] Security rules updated to enforce blocking and deletion logic
- [ ] UI components for leave/delete/block actions implemented
- [ ] Confirmation dialogs implemented
- [ ] Settings screen with blocked users list
- [ ] Archive folder in conversation list
- [ ] Mute icon and functionality
- [ ] System messages for group leave events
- [ ] Real-time sync tested and working
- [ ] SQLite migration for new fields (if needed)

---

## 📈 Success Metrics

**Quantitative:**
- User adoption: > 20% of users use block/archive/mute within first month
- Feature usage: Average user manages 2-3 conversations per week
- Support tickets: < 5% related to confusion about these features

**Qualitative:**
- Users feel in control of their conversations
- Blocking provides sense of safety
- Archive/mute improve conversation organization
- Clear and intuitive UX (validated through user feedback)

---

## 🔄 Next Steps

Upon completion of Sub-Phase 2.5:
- Proceed to **Sub-Phase 2.6** (Performance & Polish)
- All user-facing features complete
- Final focus on optimization, testing, and demo preparation

---

**Status:** Not Started  
**Assigned To:** TBD  
**Target Completion:** TBD

