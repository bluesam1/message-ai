# PRD 08: Push Notifications (Foreground)

## Overview
Implement foreground push notifications using Expo Notifications and Firebase Cloud Messaging (FCM) to alert users of new messages when they have the app open. This provides immediate awareness of incoming messages without requiring background notification complexity.

**Timeline:** Hours 21-22 of 24-hour MVP development  
**Priority:** CRITICAL (Core requirement)

---

## Goals
1. Set up Expo Notifications with FCM
2. Request notification permissions from users
3. Generate and store FCM tokens per device
4. Display notifications when app is in foreground
5. Handle notification taps to navigate to conversation
6. Keep implementation simple (foreground only for MVP)

---

## User Stories
- **US-016:** As a user, I want to receive push notifications so I'm alerted to new messages even when using other apps
- **US-NOTIF-001:** As a user, I want notifications to show while the app is open so I see messages in other conversations
- **US-NOTIF-002:** As a user, I want to tap a notification to open the conversation so I can respond quickly
- **US-NOTIF-003:** As a user, I want control over notification permissions so I can disable them if needed

---

## Functional Requirements

### Notification Setup

1. Install and configure `expo-notifications`:
   - Set up notification channel for Android
   - Configure notification icon and sound
   - Set notification priority to HIGH

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
         "androidCollapsedTitle": "New messages"
       },
       "android": {
         "googleServicesFile": "./google-services.json"
       },
       "ios": {
         "googleServicesFile": "./GoogleService-Info.plist"
       }
     }
   }
   ```

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

### Foreground Notifications

10. Configure foreground notification behavior:
    ```typescript
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    ```

11. Display notification when new message received:
    - Title: Sender's display name or group name
    - Body: Message text (truncate to 100 chars)
    - Data: conversationId, messageId for navigation

12. Show notification only for messages in inactive conversations:
    - Don't notify if user is already viewing that conversation
    - Track active conversation ID in app state
    - Skip notification if conversationId matches active

### Notification Tapping

13. Handle notification tap:
    - Extract conversationId from notification data
    - Navigate to chat screen with that conversation
    - Mark messages as read

14. Deep linking:
    - Support opening specific conversation from notification
    - Handle app in foreground vs background states

### Sending Notifications (Client-Side Trigger)

15. When user sends message, trigger notification for recipients:
    - This is a limitation for MVP (ideally use Cloud Functions)
    - Query recipient's FCM tokens from Firestore
    - Send notification using Expo's push notification API

16. For MVP, use simple client-side notification sending:
    ```typescript
    const message = {
      to: recipientFcmToken,
      sound: 'default',
      title: senderName,
      body: messageText,
      data: { conversationId, messageId },
    };
    
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    ```

### Notification Customization

17. Format notification content:
    - One-on-one: "[Sender Name]: [Message]"
    - Group: "[Group Name] - [Sender]: [Message]"
    - Image: "[Sender] sent an image"

18. Handle special cases:
    - Don't send notification for own messages
    - Don't notify muted conversations (if implementing mute)
    - Batch notifications (if multiple rapid messages)

---

## Non-Goals (Out of Scope)
- ❌ Background notifications (app not running)
- ❌ Silent notifications for data sync
- ❌ Notification actions (reply, mark read directly from notification)
- ❌ Rich notifications (images, buttons)
- ❌ Cloud Functions for server-side notification sending (ideal but time-consuming)
- ❌ Notification history/inbox
- ❌ Per-conversation notification settings
- ❌ Do Not Disturb schedules

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
  
  sendNotification: async (
    recipientToken: string,
    title: string,
    body: string,
    data: any
  ) => {
    const message = {
      to: recipientToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
    };
    
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  },
  
  scheduleNotification: async (title: string, body: string, data: any) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Show immediately
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

### Send Message with Notification
```typescript
// Update messageService.ts
export const messageService = {
  sendMessage: async (message: Message, conversationId: string) => {
    // 1. Send message to Firestore
    await setDoc(doc(db, 'messages', message.id), message);
    
    // 2. Get conversation participants
    const conversation = await getDoc(doc(db, 'conversations', conversationId));
    const participants = conversation.data()?.participants || [];
    
    // 3. Get recipient FCM tokens (exclude sender)
    const recipientIds = participants.filter((id: string) => id !== message.senderId);
    
    for (const recipientId of recipientIds) {
      const userDoc = await getDoc(doc(db, 'users', recipientId));
      const fcmTokens = userDoc.data()?.fcmTokens || [];
      
      // 4. Send notification to each device
      const notificationTitle = conversation.data()?.type === 'group'
        ? `${conversation.data()?.groupName} - ${message.senderName}`
        : message.senderName;
      
      const notificationBody = message.imageUrl
        ? '📷 Sent an image'
        : message.text;
      
      for (const token of fcmTokens) {
        try {
          await notificationService.sendNotification(
            token,
            notificationTitle,
            notificationBody,
            { conversationId, messageId: message.id }
          );
        } catch (error) {
          console.error('Failed to send notification:', error);
          // Remove invalid token
          await removeInvalidToken(recipientId, token);
        }
      }
    }
  },
};
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
- [ ] expo-notifications installed and configured
- [ ] FCM configuration files added (google-services.json, GoogleService-Info.plist)
- [ ] app.json updated with notification settings
- [ ] Permission request shown on first app launch
- [ ] FCM token generated successfully
- [ ] Token stored in Firestore user document
- [ ] Multiple device tokens supported (array)
- [ ] Notification handler configured for foreground
- [ ] New message triggers notification
- [ ] Notification displays sender name and message preview
- [ ] Group notifications show group name + sender
- [ ] Image messages show "Sent an image" text
- [ ] Notification does NOT show for active conversation
- [ ] Tapping notification opens conversation
- [ ] Deep linking works correctly
- [ ] Invalid tokens removed after failed sends
- [ ] Notifications work on Android device
- [ ] Notifications work on iOS device
- [ ] Sound plays with notification
- [ ] No crashes related to notifications

---

## Testing Requirements

### Manual Testing (No unit tests needed for notifications)
- [ ] Fresh install - verify permission request shown
- [ ] Grant permission - verify token generated
- [ ] Deny permission - verify app still works
- [ ] Send message from another device - verify notification appears
- [ ] Tap notification - verify navigates to conversation
- [ ] Send message while viewing conversation - verify NO notification
- [ ] Send message in group - verify notification format correct
- [ ] Send image - verify notification says "Sent an image"
- [ ] Test on Android with app in foreground
- [ ] Test on Android with app in background (optional for MVP)
- [ ] Test on iOS with app in foreground
- [ ] Test on iOS with app in background (optional for MVP)
- [ ] Test with multiple devices (same user) - verify all receive notification
- [ ] Force network error - verify graceful handling

---

## Open Questions
- Should we implement background notifications in MVP? (Recommendation: Defer unless time permits - adds significant complexity)
- Should we use Cloud Functions instead of client-side sending? (Recommendation: Yes for production, but skip for 24-hour MVP)
- How to handle notification rate limiting? (Recommendation: Expo handles this, don't worry for MVP)

---

## Known Limitations (MVP)
⚠️ **Client-Side Notification Sending:** In production, you should use Firebase Cloud Functions to send notifications server-side. For this MVP, we're sending directly from the client to save time, which has limitations:
- Recipient must have app open to receive (Firestore listener must be active)
- Less secure (FCM tokens exposed to clients)
- No retry logic if send fails

**Post-MVP Migration:** Move to Cloud Functions triggered by Firestore `onCreate` for messages.

---

## Dependencies
- **Depends on:** PRD 01 (Project Setup) - FCM must be configured
- **Depends on:** PRD 03 (Core Messaging) - notifications triggered by messages
- **Can develop in parallel with:** PRD 06, PRD 07

---

## Resources
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Expo Push Notification Tool](https://expo.dev/notifications)

