# Cache Strategy Analysis

## Current Implementation

### Overview
The app currently uses a **cache-first loading strategy** with SQLite as the local cache and Firestore as the source of truth. The pattern is:

1. **Load from SQLite immediately** (instant UI)
2. **Set up Firestore listener** (real-time updates)
3. **Save Firestore data to SQLite** (keep cache fresh)

### Where Caching is Used

#### 1. **Messages** (`src/hooks/useMessages.ts`)
```
Flow:
1. Load cached messages from SQLite (lines 58-63)
2. Display cached messages immediately
3. Set up Firestore listener (line 66)
4. Merge live messages with temp messages (lines 67-91)
5. Save each Firestore message to SQLite (messageService.ts:242)
```

#### 2. **Conversations** (`src/services/messaging/conversationService.ts`)
```
Flow (getUserConversations):
1. Load all conversations from SQLite (line 272)
2. Filter for user's conversations
3. Display cached conversations immediately (line 278)
4. Set up Firestore listener (lines 281-286)
5. Save each Firestore conversation to SQLite

Flow (getConversationById):
1. Try SQLite first (line 221)
2. Return cached if found (line 224)
3. Fetch from Firestore if not in cache (line 228)
4. Save to SQLite for future access (line 249)
```

#### 3. **Translations** (stored in message aiMeta)
```
- Translations are stored in Firestore message documents (aiMeta.translatedText)
- When messages are saved to SQLite, aiMeta is included
- Translations are available offline
```

#### 4. **Offline Queue** (`src/services/messaging/offlineQueueService.ts`)
```
- Uses SQLite pendingMessages table
- Messages sent offline are queued
- Synced when network returns
```

---

## Problems with Current Strategy

### 1. **Stale Data Issues**
- **Problem**: SQLite cache can become out of sync with Firestore
- **Impact**: Users see old data until Firestore listener fires
- **Example**: Conversation list shows wrong last message until refresh

### 2. **Complex State Management**
- **Problem**: Managing both cached and live data adds complexity
- **Code smell**: `useMessages` merges temp messages with cached messages with live messages
- **Impact**: Hard to debug, easy to introduce bugs

### 3. **Cache Invalidation Challenges**
- **Problem**: No clear strategy for when to clear cache
- **Current approach**: Clear on sign-out, clear on user switch
- **Missing**: No TTL (time-to-live), no selective invalidation

### 4. **Over-caching**
- **Problem**: Caching everything, even rarely-accessed data
- **Example**: User profiles are fetched fresh every time (good) but conversations are cached (sometimes stale)
- **Impact**: Wasted storage, potential for bugs

### 5. **SQLite Schema Migrations**
- **Problem**: As app evolves, schema changes are painful
- **Evidence**: Multiple migration attempts for `lastMessage`, `aiPrefs`, etc.
- **Impact**: Users on old versions may have schema mismatches

### 6. **Duplicate Data Concerns**
- **Problem**: Same data in Firestore AND SQLite
- **Impact**: 2x storage usage, potential inconsistencies

### 7. **No Clear Offline Strategy**
- **Problem**: Mix of "cache for speed" and "cache for offline"
- **Confusion**: When does offline mode actually work?
- **Example**: Can read cached messages offline, but can't see new messages when back online until listener fires

---

## What Would It Take to Remove Caching?

### Option 1: **Remove SQLite Entirely (Firestore Only)**

#### Changes Required:
1. **Remove** `src/services/sqlite/sqliteService.ts` (632 lines)
2. **Update** `src/hooks/useMessages.ts` - remove `loadCachedMessages` call
3. **Update** `src/services/messaging/conversationService.ts` - remove SQLite calls
4. **Update** `src/services/messaging/messageService.ts` - remove `saveMessage` calls in listener
5. **Remove** offline queue functionality (or redesign with Firestore only)
6. **Update** `AuthContext.tsx` - remove cache clearing logic
7. **Remove** database initialization from `app/_layout.tsx`, `app/new-chat.tsx`, etc.

#### Pros:
- ✅ **Simpler**: Single source of truth (Firestore)
- ✅ **No stale data**: Always fresh from Firestore
- ✅ **No migrations**: Firestore handles schema changes
- ✅ **Less code**: ~800-1000 lines of code removed
- ✅ **Easier debugging**: Clear data flow

#### Cons:
- ❌ **Slower first load**: Must wait for Firestore
- ❌ **No offline read**: Can't view messages without network
- ❌ **No offline write queue**: Can't send messages offline (Firestore has built-in offline support though)
- ❌ **More network usage**: Re-fetch data on every app open
- ❌ **Firestore costs**: More reads = higher costs

---

### Option 2: **Firestore Offline Persistence Only (RECOMMENDED)**

#### Changes Required:
1. **Enable Firestore offline persistence** (built-in feature)
2. **Remove ALL custom SQLite code** (including offline queue)
3. **Use Firestore's built-in write queue** for offline messages
4. **Simplify hooks** - remove cache-first logic

#### Implementation:
```typescript
// In firebase.ts
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
```

#### How Firestore Handles Offline Writes:
- When you call `addDoc()` or `setDoc()` while offline, Firestore **automatically queues the write**
- The write appears to succeed immediately (optimistic update)
- Firestore stores pending writes in IndexedDB (web) or local storage (mobile)
- When network returns, Firestore **automatically syncs** pending writes
- If a write fails, Firestore retries with exponential backoff
- You can use `waitForPendingWrites()` to check sync status

#### Pros:
- ✅ **Simpler than current**: Firestore handles EVERYTHING
- ✅ **Offline support**: Built-in read AND write queueing
- ✅ **No schema migrations**: Firestore handles it
- ✅ **Automatic sync**: Firestore syncs when online
- ✅ **Smart caching**: Firestore only caches what you query
- ✅ **No SQLite at all**: Can remove entire sqliteService.ts
- ✅ **Battle-tested**: Used by millions of apps

#### Cons:
- ❌ **Less control**: Can't customize cache behavior
- ❌ **Firestore limitations**: 40MB cache limit on web (unlimited on React Native)
- ❌ **No manual retry UI**: Can't show "retry" button for failed messages (Firestore auto-retries)
- ❌ **Limited visibility**: Can't easily show "X pending messages" count

---

### Option 3: **Improve Current Strategy**

#### Changes Required:
1. **Add TTL (time-to-live)** to cache entries
2. **Implement selective invalidation** - clear cache for specific conversations/messages
3. **Better sync strategy** - background sync, periodic refresh
4. **Simplify state management** - single state machine for cached/loading/live
5. **Add cache metrics** - track hit/miss rates, identify what to cache

#### Pros:
- ✅ **Keep offline capabilities**: Full control
- ✅ **Optimize for speed**: Instant loads with fresh data
- ✅ **Incremental improvement**: Don't need to rewrite

#### Cons:
- ❌ **More complexity**: Cache invalidation is hard
- ❌ **More code**: Need TTL, metrics, invalidation logic
- ❌ **Maintenance burden**: More things to debug

---

## Recommendation

### **Go with Option 2: Firestore Offline Persistence ONLY (Remove ALL SQLite)**

#### Why?
1. **Maximum simplicity**: Firestore handles reads, writes, AND offline queueing
2. **Proven technology**: Firestore offline persistence is used by millions of apps
3. **Less maintenance**: No schema migrations, no cache invalidation, no queue management
4. **Better than custom**: Firestore's write queue is more robust than our custom SQLite queue
5. **Fewer bugs**: Single source of truth eliminates sync issues

#### What to Use:
- ✅ Firestore offline persistence for **automatic caching**
- ✅ Firestore built-in write queue for **offline messages**
- ✅ `waitForPendingWrites()` for **sync status** (if needed)

#### What to Remove:
- ❌ **ALL SQLite code** (sqliteService.ts, offlineQueueService.ts, syncService.ts)
- ❌ SQLite conversations table
- ❌ SQLite messages table  
- ❌ SQLite pendingMessages table (Firestore handles this!)
- ❌ Cache-first loading logic in hooks
- ❌ Manual cache saving in listeners
- ❌ Cache clearing on user switch (Firestore handles this)
- ❌ Offline queue sync logic (Firestore handles this!)

#### Code Removal:
- `src/services/sqlite/sqliteService.ts` - **632 lines** ❌
- `src/services/messaging/offlineQueueService.ts` - **~100 lines** ❌
- `src/services/messaging/syncService.ts` - **~80 lines** ❌
- Cache-first logic in hooks - **~200 lines** ❌
- **Total: ~1000+ lines of code removed** 🎉

---

## Implementation Plan

### Phase 1: Enable Firestore Offline Persistence (30 minutes)
1. Update `src/config/firebase.ts` - add `persistentLocalCache()`
2. Test that offline reads work
3. Test that offline writes work (send message while offline)
4. Verify Firestore auto-syncs when back online

### Phase 2: Remove SQLite References (2-3 hours)
1. **Remove imports** of sqliteService from all files
2. **Remove** `loadCachedMessages` call from `useMessages`
3. **Remove** SQLite save calls from `messageService.listenToMessages`
4. **Remove** SQLite calls from `conversationService`
5. **Remove** offline queue service imports
6. **Remove** sync service imports
7. **Remove** database initialization calls

### Phase 3: Delete SQLite Files (5 minutes)
1. Delete `src/services/sqlite/sqliteService.ts`
2. Delete `src/services/messaging/offlineQueueService.ts`
3. Delete `src/services/messaging/syncService.ts`
4. Remove SQLite dependencies from `package.json` (expo-sqlite)

### Phase 4: Update Message Sending Logic (1 hour)
1. Simplify `sendMessage` - just call Firestore (no manual queue)
2. Rely on Firestore's optimistic updates
3. Remove custom "pending/sent/failed" status tracking
4. Let Firestore listener handle all updates

### Phase 5: Update Auth Context (30 minutes)
1. Remove cache clearing logic from `signOut`
2. Remove cache clearing on user switch
3. Firestore handles this automatically

### Phase 6: Testing (2-3 hours)
1. Test offline message sending
2. Test offline message reading
3. Test sync when back online
4. Test user switching
5. Test sign out/sign in

### Phase 7: Clean Up & Documentation (1 hour)
1. Update README
2. Update memory bank
3. Remove SQLite-related documentation
4. Add Firestore offline persistence documentation

---

## Estimated Effort

- **Option 1 (Remove SQLite entirely)**: ~~1-2 days~~ **NOT RECOMMENDED**
- **Option 2 (Firestore offline only)**: **1 day** ⭐ **RECOMMENDED**
- **Option 3 (Improve current)**: 1-2 weeks

---

## Questions to Consider

1. **How important is instant app startup?** (cache-first = instant, Firestore-only = 200-500ms delay)
2. **How important is offline support?** (full offline = SQLite, basic offline = Firestore persistence)
3. **How often do users go offline?** (if rarely, simpler is better)
4. **What's the data size?** (if large, caching helps; if small, just use Firestore)
5. **How often does data change?** (if frequently, cache-first causes stale data issues)

---

## Final Thought

The current strategy was designed for **maximum offline capability** and **instant app startup**. But in practice, it's caused **complexity and bugs** (stale data, cache mismatches, sync issues).

**For a chat app**, real-time updates are more important than instant startup. Firestore offline persistence gives you 90% of the benefits with 10% of the complexity.

---

## YES, You Can Use Firestore for Offline Message Queueing!

### How It Works:
```typescript
// While offline, this still works!
await addDoc(collection(db, 'messages'), {
  text: 'Hello from offline',
  timestamp: serverTimestamp(),
  // ... other fields
});

// Firestore automatically:
// 1. Queues the write locally
// 2. Returns immediately (optimistic)
// 3. Syncs when network returns
// 4. Retries on failure
```

### Benefits Over Custom SQLite Queue:
1. **Automatic**: No manual queue management
2. **Robust**: Exponential backoff, conflict resolution
3. **Reliable**: Battle-tested by millions of apps
4. **Simple**: Just call Firestore - it handles everything
5. **Type-safe**: No SQL schema to maintain

### What About Failed Writes?
Firestore handles them automatically:
- Retries with exponential backoff
- Resolves conflicts intelligently
- Notifies you via `SnapshotMetadata.hasPendingWrites`

### Can We Show "Sending..." Status?
Yes! Use `SnapshotMetadata`:
```typescript
onSnapshot(docRef, { includeMetadataChanges: true }, (snapshot) => {
  if (snapshot.metadata.hasPendingWrites) {
    // Show "Sending..." indicator
  } else {
    // Message is synced!
  }
});
```

---

**Recommendation: Remove ALL SQLite. Use Firestore for everything.**

This will:
- ✅ Remove ~1000 lines of code
- ✅ Eliminate stale data bugs
- ✅ Simplify offline support
- ✅ Reduce maintenance burden
- ✅ Make the codebase much easier to understand

