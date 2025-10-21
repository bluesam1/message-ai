# MessageAI - MVP PRD (Concise)

**Timeline:** 24 hours | **Platform:** React Native (Expo) | **Backend:** Firebase

---

## Success Criteria

✅ Real-time messaging between 2+ users  
✅ Messages persist across restarts and work offline  
✅ Group chat with 3+ users  
✅ Email/password + Google Sign-In authentication  
✅ Gallery image uploads  
✅ Read receipts and presence indicators  
✅ Foreground push notifications  
✅ **60 FPS performance, instant UI responses**  
✅ **70%+ unit test coverage, tests run < 30s**  
✅ **Pre-commit hooks prevent broken code**

---

## MVP Requirements Checklist

### CRITICAL (Must Have)
- [ ] One-on-one chat with real-time delivery
- [ ] Message persistence (survives restarts)
- [ ] Optimistic UI updates (instant feedback)
- [ ] Online/offline status indicators
- [ ] Email/password authentication
- [ ] Google Sign-In authentication
- [ ] Basic group chat (3+ users)
- [ ] Add members to group by email
- [ ] Message read receipts
- [ ] Gallery image uploads
- [ ] Foreground push notifications
- [ ] Unit tests (70%+ coverage, < 30s runtime)
- [ ] Pre-commit hooks running tests

### OPTIONAL (Defer if Time-Constrained)
- [ ] Remove group members
- [ ] Camera capture
- [ ] Background notifications
- [ ] Typing indicators

---

## Technology Stack

**Frontend:** React Native, Expo, Expo Router, Expo SQLite, Expo Notifications  
**Backend:** Firebase Auth, Firestore, Storage, Cloud Messaging  
**Testing:** Jest, @testing-library/react-native  
**State:** Context API (keep it simple)

---

## Core Architecture

### Data Flow
```
Send: Client → SQLite (optimistic) → Firestore → Real-time sync → Recipients
Receive: Firestore listener → SQLite → UI update
Offline: SQLite → Queue → Sync on reconnect
```

### Firestore Collections
```
users/{userId}
  - email, displayName, photoURL, online, lastSeen

conversations/{conversationId}
  - participants[], type, lastMessage, lastMessageTime, groupName

messages/{messageId}
  - conversationId, senderId, text, imageUrl, timestamp, status, readBy[]
```

### Key Patterns
- **Optimistic UI:** Show message instantly, sync to backend after
- **Cache-First:** Load from SQLite immediately, sync Firestore in background
- **FlatList Optimization:** `removeClippedSubviews`, `maxToRenderPerBatch={10}`, `windowSize={10}`
- **Debounced Updates:** Typing indicators, presence (300ms delay)
- **Image Compression:** 1920px max, 80% quality before upload

---

## Performance Targets

| Action | Target | Maximum |
|--------|--------|---------|
| Message send (UI) | < 50ms | 100ms |
| Open conversation | < 100ms | 200ms |
| Screen navigation | < 200ms | 300ms |
| FPS (scrolling) | 60 FPS | 55 FPS |
| App launch | < 1.5s | 2.5s |

**Rule:** If you exceed maximum times, stop and fix before continuing.

---

## 24-Hour Development Timeline

### Hours 0-2: Setup
- Create Expo project with TypeScript
- Install all dependencies (firebase, expo-sqlite, jest)
- Configure Firebase (Auth, Firestore, Storage, FCM)
- Set up Google Sign-In OAuth (client IDs, URL schemes)
- Configure Jest and pre-commit hooks
- Verify emulator launches

### Hours 2-5: Authentication
- Email/password registration and login
- Google Sign-In integration
- Profile setup (display name, photo)
- Expo Router navigation structure
- Test both auth methods work

### Hours 5-10: Core Messaging
- Firestore message structure
- SQLite schema
- Send/receive messages with real-time listeners
- Optimistic UI updates
- Message list with FlatList
- **Write tests:** Message ID generation, status transitions

### Hours 10-14: Offline & Persistence
- Save messages to SQLite
- Load from SQLite on app open
- Offline queue for pending messages
- Auto-sync on reconnect
- Test offline → online flow
- **Write tests:** Queue logic, deduplication

### Hours 14-17: Group Chat
- Create group conversations
- Add members by email
- Prevent duplicate additions
- Group message send/receive
- Display member list
- **Write tests:** Email validation, duplicate prevention

### Hours 17-19: Read Receipts & Presence
- Track read status in Firestore
- Display read receipts
- Online/offline indicators
- Last seen timestamps

### Hours 19-21: Images
- Expo ImagePicker integration
- Upload to Firebase Storage
- Compress before upload (1920px, 80%)
- Display images in messages
- Handle loading states

### Hours 21-22: Push Notifications
- Install expo-notifications
- Request permissions
- Get FCM token
- Test foreground notifications

### Hours 22-23: iOS Testing
- Build with EAS for iOS
- Deploy to test iPhones
- Test critical flows
- Fix iOS-specific issues

### Hour 23-24: Final Polish
- Run full test suite
- Fix critical bugs
- Test all MVP requirements
- Verify performance (60 FPS)
- Prepare demo video

---

## Critical User Stories

**Authentication**
- US-001: Register with email/password [CRITICAL]
- US-002: Login with email/password [CRITICAL]
- US-003: Sign in with Google [CRITICAL]

**Messaging**
- US-004: Start one-on-one chat [CRITICAL]
- US-005: Send text messages with instant UI feedback [CRITICAL]
- US-006: Receive messages in real-time [CRITICAL]
- US-007: Messages persist after restart [CRITICAL]
- US-008: Send messages while offline, sync on reconnect [CRITICAL]

**Group Chat**
- US-009: Create group with 3+ users [CRITICAL]
- US-010: Add members by email [CRITICAL]
- US-011: Prevent duplicate member additions [CRITICAL]

**Media & Status**
- US-012: Upload images from gallery [CRITICAL]
- US-013: View images in messages [CRITICAL]
- US-014: See read receipts [CRITICAL]
- US-015: See online/offline status [CRITICAL]

**Notifications**
- US-016: Foreground push notifications [CRITICAL]

---

## Firebase Setup (Quick Steps)

1. **Create Firebase Project** at console.firebase.google.com
2. **Enable Authentication:** Email/Password + Google (requires OAuth client IDs)
3. **Create Firestore Database:** Start in test mode
4. **Set Up Storage:** Start in test mode
5. **Configure FCM:** Download config files (google-services.json, GoogleService-Info.plist)
6. **Download Config Files:** Place in project root
7. **Create .env file:**
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Google Sign-In Setup:**
- Go to Google Cloud Console → APIs & Services → Credentials
- Create OAuth 2.0 Client ID for iOS (bundle ID) and Android (SHA-1)
- Add URL scheme to app.json: `"scheme": "com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID"`

---

## Unit Testing Requirements

### Setup
```bash
npm install --save-dev jest @testing-library/react-native
```

### What to Test
✅ Message utilities (ID generation, status transitions)  
✅ Offline queue (add, remove, deduplication)  
✅ Validation (email, duplicate members)  
✅ Business logic (message merging, sorting)

❌ DON'T test: UI components, Firebase operations, navigation

### Coverage Goals
- Utilities: 80%+
- Business logic: 70%+
- Services: 60%+

### Pre-Commit Hook
```bash
npm install --save-dev husky lint-staged
npx husky install
```

Create `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
npm test
```

**Rule:** Tests must pass in < 30 seconds before commit.

---

## Performance Checklist

**Message List**
- [ ] FlatList has `removeClippedSubviews={true}`
- [ ] Message components use `React.memo`
- [ ] Scrolling 100+ messages at 60 FPS
- [ ] No lag when typing

**Loading**
- [ ] Open conversation shows cached messages < 100ms
- [ ] Navigation feels instant (< 300ms)
- [ ] Images compressed before upload

**Optimization**
- [ ] Use `useCallback` for event handlers
- [ ] Debounce typing indicators (300ms)
- [ ] Limit Firestore queries (100 messages max)
- [ ] SQLite cache loads first, Firestore syncs background

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Google OAuth takes too long | Budget full 60 minutes, follow Firebase docs carefully |
| Firestore rate limits | Use local cache, batch operations |
| iOS build on Windows | Use EAS Build cloud service |
| Complex offline sync | Start simple, iterate only if needed |
| 24-hour deadline | Skip OPTIONAL features ruthlessly |

**Decision Points:**
- Hour 10: Authentication not done? Focus on core messaging
- Hour 16: Group chat buggy? Skip remove members
- Hour 20: Behind schedule? Skip camera, use gallery only
- Hour 22: iOS issues? Demo on Android, document iOS problems

---

## Testing Validation

**Before Moving to Next Phase:**
1. Run `npm test` - all must pass
2. Test on Android emulator
3. Check performance with DevTools (press 'j' in Expo)
4. Verify FPS stays at 60

**Final Submission:**
- [ ] All CRITICAL features working
- [ ] Tests pass with 70%+ coverage
- [ ] Pre-commit hook configured
- [ ] Performance meets targets (60 FPS)
- [ ] Tested on Android + iOS devices
- [ ] Demo video prepared

---

## Quick Commands

```bash
# Start development
npm start

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Build for testing
eas build --profile development --platform ios
eas build --profile development --platform android

# Run on devices
npm run android
npm run ios
```

---

## What NOT to Do (Time Wasters)

❌ Building custom UI components (use defaults)  
❌ Perfect styling (functional > pretty for MVP)  
❌ Complex state management (Context is enough)  
❌ Over-engineering tests (focus on business logic)  
❌ Background notifications (foreground is sufficient)  
❌ Message search, editing, reactions (post-MVP)  
❌ Custom animations (use built-in)

✅ **Focus:** Core messaging, offline support, performance, tests

---

## Success = Core Features + Performance + Tests

The MVP passes when:
1. Two users can chat in real-time ✓
2. Messages work offline and sync ✓
3. Group chat with 3+ users works ✓
4. Images can be shared ✓
5. Auth works (email + Google) ✓
6. Everything runs at 60 FPS ✓
7. Tests cover critical paths ✓
8. Pre-commit hooks work ✓

**Simple. Fast. Tested. Done.**