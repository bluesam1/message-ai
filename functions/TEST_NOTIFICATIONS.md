# Push Notification Testing

This directory contains a functional test for push notifications that can be run manually without interfering with pre-commit hooks.

## Test Script: `test-notifications.js`

### What it does:
1. **Creates test data** - Users, conversation, and message in Firestore
2. **Triggers Cloud Function** - Creates a message which triggers `sendPushNotification`
3. **Verifies execution** - Checks Cloud Function logs for successful execution
4. **Cleans up** - Removes all test data after completion

### How to run:

```bash
# From the functions directory
cd functions
npm run test:notifications

# Or run directly
node test-notifications.js
```

### Prerequisites:
- Firebase project configured
- Cloud Functions deployed (or running locally with emulator)
- Firebase Admin SDK credentials available
- `.env` file configured in functions directory

### What to expect:
1. **Console output** showing test progress
2. **Cloud Function logs** in Firebase Console showing:
   - "New message [id] from [sender] in conversation [id]"
   - "Sending notifications to X recipients"
   - "Notification sent successfully: X success, X failures"

### Verification:
- Check Firebase Console > Functions > Logs
- Look for `sendPushNotification` function execution
- Verify no errors in the logs
- Note: FCM delivery can't be verified without real device tokens

### Notes:
- This script is excluded from pre-commit hooks (see .gitignore)
- Uses test FCM tokens (won't actually deliver to devices)
- Automatically cleans up test data
- Safe to run multiple times

### Setup Instructions:

1. **Configure Firebase CLI:**
   ```bash
   firebase login
   firebase use msg-ai-1
   ```

2. **Environment Configuration:**
   - The `.env` file is already configured with `FIREBASE_PROJECT_ID=msg-ai-1`
   - For production, you may need a service account key file

3. **Install Dependencies:**
   ```bash
   cd functions
   npm install
   ```

### Troubleshooting:
- **Permission errors**: Ensure Firebase Admin SDK is properly configured
- **Function not triggered**: Verify Cloud Functions are deployed
- **No logs**: Check Firebase Console > Functions > Logs
- **Test data not cleaned**: Manually delete from Firestore if needed
- **Firebase initialization errors**: Run `firebase login` and `firebase use msg-ai-1`
