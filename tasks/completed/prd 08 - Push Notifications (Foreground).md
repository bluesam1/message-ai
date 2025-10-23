# PRD 08: Push Notifications

## Overview
Implement push notifications using Expo Notifications, Firebase Cloud Messaging (FCM), and Cloud Functions to alert users of new messages. Cloud Functions automatically send notifications server-side when new messages are created, providing a secure and reliable notification system without requiring complex client-side logic.

**Notification Support:**
- ✅ **Android:** Foreground AND background notifications (app open, backgrounded, or closed)
- ✅ **iOS:** Foreground notifications only (app open or backgrounded, but must be running)

**Timeline:** Hours 21-22 of 24-hour MVP development  
**Priority:** CRITICAL (Core requirement)

---

## Goals
1. Set up Expo Notifications with FCM
2. Request notification permissions from users
3. Generate and store FCM tokens per device
4. Use Cloud Functions to send notifications server-side (secure and reliable)
5. Display notifications on Android in all app states (foreground, background, closed)
6. Display notifications on iOS when app is running (foreground/background)
7. Handle notification taps to navigate to conversation
8. Keep implementation straightforward (defer iOS background to post-MVP)
9. **Enhanced Features:** Add notification collapsing, smart payloads, and iOS badge management

---

## User Stories
- **US-016:** As a user, I want to receive push notifications so I'm alerted to new messages even when using other apps
- **US-NOTIF-001:** As a user, I want notifications to show while the app is open so I see messages in other conversations
- **US-NOTIF-002:** As a user, I want to tap a notification to open the conversation so I can respond quickly
- **US-NOTIF-003:** As a user, I want control over notification permissions so I can disable them if needed
- **US-NOTIF-004:** As a user, I want notifications to be grouped by conversation so multiple messages don't clutter my notification tray
- **US-NOTIF-005:** As a user, I want smart notifications that don't show when I'm actively chatting in that conversation
- **US-NOTIF-006:** As a user, I want to see unread message counts on my app icon (iOS badge)

---

## Functional Requirements

### Notification Setup

1. Install and configure `expo-notifications`:
   - Set up notification channel for Android
   - Configure notification icon (must be white/transparent PNG for Android)
   - Configure notification sound
   - Set notification priority to HIGH
   - Enable background notifications for Android

2. Configure Firebase Cloud Messaging:
   - FCM is automatically enabled with Firebase config files (no legacy server key needed)
   - Config files already added in PRD 01:
     - `google-services.json` (Android)
     - `GoogleService-Info.plist` (iOS)

3. Update `app.json` with notification configuration:
   ```json
   {
     "expo": {
       "notification": {
         "icon": "./assets/notification-icon.png",
         "color": "#4CAF50",
         "androidMode": "default",
         "androidCollapsedTitle": "New messages",
         "iosDisplayInForeground": true
       },
       "android": {
         "googleServicesFile": "./google-services.json",
         "useNextNotificationsApi": true,
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon.png",
           "backgroundColor": "#FFFFFF"
         }
       },
       "ios": {
         "googleServicesFile": "./GoogleService-Info.plist",
         "supportsTabletMultitasking": true
       },
       "plugins": [
         [
           "expo-notifications",
           {
             "icon": "./assets/notification-icon.png",
             "color": "#4CAF50",
             "sounds": ["./assets/notification-sound.wav"]
           }
         ]
       ]
     }
   }
   ```
   
   **Key Android Background Settings:**
   - `useNextNotificationsApi: true` - Enables Android 12+ notification support
   - Notification icon must be white/transparent PNG (Android requirement)
   - `adaptiveIcon` ensures notification icon displays correctly on all Android versions

### Permission Handling

4. Request notification permissions on app first launch:
   - Show permission dialog with clear explanation
   - Handle permission granted/denied states
   - Store permission status locally

5. Allow users to enable notifications later:
   - Show "Enable Notifications" option in settings
   - Link to device settings if permission denied
   - Respect user's choice (don't be pushy)

### FCM Token Management

6. Generate FCM token on app launch:
   - Use `Notifications.getDevicePushTokenAsync()`
   - Handle token generation failures gracefully

7. Store FCM token in Firestore user document:
   ```typescript
   users/{userId}
     - fcmTokens: string[] (array of tokens, one per device)
   ```

8. Update token on change:
   - Listen for token refresh events
   - Update Firestore with new token
   - Remove old tokens periodically

9. Support multiple devices:
   - Store array of tokens (user might have iPhone + iPad)
   - Send notifications to all registered devices
   - Remove invalid tokens after failed sends

### Android Notification Channel Setup

10. Create Android notification channel for messages:
    ```typescript
    // Must be called before showing notifications
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }
    ```

### Foreground Notifications

11. Configure foreground notification behavior:
    ```typescript
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    ```

12. Display notification when new message received:
    - Title: Sender's display name or group name
    - Body: Message text (truncate to 100 chars)
    - Data: conversationId, messageId for navigation

13. Show notification only for messages in inactive conversations:
    - Don't notify if user is already viewing that conversation
    - Track active conversation ID in app state
    - Skip notification if conversationId matches active

### Notification Tapping

14. Handle notification tap:
    - Extract conversationId from notification data
    - Navigate to chat screen with that conversation
    - Mark messages as read

15. Deep linking:
    - Support opening specific conversation from notification
    - Handle app in foreground vs background states

### Sending Notifications (Cloud Functions)

16. Use Cloud Function to automatically send notifications:
    - Triggered by Firestore `onCreate` event for new messages
    - Runs server-side with Firebase Admin SDK
    - More secure (no FCM tokens exposed to clients)
    - Reliable (works even if sender's app crashes)

17. Cloud Function responsibilities:
    - Detect new message in `messages/{messageId}` collection
    - Query conversation to get participants
    - Fetch FCM tokens for all recipients (exclude sender)
    - Format notification based on conversation type (1-on-1 vs group)
    - Send notification via Firebase Admin Messaging
    - Handle invalid tokens and clean them up
    - Log errors for debugging

18. **Enhanced Cloud Function features:**
    - Add notification collapsing with `collapse_key` (Android) and `apns-collapse-id` (iOS)
    - Include `senderName` in notification data payload
    - Add iOS badge count management for unread messages
    - Implement smart payload selection (data-only for active conversations)
    - Add message type detection (text vs image) to data payload
    - Group notifications by conversationId for better organization
    - Detect active conversation state to avoid redundant notifications

### Notification Customization

19. Format notification content:
    - One-on-one: "[Sender Name]: [Message]"
    - Group: "[Group Name] - [Sender]: [Message]"
    - Image: "[Sender] sent an image"

20. Handle special cases:
    - Don't send notification for own messages
    - Don't notify muted conversations (if implementing mute)
    - Batch notifications (if multiple rapid messages)

---

## Non-Goals (Out of Scope)
- ❌ **iOS background notifications** (app completely closed) - requires Apple Developer account and APNs setup
- ❌ Silent notifications for data sync
- ❌ Notification actions (reply, mark read directly from notification)
- ❌ Rich notifications (images, buttons, custom layouts)
- ❌ Notification history/inbox
- ❌ Per-conversation notification settings
- ❌ Do Not Disturb schedules

## Enhanced Features (Easy Wins)
- ✅ **Notification badges/counts** - iOS badge management added
- ✅ **Notification collapsing** - Android/iOS notification grouping
- ✅ **Smart notifications** - Data-only payloads for active conversations
- ✅ **Enhanced data payloads** - Include senderName and message type

---

## Performance Requirements

| Action | Target | Maximum |
|--------|--------|---------|
| Generate FCM token | < 1s | 3s |
| Send notification request | < 500ms | 1s |
| Display notification | Immediate | 100ms |
| Handle notification tap | < 200ms | 500ms |

---

## Technical Considerations

### Notification Service
```typescript
// src/services/notifications/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const notificationService = {
  initialize: async () => {
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }
    
    // Get FCM token
    const token = await notificationService.getToken();
    return token;
  },
  
  getToken: async (): Promise<string | null> => {
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      return tokenData.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  },
  
  saveFcmToken: async (userId: string, token: string) => {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayUnion(token),
    });
  },
  
  removeFcmToken: async (userId: string, token: string) => {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayRemove(token),
    });
  },
};
```

### Notification Listener Hook
```typescript
// src/hooks/useNotifications.ts
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from 'expo-router';

export function useNotifications(activeConversationId: string | null) {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const navigation = useNavigation();
  
  useEffect(() => {
    // Listen for notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { conversationId } = notification.request.content.data;
        
        // Don't show notification if viewing that conversation
        if (conversationId === activeConversationId) {
          return;
        }
        
        // Notification will be displayed automatically by the handler
      }
    );
    
    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { conversationId } = response.notification.request.content.data;
        
        // Navigate to conversation
        navigation.navigate('chat', { id: conversationId });
      }
    );
    
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [activeConversationId]);
}
```

### Cloud Function Implementation
```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Send Push Notifications on New Messages
 * 
 * Listens to new messages in Firestore and sends FCM notifications
 * to recipients' devices. Automatically triggered when a message is created.
 */
export const sendPushNotification = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const messageId = context.params.messageId;
    
    console.log(`[Notification] Processing new message ${messageId}`);
    
    try {
      // 1. Get conversation details
      const conversationRef = admin.firestore().doc(`conversations/${message.conversationId}`);
      const conversationSnap = await conversationRef.get();
      
      if (!conversationSnap.exists) {
        console.error(`[Notification] Conversation ${message.conversationId} not found`);
        return null;
      }
      
      const conversation = conversationSnap.data()!;
      
      // 2. Get recipient IDs (exclude sender)
      const recipientIds = (conversation.participants || [])
        .filter((id: string) => id !== message.senderId);
      
      if (recipientIds.length === 0) {
        console.log(`[Notification] No recipients for message ${messageId}`);
        return null;
      }
      
      // 3. Format notification content
      const isGroup = conversation.type === 'group';
      const title = isGroup 
        ? `${conversation.groupName} - ${message.senderName}`
        : message.senderName;
      
      const body = message.imageUrl 
        ? '📷 Sent an image'
        : message.text || 'New message';
      
      // 4. Send notification to each recipient's devices
      const sendPromises = recipientIds.map(async (recipientId: string) => {
        const userDoc = await admin.firestore().doc(`users/${recipientId}`).get();
        
        if (!userDoc.exists) {
          console.warn(`[Notification] User ${recipientId} not found`);
          return;
        }
        
        const fcmTokens = userDoc.data()?.fcmTokens || [];
        
        if (fcmTokens.length === 0) {
          console.log(`[Notification] No FCM tokens for user ${recipientId}`);
          return;
        }
        
        // Send to each device
        const tokenPromises = fcmTokens.map(async (token: string) => {
          try {
            await admin.messaging().send({
              token,
              notification: {
                title,
                body,
              },
              data: {
                conversationId: message.conversationId,
                messageId,
                type: 'new_message',
              },
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                  channelId: 'messages',
                },
              },
              apns: {
                payload: {
                  aps: {
                    sound: 'default',
                  },
                },
              },
            });
            
            console.log(`[Notification] Sent to ${recipientId} token ${token.substring(0, 10)}...`);
          } catch (error: any) {
            console.error(`[Notification] Failed to send to token ${token.substring(0, 10)}:`, error);
            
            // Remove invalid tokens
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
              console.log(`[Notification] Removing invalid token for user ${recipientId}`);
              await admin.firestore().doc(`users/${recipientId}`).update({
                fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
              });
            }
          }
        });
        
        await Promise.all(tokenPromises);
      });
      
      await Promise.all(sendPromises);
      
      console.log(`[Notification] Successfully processed message ${messageId}`);
      return null;
      
    } catch (error) {
      console.error(`[Notification] Error processing message ${messageId}:`, error);
      return null;
    }
  });
```

### Client-Side Message Sending (Simplified)
```typescript
// messageService.ts - No notification logic needed!
export const messageService = {
  sendMessage: async (message: Message, conversationId: string) => {
    // Simply write the message to Firestore
    // Cloud Function will automatically handle notifications
    await setDoc(doc(db, 'messages', message.id), message);
    
    // Update conversation's lastMessage timestamp
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessageAt: serverTimestamp(),
      lastMessage: message.text || '[Image]',
    });
  },
};
```

### Enhanced Notification Features

**Easy-to-Add Enhancements** that improve notification quality and user experience:

#### 1. Notification Collapsing & Grouping
- **Android:** Add `collapse_key` to group notifications by conversation
- **iOS:** Add `apns-collapse-id` header for notification collapsing
- **Result:** Multiple messages from same conversation show as single notification

#### 2. Enhanced Data Payload
- **Include `senderName`** in notification data for better client-side handling
- **Add message type detection** (text vs image) for smarter display logic
- **Include conversation metadata** for improved navigation

#### 3. iOS Badge Management
- **Badge count logic** in Cloud Function to track unread messages
- **Automatic badge updates** when notifications are sent
- **Badge clearing** when user opens conversation

#### 4. Smart Payload Selection
- **Data-only payloads** for active conversations (no visual notification)
- **Full notifications** for inactive conversations
- **Active conversation detection** via client state or presence system

#### 5. Notification Grouping by Conversation
- **Android notification groups** using conversationId as group key
- **iOS notification threading** for better organization
- **Consistent grouping** across platforms

#### Enhanced Cloud Function Implementation
```typescript
// Enhanced payload with collapse keys and smart logic
const payload = {
  token,
  notification: {
    title,
    body,
  },
  data: {
    conversationId: message.conversationId,
    messageId,
    senderName: message.senderName,
    messageType: message.imageUrl ? 'image' : 'text',
    type: 'new_message',
  },
  android: {
    priority: 'high',
    notification: {
      tag: message.conversationId,  // For grouping
      channelId: 'messages',
    },
    collapseKey: message.conversationId,  // For collapsing
  },
  apns: {
    headers: {
      'apns-collapse-id': message.conversationId,  // iOS collapsing
    },
    payload: {
      aps: {
        sound: 'default',
        badge: unreadCount,  // iOS badge count
      },
    },
  },
};
```

#### Smart Notification Logic
```typescript
// Check if user is actively viewing conversation
const isActiveConversation = await checkUserPresence(recipientId, conversationId);

if (isActiveConversation) {
  // Send data-only payload (no visual notification)
  await admin.messaging().send({
    token,
    data: payload.data,
    // No notification field = data-only
  });
} else {
  // Send full notification
  await admin.messaging().send(payload);
}
```

---

## Design Considerations

### Notification Appearance (System-Controlled)
```
┌────────────────────────────────┐
│ MessageAI           Just now   │
│ Alice                          │
│ Hey, are you free tonight?     │
└────────────────────────────────┘
```

### Permission Request Dialog (Custom)
```
┌────────────────────────────────┐
│ Enable Notifications           │
├────────────────────────────────┤
│ Get notified when you receive  │
│ new messages, even when the    │
│ app is in the background.      │
│                                │
│ [Not Now]  [Enable]            │
└────────────────────────────────┘
```

---

## Success Metrics
- ✅ Notification permissions requested on first launch
- ✅ FCM token generated and stored
- ✅ Foreground notifications display for new messages
- ✅ Tapping notification navigates to correct conversation
- ✅ No notifications shown for active conversation
- ✅ Notifications work on both Android and iOS

---

## Acceptance Criteria

### Client-Side Setup
- [ ] expo-notifications installed and configured
- [ ] FCM configuration files present (google-services.json, GoogleService-Info.plist)
- [ ] app.json updated with notification settings (including Android background config)
- [ ] Notification icon created (white/transparent PNG for Android)
- [ ] Android notification channel created for messages
- [ ] Permission request shown on first app launch
- [ ] FCM token generated successfully on app launch
- [ ] Token stored in Firestore user document (fcmTokens array)
- [ ] Multiple device tokens supported per user
- [ ] Token refresh listener implemented
- [ ] Notification handler configured for foreground display

### Cloud Function Implementation
- [ ] sendPushNotification function created in functions/src/index.ts
- [ ] Function triggered on messages/{messageId} onCreate
- [ ] Function queries conversation to get participants
- [ ] Function fetches FCM tokens for all recipients (excludes sender)
- [ ] Notification formatted correctly (1-on-1 vs group)
- [ ] Firebase Admin Messaging used to send notifications
- [ ] Invalid tokens automatically removed from Firestore
- [ ] Error handling and logging implemented
- [ ] Cloud Function deployed successfully

### Notification Behavior
- [ ] New message triggers notification via Cloud Function
- [ ] Notification displays sender name and message preview
- [ ] Group notifications show group name + sender
- [ ] Image messages show "Sent an image" text
- [ ] Notification does NOT show for active conversation (client-side filtering)
- [ ] Tapping notification opens correct conversation
- [ ] Deep linking works correctly
- [ ] Sound plays with notification
- [ ] **Android:** Notifications work when app in foreground
- [ ] **Android:** Notifications work when app in background
- [ ] **Android:** Notifications work when app is completely closed
- [ ] **iOS:** Notifications work when app in foreground
- [ ] **iOS:** Notifications work when app in background (app running)
- [ ] No crashes related to notifications

---

## Testing Requirements

### Cloud Function Testing
- [ ] Test Cloud Function in Firebase Emulator Suite
- [ ] Verify function triggers on new message creation
- [ ] Test 1-on-1 notification format
- [ ] Test group notification format
- [ ] Test image message notification format
- [ ] Verify sender doesn't receive their own notification
- [ ] Test with invalid FCM token - verify token removed
- [ ] Test with multiple recipients
- [ ] Test with user who has multiple devices
- [ ] Check Cloud Function logs for errors
- [ ] Deploy and test in production Firebase project

### Manual Testing (Client-Side)

**Setup Testing:**
- [ ] Fresh install - verify permission request shown
- [ ] Grant permission - verify token generated and saved
- [ ] Deny permission - verify app still works
- [ ] Token refresh - verify updated in Firestore

**Android Testing (Full Background Support):**
- [ ] App in foreground - verify notification displays
- [ ] App in background (not visible) - verify notification displays
- [ ] App completely closed - verify notification displays
- [ ] Tap notification from any state - verify navigates to conversation
- [ ] Multiple rapid messages - verify all notifications appear
- [ ] Test on Android emulator
- [ ] Test on physical Android device

**iOS Testing (Foreground Only):**
- [ ] App in foreground - verify notification displays
- [ ] App in background (app running) - verify notification displays
- [ ] App force-closed - verify NO notification (expected limitation)
- [ ] Tap notification - verify navigates to conversation
- [ ] Test on iOS simulator (limited - won't receive real FCM)
- [ ] Test on physical iOS device with test notification

**General Testing:**
- [ ] Send message from another device - verify notification appears
- [ ] Send message while viewing conversation - verify notification still sent (filtering is client-side)
- [ ] Send message in group - verify notification format correct
- [ ] Send image - verify notification says "Sent an image"
- [ ] Test with multiple devices (same user) - verify all receive notification
- [ ] Force network error - verify graceful handling
- [ ] Invalid FCM token - verify removed from Firestore

---

## Open Questions
- ~~Should we implement background notifications in MVP?~~ **RESOLVED:** Yes for Android, No for iOS (requires Apple Developer account)
- How to handle notification rate limiting? (Recommendation: Firebase/FCM handles this automatically)
- Should we batch rapid-fire notifications from the same conversation? (Recommendation: Defer to post-MVP)
- Should we create a custom notification icon for Android? (Must be white/transparent PNG)

---

## Known Limitations (MVP)

### Platform Differences

**Android: Full Support** ✅
- Notifications work in ALL states: foreground, background, and app completely closed
- No additional setup required beyond FCM configuration
- Works on emulators and physical devices

**iOS: Foreground Only** ⚠️
- Notifications only work when app is running (foreground or backgrounded)
- Won't work if app is force-closed or device is restarted
- **Why?** iOS background notifications require:
  - Apple Developer account ($99/year)
  - APNs certificate configuration
  - Physical device for testing (simulators don't support push)
  
**Post-MVP:** Add iOS background notifications once Apple Developer account is set up.

### Benefits of Cloud Functions Approach

✅ **Secure:** FCM tokens never exposed to client code  
✅ **Reliable:** Notifications sent even if sender's device loses connection  
✅ **Scalable:** Server-side execution handles load automatically  
✅ **Maintainable:** Notification logic centralized in one place  
✅ **iOS-Ready:** When APNs is configured, no Cloud Function changes needed

---

## Dependencies
- **Depends on:** PRD 01 (Project Setup) - FCM must be configured
- **Depends on:** PRD 03 (Core Messaging) - notifications triggered by messages
- **Depends on:** PRD 06.1 (Cloud Functions Setup) - Cloud Functions infrastructure required
- **Can develop in parallel with:** PRD 07 (Image Sharing)

---

## Resources
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK - FCM](https://firebase.google.com/docs/cloud-messaging/admin/send-messages)
- [Cloud Functions for Firebase](https://firebase.google.com/docs/functions)
- [Expo Push Notification Tool](https://expo.dev/notifications)

