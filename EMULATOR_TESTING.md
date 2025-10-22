# Testing Cloud Functions with Emulators

## 🎯 The Problem

The Firebase Functions emulator **only triggers on emulated services**, not live production databases.

```
❌ Your App → Live RTDB → (Functions Emulator doesn't see this)
✅ Your App → Emulated RTDB → Functions Emulator triggers!
```

---

## Option 1: Full Local Emulator Testing (Best for Development)

### 1. Start All Emulators

```bash
firebase emulators:start
```

This starts:
- **Functions Emulator** (port 5001)
- **RTDB Emulator** (port 9000)
- **Firestore Emulator** (port 8080)
- **Emulator UI** (port 4000 - http://localhost:4000)

### 2. Configure Your App to Use Emulators

Update `src/config/firebase.ts` to detect and use emulators in development:

```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';

// ... firebaseConfig ...

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// Connect to emulators in development
// WARNING: Only enable this when explicitly testing with emulators
// Comment out or use environment variable to control
if (__DEV__ && false) { // Set to true when testing with emulators
  console.log('🔧 Connecting to Firebase Emulators...');
  
  // Connect Auth Emulator
  connectAuthEmulator(auth, 'http://localhost:9099');
  
  // Connect Firestore Emulator
  connectFirestoreEmulator(db, 'localhost', 8080);
  
  // Connect RTDB Emulator
  connectDatabaseEmulator(rtdb, 'localhost', 9000);
  
  // Connect Storage Emulator
  connectStorageEmulator(storage, 'localhost', 9199);
  
  console.log('✅ Connected to Firebase Emulators');
}
```

### 3. Test the Flow

1. **Start emulators:** `firebase emulators:start`
2. **Enable emulator mode** in `firebase.ts` (set `&& false` to `&& true`)
3. **Run your app:** `npx expo run:android`
4. **Login** (creates user in emulator)
5. **Watch Emulator UI:** http://localhost:4000
   - See RTDB `/status/{uid}` change to "online"
   - See Firestore `users/{uid}` update to `online: true`
6. **Force-quit app**
7. **Watch Emulator UI:**
   - RTDB updates to "offline" (via onDisconnect)
   - Functions tab shows `onPresenceChange` triggered
   - Firestore updates to `online: false` ✅

### 4. When Done, Disable Emulator Mode

```typescript
if (__DEV__ && false) { // Set back to false for production
```

---

## Option 2: Deploy and Test with Live RTDB (Fastest for Quick Testing)

If you just want to verify the function works:

### 1. Deploy the Function to Production

```bash
# Make sure you're on Blaze plan first!
firebase deploy --only functions
```

### 2. Test with Your App (Already Connected to Live RTDB)

Your app is already connected to live RTDB, so:

1. **Login** on your device
2. **Check Firebase Console:**
   - Go to Realtime Database tab
   - See `/status/{uid}` show "online"
3. **Force-quit app**
4. **Wait 2 seconds**
5. **Check Firebase Console:**
   - RTDB shows "offline" ✅
   - Go to Firestore → `users/{uid}`
   - Should show `online: false` ✅
6. **Check Functions Logs:**
   ```bash
   firebase functions:log
   ```
   Should see: `[Cloud Function] Mirroring presence for user {uid}: offline`

---

## Option 3: Hybrid - Deploy Function, Test Locally

Deploy the function but keep testing with your local app:

```bash
# Deploy function to production
firebase deploy --only functions

# Your app uses live RTDB (already configured)
# Function triggers on live RTDB changes
# No emulator needed!
```

---

## 🔍 Debugging Tips

### Check if Functions Emulator is Receiving Events

When running `firebase emulators:start`, watch the console output:

```bash
# Should see this when RTDB changes:
>  functions[us-central1-onPresenceChange]: function triggered
>  [Cloud Function] Mirroring presence for user abc123: offline
```

### View Emulator UI Dashboard

Open http://localhost:4000 to see:
- **Functions** tab → Execution logs
- **RTDB** tab → Real-time data
- **Firestore** tab → Document updates

### Common Issues

**Issue:** "Function not triggering"
- ✅ Check: Are both RTDB and Functions emulators running?
- ✅ Check: Is your app connected to emulator RTDB (port 9000)?
- ✅ Check: See `connectDatabaseEmulator()` in firebase.ts

**Issue:** "Can't see data in Emulator UI"
- ✅ Make sure emulators are started with UI enabled
- ✅ Check: http://localhost:4000 is accessible

**Issue:** "Emulator data persists between runs"
- Clear emulator data: `firebase emulators:start --import=./emulator-data --export-on-exit`

---

## 🎯 Recommended Workflow

**For Development:**
```bash
# Use emulators for rapid iteration
firebase emulators:start

# Enable emulator connection in firebase.ts
# Test locally with instant feedback
```

**For Final Testing:**
```bash
# Deploy to production
firebase deploy --only functions

# Test with live RTDB (more realistic)
# Verify in Firebase Console
```

**For Production:**
```bash
# Disable emulator connections in firebase.ts
# Deploy everything
firebase deploy
```

---

## 📊 Current Setup

Your app is currently set up to use:
- ✅ **Production RTDB** (live data)
- ✅ **Production Firestore** (live data)
- ✅ **Production Auth** (live users)

To test the Cloud Function locally:
1. Either switch app to use emulators (Option 1)
2. Or deploy function to production (Option 2 - **Recommended**)

**Quickest path to test:** Just deploy the function and test with live RTDB! 🚀

