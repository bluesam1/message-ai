# Task List: PRD 04 - Offline Support & Sync

## Relevant Files

- `src/services/network/networkService.ts` - Network connectivity monitoring service using NetInfo
- `__tests__/services/networkService.test.ts` - Unit tests for network service
- `src/services/messaging/offlineQueueService.ts` - Manages pendingMessages queue in SQLite
- `__tests__/services/offlineQueueService.test.ts` - Unit tests for offline queue operations
- `src/services/messaging/syncService.ts` - Handles automatic sync of pending messages to Firestore
- `__tests__/services/syncService.test.ts` - Unit tests for sync service
- `src/utils/messageDeduplication.ts` - Deduplication and message merging utilities
- `__tests__/utils/messageDeduplication.test.ts` - Unit tests for deduplication logic
- `src/services/sqlite/sqliteService.ts` - Update to add pendingMessages table and status tracking
- `src/services/messaging/messageService.ts` - Update to integrate offline queue and sync
- `src/types/message.ts` - Update to add message status types (pending, sent, failed)
- `src/hooks/useNetworkStatus.ts` - React hook for network status monitoring
- `src/components/chat/OfflineBanner.tsx` - UI component for offline/reconnecting banner
- `src/components/chat/MessageBubble.tsx` - Update to show message status indicators
- `app/chat/[id].tsx` - Update chat screen to use offline features and show banner
- `app/(tabs)/index.tsx` - Update conversation list to handle pending messages

### Notes

- Unit tests should be placed alongside the code files they are testing
- Use `npx jest [optional/path/to/test/file]` to run tests
- Install `@react-native-community/netinfo` package before implementation
- Ensure all async operations are properly error-handled

## Tasks

- [x] 1.0 Network Monitoring Service - Integrate NetInfo and create network state management
  - [x] 1.1 Install @react-native-community/netinfo package
  - [x] 1.2 Create src/services/network/networkService.ts with NetInfo integration
  - [x] 1.3 Implement isOnline state tracking and listener pattern
  - [x] 1.4 Add automatic sync trigger on reconnection
  - [x] 1.5 Create useNetworkStatus hook for React components
  - [x] 1.6 Initialize network service in app root (_layout.tsx)

- [x] 2.0 Offline Queue Service - Implement pendingMessages table and queue operations
  - [x] 2.1 Update sqliteService to create pendingMessages table schema
  - [x] 2.2 Create offlineQueueService with addToQueue method
  - [x] 2.3 Implement getPendingMessages method (sorted by timestamp)
  - [x] 2.4 Implement removeFromQueue method
  - [x] 2.5 Implement incrementRetryCount method
  - [x] 2.6 Add getRetryCount helper method
  - [x] 2.7 Update message status in messages table (add status column if needed)

- [x] 3.0 Sync Service - Create automatic sync mechanism for pending messages
  - [x] 3.1 Create syncService with syncPendingMessages method
  - [x] 3.2 Implement online check before syncing
  - [x] 3.3 Add duplicate check before Firestore upload (checkMessageExists)
  - [x] 3.4 Implement message upload with error handling
  - [x] 3.5 Update local message status on successful sync
  - [x] 3.6 Implement retry logic with exponential backoff
  - [x] 3.7 Mark messages as failed after 3 retry attempts
  - [x] 3.8 Add sync progress callback for UI updates

- [x] 4.0 Message Deduplication - Implement duplicate prevention and message merging logic
  - [x] 4.1 Create messageDeduplication utility file
  - [x] 4.2 Implement deduplicateMessages function (remove duplicates by ID)
  - [x] 4.3 Implement mergeMessageLists function (live messages override cached)
  - [x] 4.4 Update useMessages hook to use deduplication when loading
  - [x] 4.5 Add duplicate check in sqliteService before inserting from Firestore
  - [x] 4.6 Update messageService to use deterministic message IDs

- [x] 5.0 UI Updates - Add offline indicators and message status displays
  - [x] 5.1 Create OfflineBanner component with online/offline/reconnecting states
  - [x] 5.2 Update MessageBubble to show status icons (pending, sent, failed)
  - [x] 5.3 Add manual retry button for failed messages
  - [x] 5.4 Integrate OfflineBanner in chat screen ([id].tsx)
  - [x] 5.5 Update MessageInput to handle offline message sending
  - [x] 5.6 Add visual feedback for syncing state (optional loading indicator)
  - [x] 5.7 Update conversation list to show pending message counts

- [x] 6.0 Testing - Create comprehensive unit tests for offline functionality
  - [x] 6.1 Write tests for networkService (listener, state changes, reconnection)
  - [x] 6.2 Write tests for offlineQueueService (add, get, remove, retry count)
  - [x] 6.3 Write tests for syncService (sync process, retry logic, failure handling)
  - [x] 6.4 Write tests for deduplicateMessages function
  - [x] 6.5 Write tests for mergeMessageLists function
  - [x] 6.6 Run all tests and ensure 70%+ coverage for offline modules
  - [x] 6.7 Document manual testing scenarios in PRD acceptance criteria

