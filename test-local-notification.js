/**
 * Local Notification Test Script
 * 
 * Tests foreground notification display without needing Cloud Functions
 * Run this in your app with: expo install expo-notifications
 * Then add a button to trigger this in your app
 */

import * as Notifications from 'expo-notifications';

/**
 * Send a test local notification
 * This simulates what a push notification from the server would look like
 */
export async function sendTestNotification() {
  try {
    // Request permissions first
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Please grant notification permissions first');
      return;
    }

    // Schedule a local notification immediately
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Message 📱',
        body: 'This is a test foreground notification',
        data: {
          conversationId: 'test-conversation-123',
          messageId: 'test-message-456',
          senderName: 'Test User',
          messageType: 'text',
          type: 'new_message',
        },
      },
      trigger: null, // null = immediately
    });

    console.log('Test notification sent!');
  } catch (error) {
    console.error('Failed to send test notification:', error);
  }
}

