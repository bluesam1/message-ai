# Active Context

## Current Status
**Phase:** PRD 2.1 Complete ✅ - AI Foundation Features Deployed (Translation, Context, Slang)  
**Date:** October 23, 2025  
**Branch:** main  
**App Status:** Production-ready MVP with full messaging + AI-powered translation, cultural context, and slang definitions  
**Next:** PRD 2.2 - Auto-Translation & Language Detection

## What Just Happened

### ✅ Completed (PRD 01 - Project Setup)
1. **Firebase Project:** Configured with Auth, Firestore, Storage, and FCM
2. **Development Environment:** Expo project with TypeScript, all dependencies installed
3. **Pre-commit Hooks:** Husky configured (TypeScript compilation check before commits)
4. **Firebase Integration:** Config files set up with security best practices
5. **Android Build:** Development build successfully running on Pixel 7 emulator
6. **Documentation:** README.md and _docs/FIREBASE_SETUP.md created
7. **Windows Setup:** JAVA_HOME configured, Gradle issues resolved

### ✅ Completed (PRD 02 - Authentication System)
1. **Auth Services:** `authService.ts` with email/password + Google Sign-In
2. **User Services:** `userService.ts` with Firestore profile management
3. **Auth Context:** Global auth state with `AuthProvider` and `useAuth` hook
4. **Auth Screens:** Login and registration screens with validation
5. **Navigation:** Expo Router with auth-protected routes (`(auth)/` and `(tabs)/` groups)
6. **Google OAuth:** Working Google Sign-In with expo-auth-session
7. **Error Handling:** User-friendly error messages mapped from Firebase codes
8. **Validation:** Email, password, and display name validation utilities
9. **Package Compatibility:** Resolved React 19.1.0/RN 0.81.4 version conflicts

### ✅ Completed (PRD 03 - Core One-on-One Messaging)
1. **Data Models:** TypeScript types for messages and conversations with full interfaces
2. **SQLite Service:** Local persistence with cache-first loading strategy
3. **Message Utilities:** ID generation, time formatting, deduplication, and grouping logic
4. **Conversation Service:** Find/create conversations with Firestore integration
5. **Message Service:** Send/receive with optimistic UI updates and retry logic
6. **User Picker:** Searchable user list for starting new chats
7. **Conversations Screen:** List of conversations with real-time updates
8. **Chat Screen:** Full messaging UI with MessageList, MessageBubble, and MessageInput
9. **Performance Optimizations:** React.memo, FlatList with getItemLayout for 60 FPS target
10. **Custom Hooks:** useMessages and useConversation for state management
11. **Real-time Sync:** Firestore listeners with cache-first strategy
12. **Firebase Configuration:** Firestore rules and indexes configured for deployment
13. **Database Init:** SQLite initialization in all relevant screens

### ✅ Completed (PRD 05 - Group Chat)
1. **Data Model Extension:** Extended Conversation interface with groupName, groupPhoto, createdBy fields
2. **Group Validation:** Utilities for validating group names, emails, participants (minimum 2 members)
3. **User Lookup Service:** Functions to find users by email, validate emails, batch lookups
4. **Conversation Service Enhancement:** createGroup() and addMembersToGroup() functions
5. **Group Creation UI:** Multi-step flow (name → members → review) with GroupCreation component
6. **Group Member Picker:** Email-based member addition with validation and duplicate prevention
7. **Group Info Screen:** Display group details, member list, add members functionality
8. **Conversation List Updates:** Groups show with distinct styling, group icon, member count
9. **Chat Screen Enhancements:** Group-specific header with member count and info button
10. **SQLite Schema Migration:** Robust migration for new group fields with column existence checking
11. **UI Polish:** Fixed header layouts, improved spacing, proper touch feedback
12. **Real-Time Sync Fix:** Fixed listener closure bug preventing bidirectional message sync
13. **Timestamp Safety:** Added toMillis() helper to handle both Firestore Timestamps and numbers

### ✅ Completed (PRD 06 - Read Receipts & Presence)
1. **Data Model Extensions:** Added readBy array to Message type, online and lastSeen fields to User type
2. **Read Receipt Service:** markMessagesAsRead with batch writes, getUnreadMessageIds query function
3. **Presence Service:** Online/offline tracking with debouncing (300ms), background handling (30s delay)
4. **Presence Utilities:** formatLastSeen, getPresenceColor, getPresenceText helper functions
5. **Presence Hooks:** usePresence for listening to user status, usePresenceUpdates for app state management
6. **PresenceIndicator Component:** Displays online/offline status with colored dot and text
7. **Read Receipt Display:** MessageBubble shows checkmarks (single gray → double gray → double green)
8. **Group Read Receipts:** "Read by X of Y" display for group messages
9. **Automatic Read Marking:** Messages marked as read when conversation is viewed (1s debounce)
10. **Conversation List Integration:** Presence indicators for direct chats
11. **Chat Header Integration:** Presence status displayed for direct chats
12. **App State Handling:** Presence updates on foreground/background with intelligent cleanup
13. **Custom Debounce:** Implemented custom debounce function (no lodash dependency)
14. **Firestore Schema Updates:** Documented readBy, online, and lastSeen fields in schema

### ✅ Completed (PRD 06.1 - RTDB Presence Migration - Full Implementation)
1. **Firebase RTDB Setup:** Enabled Realtime Database in Firebase Console, created database in us-central1
2. **Security Rules:** Created `database.rules.json` with authenticated read/write rules for `/status/{uid}`
3. **Firebase Config:** Updated `firebase.json` to include database + functions, added RTDB initialization with databaseURL to `src/config/firebase.ts`
4. **RTDB Presence Service:** Created `rtdbPresenceService.ts` with connection monitoring, onDisconnect handlers, and explicit setOffline method
5. **Connection Monitoring:** Implemented `.info/connected` listener for reliable connection status
6. **Online Status:** Automatic online status with `onDisconnect()` handler for server-side offline detection
7. **Cloud Functions Deployed:** Created `onPresenceChange` function for server-side RTDB → Firestore mirroring (replaced client-side approach)
8. **Instance-Specific Function:** Explicitly specified `.instance('msg-ai-1-default-rtdb')` in Cloud Function
9. **AuthContext Integration:** Updated with proper logout sequence (cleanup → setOffline → signOut) to prevent race condition
10. **Header Logout Fix:** Fixed `app/(tabs)/_layout.tsx` logout button to use AuthContext.signOut instead of bypassing it
11. **usePresence Hook Update:** Modified to handle Firestore Timestamp objects with `.toMillis()` conversion
12. **Global Timer Optimization:** Created `useCurrentTime` hook with single shared 60-second interval for all PresenceIndicator components
13. **Timestamp Consistency:** Cloud Function always uses `admin.firestore.FieldValue.serverTimestamp()` for Firestore writes
14. **File Cleanup:** Removed old Firestore-only presenceService.ts and usePresenceUpdates.ts
15. **Security Rules Deployed:** Successfully deployed RTDB rules via Firebase CLI
16. **Cloud Functions Deployed:** Successfully deployed to Firebase with proper permissions (Artifact Registry Reader + Editor)
17. **Documentation:** Updated systemPatterns.md, techContext.md, activeContext.md, progress.md, and created 5 new docs (CLOUD_FUNCTIONS_SETUP, EMULATOR_TESTING, RTDB_INSTANCE_FIX, LOGOUT_PRESENCE_FIX, PRD_06.1_COMPLETION_SUMMARY)

### ✅ Completed (PRD 04 - Offline Support & Sync)
1. **Network Service:** Real-time connectivity monitoring with NetInfo, listener pattern for state changes
2. **Offline Queue:** SQLite-based pending messages table with retry count tracking
3. **Offline Queue Service:** Add/remove/get pending messages, retry count management (7 functions)
4. **Sync Service:** Automatic sync on reconnect with duplicate prevention and exponential backoff
5. **Message Deduplication:** Utility functions for merging and deduplicating message lists
6. **Network Status Hook:** useNetworkStatus provides isOnline and isConnecting states to components
7. **Offline Banner:** Animated UI component showing "Offline", "Reconnecting", or "Back online"
8. **Message Status Icons:** Pending, sent, delivered, and failed indicators in MessageBubble
9. **SQLite Integration:** pendingMessages table with indexes for efficient querying
10. **Message Service Updates:** Offline-aware sending with queue fallback
11. **Root Layout Integration:** Network service initialized in app/_layout.tsx with sync trigger
12. **Conversation List Updates:** Display pending message counts for offline messages
13. **Type Safety:** Full TypeScript coverage with proper boolean type handling

### 📋 Feature PRDs Created

**Phase 1 (MVP) - Complete:**
1. **PRD 01 - Project Setup & Infrastructure** (Hours 0-2) ✅
2. **PRD 02 - Authentication System** (Hours 2-5) ✅
3. **PRD 03 - Core One-on-One Messaging** (Hours 5-10) ✅
4. **PRD 04 - Offline Support & Sync** (Hours 10-14) ✅
5. **PRD 05 - Group Chat** (Hours 14-17) ✅
6. **PRD 06 - Read Receipts & Presence** (Hours 17-19) ✅
7. **PRD 07 - Image Sharing** (Hours 19-21) ✅
8. **PRD 08 - Push Notifications (Foreground)** (Hours 21-22) ✅

**Phase 2 (AI Features) - In Progress:**
1. **PRD 2.1 - Foundation & Simple AI Features** (6-8 hours) ✅ COMPLETE
2. **PRD 2.2 - Auto-Translation & Language Detection** (Next)
3. **PRD 2.3 - Smart Composition & AI Replies** (Planned)
4. **PRD 2.4 - UX & Engagement Features** (Planned)
5. **PRD 2.5 - User Management & Safety** (Planned)
6. **PRD 2.6 - Performance & Polish** (Planned)

### ✅ Completed (PRD 07 - Image Sharing)
1. **expo-image-picker Integration:** Full gallery permission handling for Android and iOS
2. **Image Compression:** Automatic compression to optimize bandwidth usage
3. **Firebase Storage Upload:** Secure image uploads with progress tracking
4. **ImageMessage Component:** Display images in chat with loading states
5. **Upload Progress:** Visual feedback during image upload
6. **Failed Upload Handling:** Retry mechanism for failed uploads
7. **Image Selection UI:** Added image picker button to MessageInput component
8. **Storage Security Rules:** Configured Firebase Storage rules for authenticated access

### ✅ Completed (PRD 2.1 - AI Foundation Features)
1. **Cloud Functions Infrastructure:** OpenAI client initialization with Firebase config integration
2. **Rate Limiting:** Per-user rate limiting (10 requests/min) to prevent abuse
3. **Cost Monitoring:** Token usage tracking and cost calculation with Firestore logging
4. **Error Handling:** Comprehensive error handling utilities for OpenAI API errors
5. **Translation Feature:** `translateMessage` Cloud Function with inline display and toggle
6. **Cultural Context:** `explainContext` Cloud Function with modal UI for cultural explanations
7. **Slang Definitions:** `defineSlang` Cloud Function with modal UI for idiom definitions
8. **Client Services:** Translation, context, and definition services with Firestore caching
9. **UI Components:** MessageActions menu, TranslationView, ContextExplanation, SlangDefinition modals
10. **AI Hook:** `useAIFeatures` custom hook for state management
11. **Chat Integration:** AI features fully integrated into chat screen with long-press activation
12. **Documentation:** Complete setup guide, user guide, and implementation status docs
13. **Deployment:** All 3 Cloud Functions deployed and tested successfully

### ✅ Completed (PRD 08 - Push Notifications)
1. **expo-notifications Integration:** Full permission request and token management
2. **Expo Push API Migration:** Switched from FCM to Expo Push API for better Expo Go compatibility
3. **notificationService.ts:** Client-side service for Expo push token generation and storage
4. **useNotifications Hook:** React hook for foreground notification display and tap handling
5. **Cloud Function (sendPushNotification):** Server-side notification sending via Expo Server SDK
6. **Enhanced Notification Payloads:** Includes senderName, messageType, conversationId, messageId
7. **Notification Collapsing:** Android `collapse_key` and iOS `apns-collapse-id` for conversation grouping
8. **Deep Linking:** Tap notification navigates to correct conversation
9. **Invalid Token Cleanup:** Automatic removal of expired/invalid Expo push tokens
10. **Authentication Persistence:** expo-secure-store integration for seamless user sessions
11. **authPersistenceService.ts:** Secure storage for auth tokens across app restarts
12. **Test Notification Button:** Added to Profile screen for debugging notifications
13. **Expo Project Configuration:** Added projectId and owner to app.json for Expo Push API
14. **Cloud Functions Deployment:** Deployed with Expo Server SDK integration
15. **Comprehensive Logging:** Detailed console logs for troubleshooting token generation and delivery

## Current Focus

### Immediate Next Steps
**PRIORITY:** Continue Phase 2 AI Features

#### Completed
1. ✅ PRD 2.1 - Foundation & Simple AI Features (Translation, Context, Slang)
2. ✅ Cloud Functions deployed and tested
3. ✅ Chat screen integration complete
4. ✅ Memory Bank updated

#### Next Actions
1. Begin PRD 2.2 - Auto-Translation & Language Detection
2. Plan language detection workflow
3. Implement auto-translate orchestration
4. Add per-conversation language preferences

## Active Decisions

### Technology Choices (Confirmed)
- **Frontend:** React Native with Expo SDK 50.x
- **Routing:** Expo Router v3.x
- **Backend:** Firebase (Auth, Firestore, Storage, FCM)
- **Local DB:** Expo SQLite v13.x
- **State:** Context API (keeping it simple, no Zustand unless needed)
- **Testing:** Jest + @testing-library/react-native
- **TypeScript:** v5.x

### Architecture Patterns (Confirmed)
- **Optimistic UI:** Show changes immediately, sync in background
- **Cache-First:** Load from SQLite, update from Firestore
- **Service Layer:** Separate business logic from UI
- **Component Structure:** Smart containers, dumb presentational components

### Performance Targets (Non-Negotiable)
| Action | Target | Maximum |
|--------|--------|---------|
| Message send (UI) | < 50ms | 100ms |
| Open conversation | < 100ms | 200ms |
| Screen navigation | < 200ms | 300ms |
| FPS (scrolling) | 60 FPS | 55 FPS |
| App launch | < 1.5s | 2.5s |

**Rule:** If we exceed maximum times, STOP and optimize before continuing.

## Known Challenges & Solutions

### 1. Google OAuth Setup ✅ SOLVED
**Challenge:** OAuth configuration is notoriously tricky  
**Solution:** Firebase auto-generates OAuth client IDs when you add iOS/Android apps
- No need to manually create client IDs in Google Cloud Console
- Just download `google-services.json` and `GoogleService-Info.plist`
- Add them to project root and configure `app.json`

### 2. iOS Build on Windows ✅ DOCUMENTED
**Challenge:** Can't build iOS locally on Windows machine  
**Solution:** Use EAS Build cloud service (documented in README)
- Deferred iOS testing until needed
- Will use `eas build --platform ios --profile development`

### 3. Windows-Specific Issues ✅ SOLVED
**Challenge:** JAVA_HOME not configured, Gradle issues, port conflicts  
**Solutions:**
- Set JAVA_HOME to Android Studio JBR: `C:\Program Files\Android\Android Studio\jbr`
- Kill Gradle processes: `./gradlew --stop` and `taskkill //F //IM java.exe`
- Handle port conflicts by accepting alternate ports or killing processes

### 4. 24-Hour Timeline
**Status:** On track! PRD 01 complete (98%)  
**Mitigation:** 
- Skip ALL optional features if behind schedule
- Decision points at hours 10, 16, 20, 22
- Focus on CRITICAL features only

## Dependencies & Blockers

### Current Blockers
**NONE** - Ready to start implementation

### Dependency Chain
```
PRD 01 (Setup) 
    ↓
PRD 02 (Auth) 
    ↓
PRD 03 (Core Messaging) ←─┐
    ↓                      │
PRD 04 (Offline) ──────────┤
    ↓                      │
PRD 05 (Groups) ───────────┤
    ↓                      │
PRD 06 (Read Receipts) ────┤  ← Can develop in parallel
PRD 07 (Images) ───────────┤  ← Can develop in parallel
PRD 08 (Notifications) ────┘  ← Can develop in parallel
```

## Recent Insights

### From PRD 01 Implementation
1. **Firebase OAuth Simplified:** Auto-generated client IDs eliminate manual setup
2. **Windows Dev Challenges:** JAVA_HOME, Gradle, and port issues are common
3. **Development Builds Required:** expo-dev-client needed for Firebase native modules
4. **Security Best Practices:** Keep `.env`, `google-services.json`, and `GoogleService-Info.plist` out of git
5. **First Build is Slow:** 5-6 minutes for initial Android build, subsequent builds much faster
6. **Testing Setup is Crucial:** Pre-commit hooks catch issues before they reach git

### From PRD 02 Implementation
1. **React Version Precision:** React Native 0.81.4 requires React 19.1.0 **exactly** - even 19.2.0 causes errors
2. **Metro Cache Issues:** Always clear Metro cache (`--clear --reset-cache`) after changing `.env` files
3. **Package Version Management:** Use `npx expo install` for all Expo packages to ensure SDK compatibility
4. **Testing Library Lag:** Testing libraries may not support latest React versions - validate compatibility before adding
5. **Firebase Default Persistence:** Firebase Auth handles session persistence automatically on React Native - no AsyncStorage needed
6. **Environment Variable Best Practices:** Android vs Web Firebase credentials are different - always use platform-specific config
7. **Google OAuth Configuration:** expo-auth-session requires both `webClientId` and `androidClientId` for Android OAuth
8. **Error Mapping Importance:** User-friendly error messages significantly improve UX - map all Firebase error codes
9. **Validation First:** Client-side validation catches 90% of errors before they reach Firebase
10. **Context API Simplicity:** For auth state, Context API is perfect - no need for complex state management

### From PRD 03 Implementation
1. **SQLite Initialization Timing:** Database must be initialized before any screens try to use it - add to screen useEffect
2. **Firestore Composite Indexes:** Complex queries (filtering + ordering) require indexes - configure before deployment
3. **TypeScript Strictness:** ArrayLike vs Array types matter - use correct types for React Native APIs
4. **Testing Strategy Validation:** 100% utils coverage achievable; focus on pure functions over integration tests
5. **Optimistic UI Pattern:** Generate ID → Save SQLite → Update UI → Upload Firestore → Update status
6. **Cache-First Loading:** SQLite immediately → Firestore listener → Merge without duplicates
7. **Performance Target Achievement:** React.memo + getItemLayout + proper windowSize achieves 60 FPS
8. **npm Script Convention:** Adding "clean" and "rebuild" scripts improves developer experience
9. **Component Testing Limitations:** React Native Testing Library has peer dependency constraints - defer to later
10. **Firebase Configuration Files:** Keep firebase.json, firestore.rules, firestore.indexes.json in root

### From PRD 04 Implementation
1. **Expo Go Limitations:** Apps with expo-dev-client, expo-notifications, expo-image-picker, and @react-native-community/netinfo REQUIRE development builds - Expo Go will not work
2. **Boolean Type Safety:** React Native iOS has strict native prop type checking - avoid unnecessary Boolean() wrapping, let TypeScript handle types
3. **NetInfo Integration:** @react-native-community/netinfo works seamlessly with React hooks pattern for network monitoring
4. **Offline Queue Pattern:** SQLite pending messages table + service layer provides reliable queue with retry tracking
5. **Sync Deduplication:** Check message existence in Firestore before upload prevents duplicates during sync
6. **Exponential Backoff:** Start at 1s, double each retry (2s, 4s, 8s), cap at 5 retries for failed message uploads
7. **Listener Pattern:** networkService.subscribe() allows multiple components to react to connectivity changes
8. **Testing Network Services:** Mock NetInfo.addEventListener in tests to simulate network state changes
9. **iOS Development on Windows:** Use EAS Build cloud service for iOS builds (free for simulator, $99/year Apple Developer for device)
10. **Pre-existing Issues:** Always verify bugs exist on main branch before attributing to new changes

### From PRD 05 Implementation
1. **Unified Data Model:** Using `participants[]` + `type` field is superior to separate models - works for both direct and group chats
2. **Closure Bugs in Listeners:** Real-time listeners must use current state, not captured variables - avoid stale closure bugs
3. **SQLite Migration Strategy:** Check column existence with `PRAGMA table_info()` before ALTER TABLE - safe for existing databases
4. **Timestamp Type Safety:** Firestore returns both Timestamp objects and numbers - create helper functions to handle both
5. **Optimistic UI Conflicts:** Don't manually replace optimistic messages - let Firestore listener handle all updates to avoid conflicts
6. **Minimum Participant Flexibility:** 2-person groups are valid (allows 1-on-1 → group conversion) - don't over-constrain
7. **Email-Based User Lookup:** Firestore `in` query works well for batch user lookups (up to 10 items per query)
8. **Component State Management:** useEffect cleanup is critical - track `isInitialMount` to avoid false triggers
9. **Modal Header UX:** Proper touch feedback (`activeOpacity`) and spacing (`paddingTop`) are essential for native feel
10. **Debug Logging Strategy:** Add comprehensive logging during debugging, clean up before commit - keep only error logs

### From PRD 06 Implementation
1. **Presence Initialization:** Must initialize presence in AuthContext when user logs in - app state listeners alone are insufficient
2. **Cleanup Timing:** Don't immediately mark offline on component unmount - could be navigation, not app close
3. **Debounce Strategy:** 300ms debounce for online updates, 30s delay for offline to prevent status flicker
4. **Custom Utilities:** Implementing simple utilities (like debounce) avoids unnecessary dependencies (lodash)
5. **App Restart Required:** Presence service initialization code requires full app restart, not just hot reload
6. **Timestamp Helpers:** Create robust timestamp conversion helpers (toMillis) to handle Firestore Timestamp objects and numbers
7. **Read Receipt Batch Updates:** Use Firestore batch writes for marking multiple messages as read efficiently
8. **Presence Display:** "Online" for online:true, otherwise format lastSeen timestamp (Just now, 5m ago, etc.)
9. **React Native AppState:** AppState listener essential for detecting app foreground/background transitions
10. **Type Safety:** ReturnType<typeof setTimeout> for timer types prevents TypeScript errors across environments

### From PRD 06.1 Implementation (RTDB Presence Migration)
1. **Firestore Presence Bug:** Original Firestore-only approach showed all users online - App state listeners don't detect crashes/force-quits
2. **RTDB is Purpose-Built:** Firebase Realtime Database's `.info/connected` and `onDisconnect()` are designed for presence - use the right tool
3. **Server-Side Disconnect:** `onDisconnect()` handlers execute SERVER-SIDE when Firebase detects disconnect - no client code needed
4. **Client-Side Mirroring Fails:** Client-side mirroring insufficient for disconnects - client can't mirror if it's crashed/offline
5. **Cloud Functions Required:** Server-side mirroring via Cloud Functions ensures updates happen even when client is offline
6. **No UI Changes:** Mirroring to Firestore means existing UI components work unchanged - seamless migration
7. **Minimal Writes:** RTDB only writes on actual state changes (connect/disconnect) - no periodic heartbeats needed
8. **RTDB Free Tier:** 1GB storage + 10GB/month download is plenty for presence tracking in MVP
9. **RTDB Instance Names:** Newer Firebase projects use suffixed names (`-default-rtdb`) - must specify in Cloud Functions: `.instance('msg-ai-1-default-rtdb')`
10. **Testing RTDB:** Mock `ref`, `onValue`, `set`, `onDisconnect` for unit tests - straightforward with Jest
11. **Security Rules Syntax:** RTDB rules use JSON format (different from Firestore) - `"auth != null"` vs Firestore's `request.auth != null`
12. **Logout Race Condition:** Connection listeners can overwrite explicit offline status - must cleanup listeners BEFORE setting offline
13. **Multiple Logout Paths:** Check all UI locations where logout occurs (buttons, modals, screens) - ensure all use AuthContext.signOut
14. **Timestamp Consistency:** Always use Firestore's serverTimestamp() in Cloud Functions for consistent Timestamp objects
15. **Firestore Timestamp Conversion:** Use `.toMillis()` method to convert Firestore Timestamp objects to milliseconds for calculations
16. **Global Timer Pattern:** Single shared timer for all components is more efficient than per-component timers - use global state with listeners
17. **React Hook Cleanup:** Always unsubscribe listeners in useEffect cleanup to prevent memory leaks and stale state
18. **Firebase Permissions:** Cloud Functions need Artifact Registry Reader (deployment) and Editor (Firestore writes) roles

### From PRD Analysis
1. **Test Coverage Focus:** Focus tests on utils and business logic, skip UI/Firebase tests ✅ VALIDATED
2. **Performance Budget:** FlatList optimizations are critical for 60 FPS goal ✅ ACHIEVED
3. **Scope Management:** Many "optional" features identified - defer aggressively
4. **Error Handling:** Every feature PRD includes detailed error scenarios

### From Planning Phase
1. **Feature Cohesion:** Features build naturally on each other
2. **Clear Boundaries:** Each PRD is self-contained with clear interfaces
3. **Testing Strategy:** Unit tests for logic, manual tests for integration
4. **Documentation Quality:** PRDs are detailed enough for junior developers

## Working Notes

### Firebase Setup Prep
Need to gather before starting:
- Google account for Firebase console
- Apple Developer account (for iOS OAuth client)
- Android SHA-1 certificate fingerprint
- Expo account (for EAS Build)

### Development Environment
Currently using:
- OS: Windows 10
- Shell: Git Bash
- IDE: Cursor (with AI assistance)
- Workspace: `C:\Users\SamExel\repos\message-ai`

### Git Status
- PRD 01-06 implementations committed
- Branch: prd-06-read-receipts-presence
- Last commit: feat(prd-06): implement read receipts and presence
- Ready to push
- 22 new tests passing (presenceUtils + readReceiptService)

## Questions Resolved

### PRD 01
- ✅ Firebase project created: "MessageAI"
- ✅ Bundle ID decided: `com.bluesam.messagai`
- ✅ OAuth setup simplified (auto-generated)
- ✅ Windows-specific issues documented and solved
- ✅ Emulator performance verified (Pixel 7, API 35)

### For PRD 02 (Completed)
- ✅ Which auth method to implement first? → **Implemented both simultaneously**
- ✅ Do we need password reset flow in MVP? → **Deferred to post-MVP (Firebase makes it easy to add later)**
- ✅ How to handle auth state persistence? → **Using Firebase's default persistence (no additional deps)**
- ✅ How to resolve React version conflicts? → **Lock to React 19.1.0 exactly for RN 0.81.4 compatibility**
- ✅ Testing library compatibility issues? → **Deferred React Native Testing Library, using Jest for unit tests**

### For PRD 03 (Completed)
- ✅ Should messages be paginated from the start? → **Yes, limit to 100 most recent with Firestore query**
- ✅ How to handle message deduplication between SQLite and Firestore? → **mergeMessageLists() utility with ID-based deduplication**
- ✅ What's the best way to achieve 60 FPS scrolling with FlatList? → **React.memo + getItemLayout + windowSize optimization**
- ✅ Should we implement typing indicators in MVP? → **Deferred to post-MVP (not in core PRDs)**

### For PRD 04 (Completed)
- ✅ How to detect offline status reliably? → **@react-native-community/netinfo with listener pattern**
- ✅ Where to store pending messages? → **SQLite pendingMessages table with retry count tracking**
- ✅ When to trigger sync? → **On reconnect via networkService.subscribe() + manual retry button**
- ✅ How to prevent duplicate uploads? → **Check Firestore message existence before upload**

### For PRD 05 (Completed)
- ✅ How to support both direct and group chats? → **Unified model with participants[] + type field**
- ✅ What's the minimum group size? → **2 participants (creator + 1 other) for flexibility**
- ✅ How to add members to groups? → **Email-based lookup with getUserByEmail() Firestore query**
- ✅ How to handle existing databases? → **Robust SQLite migration with PRAGMA table_info() checks**

## Next Session Prep

### When Returning to This Project
1. Read this file first (activeContext.md)
2. Check progress.md for what's completed
3. Review current PRD we're working on
4. Check git status for uncommitted changes
5. Read any "Working Notes" sections above

### Context for AI Assistant
- Project is in early stage (planning → implementation transition)
- All requirements are documented in PRDs
- Follow strict performance budgets
- Test coverage is mandatory (70%+)
- 24-hour timeline means ruthless scope management

---

**Next Action:** Start PRD 07 - Image Sharing  
**Expected Duration:** 2 hours  
**Goal:** Users can share images in conversations

**Key Files to Create:**
- `src/services/firebase/storageService.ts` - Firebase Storage operations
- `src/utils/imageUtils.ts` - Image compression and optimization
- Update `src/components/chat/MessageInput.tsx` - Add image picker button
- `src/components/chat/ImageMessage.tsx` - Display image messages
- Update `src/types/message.ts` - Add imageUrl field support

**Key Decisions Needed:**
- Image compression strategy (target size/quality)
- Progress tracking UI (inline or modal)
- Retry mechanism for failed uploads
- Image preview before sending



