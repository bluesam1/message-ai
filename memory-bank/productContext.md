# Product Context

## Why This Exists

MessageAI is being built as a foundation for AI-enhanced communication. The MVP focuses on creating a rock-solid messaging platform that can later integrate intelligent features like summarization, translation, and action extraction.

## Problems It Solves

### 1. Reliable Real-Time Communication
**Problem:** Users need instant, reliable messaging that works even with poor connectivity.

**Solution:** 
- Optimistic UI updates show messages instantly (< 50ms)
- SQLite caching enables offline operation
- Automatic sync when connectivity returns
- Real-time Firestore listeners for live updates

### 2. Group Communication
**Problem:** Users need to communicate with multiple people simultaneously.

**Solution:**
- Group chat with 3+ participants
- Add members by email
- Group-aware read receipts
- Shared group history

### 3. User Awareness
**Problem:** Users don't know if their messages have been read or if recipients are available.

**Solution:**
- Read receipts (single/double checkmarks)
- Online/offline presence indicators
- "Last seen" timestamps
- Real-time status updates

### 4. Rich Communication
**Problem:** Text-only messaging is limiting for modern communication.

**Solution:**
- Image sharing from gallery
- Automatic compression (1920px, 80% quality)
- Fast uploads to Firebase Storage
- Inline image display with proper loading states

### 5. Notification Awareness
**Problem:** Users miss messages when not actively looking at the app.

**Solution:**
- Foreground push notifications
- Tap to navigate to conversation
- Smart notification filtering (don't notify for active conversation)

## How It Should Work

### Core User Flows

#### First Time User
1. Download and open app
2. Register with email/password OR sign in with Google
3. Set display name (auto-filled for Google users)
4. Grant notification permissions
5. See empty conversation list with "New Chat" button

#### Starting a One-on-One Chat
1. Tap "New Chat" button
2. Search for user by email or name
3. Select user from results
4. Start typing message
5. Message appears instantly in UI
6. Message syncs to Firestore in background
7. Recipient sees message in real-time

#### Sending Messages
1. Type in message input field
2. Tap send button
3. Message appears immediately with "sending" indicator
4. Single checkmark when sent to server
5. Double checkmark when delivered to recipient
6. Blue double checkmark when read

#### Group Chat
1. Tap "New Group" button
2. Enter group name
3. Add members by email (minimum 2 others)
4. Review member list
5. Create group
6. Send messages to entire group
7. See who has read with "Read by X of Y"

#### Offline Usage
1. User sends message while offline
2. Message appears immediately with "pending" indicator
3. Message saved to local SQLite
4. When connectivity returns, banner shows "Reconnecting..."
5. Messages automatically upload to Firestore
6. Status updates to "sent" then "delivered"

#### Receiving Messages
1. User has app open (foreground)
2. New message arrives in different conversation
3. Push notification displays with sender name and preview
4. User taps notification
5. App navigates to that conversation
6. Messages automatically marked as read

## User Experience Goals

### Speed
- **Instant feedback:** Every action feels immediate
- **No loading spinners:** Use optimistic updates and caching
- **Smooth scrolling:** 60 FPS even with 100+ messages
- **Fast app launch:** < 2.5 seconds cold start

### Reliability
- **Works offline:** Core functionality doesn't break without internet
- **Automatic recovery:** Sync happens transparently when online
- **No data loss:** SQLite persistence survives app crashes
- **Error handling:** Clear messages, retry options for failures

### Simplicity
- **Minimal UI:** Focus on content, not chrome
- **Obvious actions:** No hidden features or complex gestures
- **Clear feedback:** Always show what's happening (loading, sending, etc.)
- **Forgiving:** Prevent errors, guide users to success

### Social Awareness
- **Know who's around:** See who's online before sending
- **Message accountability:** Know when messages are read
- **Group dynamics:** See who participates, who reads
- **Timely communication:** Notifications keep conversations flowing

## Design Principles

### 1. Performance First
Every feature must meet strict performance targets. If a feature causes lag or stuttering, it's not ready.

### 2. Offline-Capable by Default
Design every feature to work offline first, sync online second. Users shouldn't notice the difference.

### 3. Optimistic Everything
Show results immediately, sync in background. If something fails, show retry options.

### 4. Test What Matters
Focus tests on business logic and utilities. Don't waste time testing Firebase or React Native itself.

### 5. Keep It Simple
Use default components, standard patterns, minimal dependencies. Complexity is the enemy of shipping.

### 6. Fail Gracefully
Network errors, permissions denied, storage full—handle every edge case with clear messaging and recovery options.

## Success Metrics (User-Facing)

### Engagement
- Users send messages immediately after registration (< 5 min)
- Average session includes 10+ messages
- Groups created within first day of use

### Performance (User-Perceived)
- Zero complaints about lag or stuttering
- No "app feels slow" feedback
- Positive comments on speed and responsiveness

### Reliability
- No reports of lost messages
- Offline mode "just works" without user awareness
- Sync happens transparently without user intervention

## Future AI Integration (Context for Design Decisions)

The architecture is designed to support future AI features:

### Message Summarization
- Long conversations summarized automatically
- Catch up on missed group chats quickly

### Real-Time Translation
- Translate messages between languages
- Maintain original text alongside translation

### Action Extraction
- Detect tasks, events, reminders in messages
- Create calendar events or todos automatically

### Smart Replies
- Context-aware reply suggestions
- Learn from user's messaging style

This context informs current architectural decisions:
- Message data structure supports metadata (for AI annotations)
- SQLite schema extensible for AI features
- Cloud Functions pathway planned (for server-side AI processing)

---

**Key Insight:** Build the fastest, most reliable messaging app possible. AI features are the future—solid messaging is the foundation.



