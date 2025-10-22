# **Realtime Database PRD 06.1 – Presence System (RTDB Migration)**

**Project:** MessageAI  
**Scope:** Fix presence tracking using Firebase Realtime Database  
**Platform:** React Native (Expo)  
**Backend:** Firebase Realtime Database (RTDB) for presence + Firestore (client-side sync)  
**Goal:** Accurate online/offline indicators and "last seen" timestamps with proper disconnect detection  
**Implementation:** Client-side only (NO Cloud Functions for MVP)

---

## **Problem Statement**

Current Firestore-based presence (PRD 06) has a critical bug:
- **Shows all users as "online" all the time**
- App state listeners don't fire on crashes/force-quits
- No reliable disconnect detection mechanism

**Solution:** Firebase Realtime Database with `.info/connected` and `onDisconnect()` handlers provides proper disconnect detection.

---

## **Success Criteria**

✅ Users show "online" when app is active  
✅ Users show "offline" within 1 second of disconnect/crash  
✅ "Last seen" timestamps update accurately  
✅ Updates appear in real time across devices  
✅ System recovers from app crashes or sudden disconnects  
✅ Lightweight (minimal database writes)  
✅ Synced with Firestore (client-side, no Cloud Functions)  
✅ Drop-in replacement for existing presence system  
⚠️ **Typing indicators deferred to Phase 2** (focus on fixing presence first)

---

## **Functional Overview**

### **User Presence (Phase 1 - This PRD)**

Each authenticated user maintains a presence record in Firebase Realtime Database (RTDB).

**Presence updates automatically when:**
- User connects to Firebase (app starts)
- App disconnects (network loss, crash, force-quit, app closed)

**Client-side implementation:**

1. **Listen to `.info/connected`** - Firebase's built-in connection status
2. **When connected:**
   - Write `{ state: "online", lastSeenAt: serverTimestamp() }` to `/status/{uid}`
   - Register `onDisconnect()` handler to set `{ state: "offline", lastSeenAt: serverTimestamp() }`
3. **Mirror to Firestore (client-side):**
   - Client listens to its own RTDB `/status/{uid}` path
   - Updates Firestore `users/{uid}` with `{ online, lastSeen }` fields
   - Keeps existing UI code working (no changes to components)

**Why RTDB + Firestore?**
- **RTDB:** Reliable disconnect detection (`.info/connected` + `onDisconnect()`)
- **Firestore:** Main data store for all other user data, queries, and existing UI
- **Client-side sync:** No Cloud Functions needed, simpler MVP

---

### **Typing Indicators (Phase 2 - Deferred)**

**Status:** Deferred to post-MVP  
**Rationale:** Fix presence first, then add typing if time permits

When implemented:
- Track typing status per conversation in `/typing/{conversationId}/{userId}`
- Client-side listeners and updates (no Cloud Functions)
- Auto-cleanup on disconnect via `onDisconnect()` handlers

---

## **Data Model**

### **Firebase Realtime Database**

```
/status/{userId}
  state: "online" | "offline"
  lastSeenAt: <server timestamp (milliseconds)>
```

**Example:**

```json
{
  "status": {
    "user123": {
      "state": "online",
      "lastSeenAt": 1729874531200
    },
    "user456": {
      "state": "offline",
      "lastSeenAt": 1729873210000
    }
  }
}
```

---

### **Firestore (Mirrored by Client)**

**No schema changes** - Existing fields remain:

```typescript
// users/{userId}
interface User {
  // ... existing fields ...
  online: boolean;        // Mirrored from RTDB /status/{userId}.state
  lastSeen: number;       // Mirrored from RTDB /status/{userId}.lastSeenAt
}
```

**Sync flow:**
1. Client updates presence in RTDB `/status/{userId}`
2. Client's RTDB listener fires
3. Client updates its own Firestore `users/{userId}` document
4. All other clients see update via existing Firestore listeners (no code changes)

---

## **Core Logic Flow**

### **1. Initialization (on user login)**

```typescript
// In AuthContext or app root after authentication
rtdbPresenceService.initialize(userId);
```

**What happens:**
1. Client connects to RTDB
2. Listens to `.info/connected` (Firebase's connection status)
3. When connected:
   - Writes `{ state: "online", lastSeenAt: serverTimestamp() }` to RTDB `/status/{userId}`
   - Registers `onDisconnect()` handler to write `{ state: "offline", lastSeenAt: serverTimestamp() }`
4. Sets up RTDB listener on own `/status/{userId}` path
5. Mirrors updates to Firestore `users/{userId}` document

---

### **2. Disconnect Detection (automatic)**

**Scenario: User force-quits app or loses connection**

1. Firebase RTDB detects disconnect (network layer)
2. RTDB automatically executes `onDisconnect()` handler
3. RTDB writes: `{ state: "offline", lastSeenAt: <timestamp> }`
4. All listening clients receive update via their Firestore listeners
5. UI updates to show user offline

**This happens WITHOUT client code running** - Firebase handles it server-side.

---

### **3. Reconnection (automatic)**

**Scenario: User reopens app or regains connection**

1. Client reconnects to Firebase
2. `.info/connected` changes to `true`
3. Client writes: `{ state: "online", lastSeenAt: <timestamp> }`
4. Registers new `onDisconnect()` handler
5. Mirrors to Firestore
6. UI updates to show user online

---

## **Performance & Constraints**

| Metric                     | Target    | Notes                                        |
| -------------------------- | --------- | -------------------------------------------- |
| Presence write latency     | < 100ms   | via RTDB socket connection                   |
| Disconnect detection       | < 1s      | Firebase RTDB server-side detection          |
| Firestore mirror delay     | < 500ms   | Client-side listener + update                |
| RTDB writes per user       | ~2-4/hour | Only on connect/disconnect                   |
| Firestore writes per user  | ~2-4/hour | Mirrored from RTDB                           |
| No impact on app bundle    | 0 KB      | Firebase packages already included           |

**Key Performance Benefits:**
- Minimal writes (only state changes, not periodic heartbeats)
- No polling - event-driven updates only
- Existing Firestore listeners work unchanged
- No additional network overhead for UI

---

## **Security Rules**

### **Realtime Database Rules**

Create/update `database.rules.json` in project root:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "status": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid === $uid"
      }
    }
  }
}
```

**Rules explanation:**
- **Default deny** - Security first
- **Read status** - Any authenticated user can read presence (needed for displaying online status)
- **Write status** - Users can only write their own presence status
- **No unauthenticated access** - All operations require authentication

**Deployment:**
```bash
firebase deploy --only database
```

---

## **Implementation Approach**

### **Client-Side Only (No Cloud Functions)**

**Why no Cloud Functions:**
- Adds deployment complexity
- Requires Firebase Blaze plan (pay-as-you-go)
- Not needed for MVP - client can mirror its own data
- Easier to debug and test

**Client-side mirroring pattern:**
```typescript
// Each client listens to its own RTDB status and mirrors to Firestore
rtdb.ref(`/status/${userId}`).on('value', (snapshot) => {
  const status = snapshot.val();
  if (status) {
    // Update Firestore with RTDB data
    firestore.doc(`users/${userId}`).update({
      online: status.state === 'online',
      lastSeen: status.lastSeenAt
    });
  }
});
```

**Benefits:**
- Simple implementation
- No server-side code to maintain
- Works within MVP constraints
- Can add Cloud Functions later if needed

---

## **Testing Scenarios**

| Test                           | Expected Result                                       |
| ------------------------------ | ----------------------------------------------------- |
| App starts                     | User shows "online" immediately                       |
| Force-quit app                 | User shows "offline" within 1s (via onDisconnect)    |
| Network disconnect             | User shows "offline" within 1s                        |
| User reopens app               | User shows "online" immediately                       |
| Switch to another app          | User remains "online" (no immediate offline)          |
| Presence mirrored to Firestore | Firestore `users/{uid}.online/.lastSeen` stays synced |
| Multiple devices               | All devices see same presence status                  |
| Unauthorized write attempt     | Blocked by RTDB security rules                        |

**Manual Testing Steps:**
1. Login on Device A → Should show online
2. Open conversation on Device B → Should see Device A online
3. Force-quit app on Device A → Device B should see offline within 1s
4. Reopen app on Device A → Device B should see online immediately

---

## **Risks & Mitigations**

| Risk                                           | Mitigation                                        |
| ---------------------------------------------- | ------------------------------------------------- |
| Rapid presence flapping (unstable connections) | Minimal - RTDB only writes on actual state change |
| Client crashes before mirroring to Firestore   | Accept minor delay; reconnect fixes it            |
| Firestore and RTDB out of sync                 | RTDB is source of truth; Firestore catches up     |
| Additional Firebase service to maintain        | Worth it - proper disconnect detection required   |
| RTDB free tier limits                          | 1GB storage, 10GB/month download - plenty for MVP |

---

## **Deliverables**

### **Code Files**
- [ ] `src/services/user/rtdbPresenceService.ts` - RTDB presence logic
- [ ] `src/config/firebase.ts` - Add RTDB initialization
- [ ] `database.rules.json` - RTDB security rules
- [ ] Update `src/store/AuthContext.tsx` - Call RTDB service on login
- [ ] Update `src/hooks/usePresence.ts` - Remove Firestore listener (keep for UI compatibility)
- [ ] Remove `src/hooks/usePresenceUpdates.ts` - No longer needed (RTDB handles it)
- [ ] Remove `src/services/user/presenceService.ts` - Replace with RTDB version

### **Testing**
- [ ] Unit tests for `rtdbPresenceService.ts` (mock RTDB)
- [ ] Manual test: Force-quit app → presence goes offline
- [ ] Manual test: Reopen app → presence goes online
- [ ] Manual test: Multiple devices see same status

### **Configuration**
- [ ] Enable Realtime Database in Firebase Console
- [ ] Deploy security rules: `firebase deploy --only database`
- [ ] Update `.env` if needed (RTDB uses same config)

### **Documentation**
- [ ] Update `memory-bank/systemPatterns.md` - Document RTDB presence pattern
- [ ] Update `memory-bank/techContext.md` - Add RTDB to tech stack

---

## **Success = Accurate, Fast, Self-Healing Presence**

When this feature is complete:

1. ✅ Users show "online" when app is active
2. ✅ Users show "offline" within 1s of disconnect/crash
3. ✅ "Last seen" timestamps are accurate
4. ✅ Presence recovers automatically from disconnects
5. ✅ Updates mirror to Firestore (existing UI works unchanged)
6. ✅ Cloud Functions deployed for reliable mirroring
7. ✅ Drop-in replacement for broken Firestore approach

---

## **Implementation Notes (Post-Completion)**

### Final Architecture (Updated During Implementation)

After initial testing revealed that client-side mirroring was insufficient for disconnection scenarios, we implemented **server-side mirroring via Cloud Functions** for production reliability:

#### Cloud Function Mirroring
- **Function:** `onPresenceChange` in `functions/src/index.ts`
- **Trigger:** RTDB `/status/{uid}` onWrite events
- **Action:** Mirrors RTDB status to Firestore `users/{uid}` document
- **Instance:** Explicitly specified `.instance('msg-ai-1-default-rtdb')` for correct RTDB instance
- **Timestamp:** Always uses `admin.firestore.FieldValue.serverTimestamp()` for consistency

#### Critical Bug Fixes

**1. Logout Race Condition**
- **Problem:** User remained "online" after logout due to connection listener overwriting explicit offline status
- **Solution:** Reversed cleanup order in `AuthContext.signOut()`:
  1. First: Stop connection listener (`cleanup()`)
  2. Second: Set offline status (`setOffline()`)
  3. Third: Sign out from Firebase Auth
- **Files:** `src/store/AuthContext.tsx`, `src/services/user/rtdbPresenceService.ts`

**2. Logout Button Bypass**
- **Problem:** Header logout button in `app/(tabs)/_layout.tsx` was directly calling Firebase Auth's `signOut()`, bypassing presence cleanup
- **Solution:** Updated button to call `signOut()` from `useAuth()` (AuthContext)
- **File:** `app/(tabs)/_layout.tsx`

**3. "Invalid Date" Display**
- **Problem:** `lastSeen` timestamps showing as "Invalid Date" in UI
- **Root Cause:** Inconsistent timestamp handling between RTDB `serverTimestamp()` (special object) and Firestore requirements
- **Solution:** 
  - Cloud Function always writes `admin.firestore.FieldValue.serverTimestamp()` for Firestore consistency
  - `usePresence` hook converts Firestore Timestamp objects to milliseconds via `.toMillis()`
- **Files:** `functions/src/index.ts`, `src/hooks/usePresence.ts`, `src/utils/presenceUtils.ts`

**4. Static "Last Seen" Text**
- **Problem:** "Last seen" relative time (e.g., "Just now") not updating as time progressed
- **Solution:** 
  - Created global `useCurrentTime` hook with shared timer across all components
  - `PresenceIndicator` now subscribes to 60-second interval that triggers re-renders
  - Single timer for all presence indicators = efficient and synchronized
- **Files:** `src/hooks/useCurrentTime.ts`, `src/components/users/PresenceIndicator.tsx`

#### Deployment & Configuration

**Firebase Console Permissions:**
- Granted `Artifact Registry Reader` role to Cloud Functions service account for deployment
- Granted `Editor` role for Firestore write permissions

**RTDB Instance Specification:**
- Critical: Newer Firebase projects use suffixed instance names (`-default-rtdb`)
- Cloud Function must explicitly specify: `.instance('msg-ai-1-default-rtdb')`
- Without this, function listens to default instance and never triggers

**Documentation Created:**
- `CLOUD_FUNCTIONS_SETUP.md` - Deployment instructions
- `EMULATOR_TESTING.md` - Local testing guide
- `RTDB_INSTANCE_FIX.md` - Instance name requirement explanation
- `LOGOUT_PRESENCE_FIX.md` - Race condition details
- `PRD_06.1_COMPLETION_SUMMARY.md` - Final summary

#### Final File Structure

**New Files:**
- `src/services/user/rtdbPresenceService.ts` - RTDB presence service with `setOffline()` method
- `src/hooks/useCurrentTime.ts` - Global timer hook for relative time updates
- `database.rules.json` - RTDB security rules
- `functions/src/index.ts` - Cloud Function for RTDB → Firestore mirroring
- `functions/package.json`, `functions/tsconfig.json`, `functions/.gitignore`

**Modified Files:**
- `src/config/firebase.ts` - Added RTDB initialization with `databaseURL`
- `firebase.json` - Added database and functions configuration
- `src/store/AuthContext.tsx` - Fixed logout sequence, call `setOffline()`
- `app/(tabs)/_layout.tsx` - Fixed logout button to use `AuthContext.signOut()`
- `src/hooks/usePresence.ts` - Added Firestore Timestamp conversion
- `src/components/users/PresenceIndicator.tsx` - Uses `useCurrentTime` hook
- `src/utils/presenceUtils.ts` - Added validation for invalid `lastSeen` values
- `src/utils/userLookup.ts` - Added `online` field

**Deleted Files:**
- `src/services/user/presenceService.ts` - Old Firestore-only service
- `src/hooks/usePresenceUpdates.ts` - No longer needed

#### Lessons Learned

1. **Client-Side Mirroring Limitations:** Fails when app crashes/force-quits before mirroring can occur
2. **Server-Side Reliability:** Cloud Functions ensure updates happen even if client is offline
3. **Logout is Complex:** Requires careful ordering of cleanup operations to avoid race conditions
4. **Multiple Logout Paths:** Check all UI locations where logout can occur (buttons, screens, etc.)
5. **Timestamp Consistency:** Use Firestore's server timestamp for all Firestore writes
6. **Performance Optimization:** Global timers are better than per-component timers
7. **Firebase Instance Names:** Always verify and specify RTDB instance in Cloud Functions

---

## **Status: ✅ COMPLETE**

All acceptance criteria met:
- ✅ Presence shows online/offline accurately
- ✅ Disconnect detection within 1 second
- ✅ "Last seen" timestamps accurate and updating
- ✅ Logout properly sets user offline
- ✅ Cloud Functions deployed and working
- ✅ Unit tests passing
- ✅ Documentation complete
