# Expo Push Notifications Setup

## Overview

This project uses Expo's push notification service for cross-platform push notifications (iOS and Android).

## How It Works

1. **Client App** - Uses `expo-notifications` to get Expo Push Tokens
2. **Firestore** - Stores user tokens in the `expoPushTokens` array field
3. **Cloud Function** - Sends notifications via Expo's Push API when messages are created
4. **Expo Service** - Routes notifications to Apple (APNs) and Google (FCM) servers

## Authentication Modes

### Development/Testing (Default)
- **No authentication required**
- Expo SDK works without an access token
- ⚠️ **Limited to lower rate limits**
- ✅ **Perfect for Expo Go and testing**

### Production (Recommended)
- **Requires Expo Access Token**
- Higher rate limits
- Better reliability
- Required for production apps with many users

## Setting Up Expo Access Token (Optional for Development)

### Step 1: Create an Expo Account
1. Go to [expo.dev](https://expo.dev)
2. Sign up or log in

### Step 2: Generate an Access Token
1. Go to [https://expo.dev/accounts/[your-account]/settings/access-tokens](https://expo.dev/accounts/)
2. Click "Create Token"
3. Give it a name (e.g., "Cloud Functions")
4. Copy the token (you won't see it again!)

### Step 3: Configure Local Development
Add to `functions/.env`:
```bash
EXPO_ACCESS_TOKEN=your-expo-access-token-here
```

### Step 4: Configure Production (Firebase)
```bash
firebase functions:config:set expo.access_token="your-expo-access-token-here"
```

Then update `functions/src/index.ts` to use Firebase config:
```typescript
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN || functions.config().expo?.access_token,
});
```

## Testing Without Access Token

**Good news:** The current setup works out of the box for development!

1. Run the app in Expo Go
2. The app gets an Expo Push Token automatically
3. Send a message
4. The Cloud Function sends the notification via Expo's service
5. Expo routes it to your device

**You only need the access token for:**
- High-volume production apps
- Apps with many users sending notifications
- Better rate limits and reliability

## Verifying It Works

### Check Token Generation
Look for this in your app logs:
```
[NotificationService] Got Expo push token: ExponentPushToken[xxxxxx]...
```

### Check Cloud Function Logs
```bash
firebase functions:log --only sendPushNotification
```

Look for:
```
[Cloud Function] Notifications sent: X success, 0 failures
```

## Rate Limits

### Without Access Token:
- ~600 notifications per hour per IP
- Sufficient for development and small apps

### With Access Token:
- Much higher limits (varies by plan)
- Contact Expo for enterprise limits

## Troubleshooting

### "Invalid Expo Push Token"
- Token format should be: `ExponentPushToken[xxxxxxxxxxxxxx]`
- Old format: `ExpoPushToken[xxxx]` (also valid)
- Make sure you're using `getExpoPushTokenAsync()` not `getDevicePushTokenAsync()`

### "DeviceNotRegistered" Error
- User uninstalled the app
- Token expired
- The Cloud Function automatically removes these

### No Notifications on iOS
- Make sure you're using Expo Go or a development build
- iOS production builds need APNs configuration
- Expo handles this automatically in Expo Go

## Production Checklist

- [ ] Create Expo account
- [ ] Generate access token
- [ ] Set `EXPO_ACCESS_TOKEN` in Firebase Functions config
- [ ] Test with production builds (not just Expo Go)
- [ ] Monitor Firebase Functions logs for errors
- [ ] Set up proper error handling and retries

## Resources

- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push Notification Tool](https://expo.dev/notifications) - Test notifications manually
- [Expo Server SDK](https://github.com/expo/expo-server-sdk-node)
- [Firebase Functions Config](https://firebase.google.com/docs/functions/config-env)

