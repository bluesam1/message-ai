# Cloud Functions for MessageAI

## Setup

Cloud Functions handle server-side logic that runs even when clients are offline.

### Current Functions

1. **onPresenceChange** - Mirrors RTDB presence to Firestore
   - Triggered: When `/status/{uid}` changes in Realtime Database
   - Action: Updates `users/{uid}.online` and `.lastSeen` in Firestore
   - Why: Ensures Firestore stays in sync even when user's client crashes/disconnects

### Prerequisites

1. **Firebase Blaze Plan** (Pay-as-you-go)
   - Free tier: 2M invocations/month, 400K GB-seconds/month
   - Upgrade: https://console.firebase.google.com/project/msg-ai-1/usage

2. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

## Development

### Build Functions
```bash
cd functions
npm run build
```

### Test Locally with Emulator
```bash
npm run serve
```

### View Logs
```bash
npm run logs
```

## Deployment

### Deploy All Functions
```bash
# From project root:
firebase deploy --only functions

# Or from functions directory:
npm run deploy
```

### Deploy Specific Function
```bash
firebase deploy --only functions:onPresenceChange
```

### First Time Deployment

1. Ensure you're on Firebase Blaze plan
2. Build the functions:
   ```bash
   cd functions
   npm install
   npm run build
   ```

3. Deploy:
   ```bash
   cd ..
   firebase deploy --only functions
   ```

4. Verify in Firebase Console:
   - Go to Functions tab
   - Should see `onPresenceChange` function listed
   - Check logs for any errors

## Function Details

### onPresenceChange

**Trigger:** Database write to `/status/{uid}`

**Flow:**
1. User connects/disconnects → RTDB `/status/{uid}` updates
2. Cloud Function triggers automatically
3. Function reads RTDB status
4. Function updates Firestore `users/{uid}`:
   - `online`: boolean (true/false)
   - `lastSeen`: timestamp

**Why This Matters:**
Without this function, when a user disconnects/crashes:
- RTDB correctly shows "offline" (via onDisconnect)
- But Firestore would stay "online" forever (client can't update when offline)
- UI reads from Firestore → shows wrong status

With this function:
- RTDB shows offline → Function runs → Firestore updated → UI correct! ✅

## Cost Estimates

**Typical Usage (100 users):**
- ~400 status changes/day (users opening/closing app)
- 400 function invocations/day = 12,000/month
- Well within free tier (2M/month)

**Estimated Monthly Cost:** $0 (within free tier)

## Monitoring

Check function performance:
```bash
firebase functions:log
```

Or view in Console:
https://console.firebase.google.com/project/msg-ai-1/functions

## Future Functions

- `sendPushNotification` - Coming in PRD 08
- `onNewMessage` - Trigger notifications on new messages

