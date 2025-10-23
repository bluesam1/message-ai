import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export interface UseNotificationsProps {
  activeConversationId?: string;
}

export interface UseNotificationsReturn {
  // Hook doesn't return anything, it just sets up listeners
}

/**
 * Custom hook for handling push notifications
 * 
 * Features:
 * - Sets up notification handler for foreground display
 * - Listens for notification received events
 * - Handles notification tap navigation
 * - Filters out notifications for active conversation
 * 
 * @param activeConversationId - ID of currently viewed conversation (optional)
 * @returns void - Hook sets up listeners internally
 */
export const useNotifications = ({ activeConversationId }: UseNotificationsProps = {}): UseNotificationsReturn => {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Configure notification handler for foreground display
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[useNotifications] Notification received:', notification);
      
      // Check if this notification is for the currently active conversation
      const notificationConversationId = notification.request.content.data?.conversationId;
      
      if (activeConversationId && notificationConversationId === activeConversationId) {
        console.log('[useNotifications] Notification filtered out - user is viewing this conversation');
        return;
      }
      
      // For now, we just log the notification
      // The actual display is handled by the system
      console.log('[useNotifications] Notification will be displayed');
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[useNotifications] Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      const conversationId = data?.conversationId;
      const messageId = data?.messageId;
      const type = data?.type;
      
      if (type === 'new_message' && conversationId) {
        console.log('[useNotifications] Navigating to conversation:', conversationId);
        router.push(`/chat/${conversationId}`);
      } else {
        console.log('[useNotifications] Unknown notification type or missing conversationId');
      }
    });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [activeConversationId, router]);

  // Hook doesn't return anything - it just sets up listeners
  return {};
};
