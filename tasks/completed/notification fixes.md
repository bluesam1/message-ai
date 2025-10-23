**Feature PRD: Firebase Push Notifications for Expo Messaging App**

---

### **1. Overview**

Implement reliable push notifications using Firebase Cloud Messaging (FCM) in an Expo React Native messaging app. Notifications should behave appropriately depending on the app state (foreground, background, or quit), providing a real-time, user-friendly chat experience.

---

### **2. Goals**

* Deliver new message notifications to users even when the app is closed or backgrounded.
* Prevent duplicate or redundant notifications when the user is actively viewing a conversation.
* Enable in-app banners or sound cues while the app is open.
* Support deep linking into specific chat threads when a user taps a notification.

---

### **3. Non-Goals**

* No support for scheduled or recurring notifications.
* No group or topic notifications beyond per-thread collapsing.
* No server-side analytics dashboard (handled by Firebase console if needed).

---

### **4. User Experience**

#### **Foreground (App Open)**

* The user sees a lightweight in-app banner or chat bubble notification (optional).
* No OS-level toast appears by default.
* The chat UI updates immediately with the new message.

#### **Background / Quit State**

* The OS displays a system notification via FCM.
* When tapped, the app launches and navigates directly to the appropriate chat thread.
* If multiple messages arrive from the same thread, they collapse into a single notification per thread.

---

### **5. Functional Requirements**

#### **Client Behavior**

* Request notification permissions (iOS and Android 13+).
* Register with Firebase to obtain the FCM token.
* Use `expo-notifications` for receiving notifications.
* Define notification channels on Android for message importance and grouping.
* Handle different app states:

  * `Notifications.setNotificationHandler()` controls foreground behavior.
  * `Notifications.addNotificationReceivedListener()` updates UI in foreground.
  * `useLastNotificationResponse()` handles navigation when a notification is tapped.

#### **Server Behavior**

* Use Firebase Admin SDK to send notifications.
* Determine target payload type based on user state:

  * **Notification + Data payload** when the recipient is not in the thread.
  * **Data-only payload** when the recipient is currently viewing that thread.
* Include the following in all payloads:

  * `threadId`
  * `messageId`
  * `senderName`
  * Optional: message snippet or type (text, image, etc.)
* Collapse notifications per `threadId` using `collapse_key` (Android) and `apns-collapse-id` (iOS).
* Optionally include badge count updates for iOS.

---

### **6. Payload Examples**

**Notification + Data (Background/Inactive)**

```json
{
  "message": {
    "token": "<fcmtoken>",
    "notification": { "title": "Alex", "body": "Sent a photo" },
    "data": { "threadId": "t_123", "messageId": "m_999" },
    "android": {
      "notification": {
        "channel_id": "messages",
        "tag": "t_123",
        "notification_priority": "PRIORITY_HIGH"
      }
    },
    "apns": {
      "headers": { "apns-collapse-id": "t_123" },
      "payload": { "aps": { "badge": 12, "mutable-content": 1 } }
    }
  }
}
```

**Data-only (Foreground / Active Thread)**

```json
{
  "message": {
    "token": "<fcmtoken>",
    "data": { "type": "silent", "threadId": "t_123", "messageId": "m_1000" },
    "apns": { "payload": { "aps": { "content-available": 1 } } },
    "android": { "priority": "HIGH" }
  }
}
```

---

### **7. Technical Requirements**

* **Expo SDK:** 51+
* **Libraries:**

  * `expo-notifications`
  * `firebase/app`
  * `firebase/messaging`
* **Android:**

  * Create `messages` channel on startup.
  * Request `POST_NOTIFICATIONS` permission (Android 13+).
* **iOS:**

  * Enable *Remote Notifications* background mode.
  * Upload APNs key to Firebase.

---

### **8. Edge Cases / Considerations**

* Duplicate notifications if both Expo push service and FCM are used—disable Expo’s push if using FCM directly.
* FCM tokens may change; refresh tokens on app startup.
* On iOS, data-only messages won’t show if background mode is missing.
* Foreground messages may double-toast if `shouldShowAlert` is not configured correctly.

---

### **9. Success Metrics**

* 99% delivery success for notifications.
* <100ms average delay from message send to device receipt.
* 0 duplicate notification reports during QA testing.
* Verified deep-link routing accuracy for 100% of threads.

---

### **10. Future Enhancements**

* Add in-notification reply actions.
* Support group-level notification collapsing (multi-thread summary).
* Integrate read receipts with FCM message acknowledgments.
* Add analytics tracking for notification open events.

---
