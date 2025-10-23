import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from '../../config/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export interface NotificationService {
  initialize(): Promise<void>;
  getToken(): Promise<string | null>;
  saveExpoPushToken(token: string, userId: string): Promise<void>;
  removeExpoPushToken(token: string, userId: string): Promise<void>;
}

class NotificationServiceImpl implements NotificationService {
  private expoPushToken: string | null = null;

  async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted. Notifications will not work.');
        return;
      }

      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await this.setNotificationChannelAsync();
      }

      // Get Expo push token
      const token = await this.getToken();
      if (token) {
        this.expoPushToken = token;
      }

      // Set up token refresh listener
      this.setupTokenRefreshListener();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  async getToken(): Promise<string | null> {
    try {
      // Use Expo push tokens with your project ID
      // Project ID is read from app.json extra.eas.projectId
      const token = await Notifications.getExpoPushTokenAsync();
      console.log('[NotificationService] Got Expo push token:', token.data.substring(0, 30) + '...');
      return token.data;
    } catch (error) {
      console.error('[NotificationService] Failed to get Expo push token:', error);
      console.error('[NotificationService] Error details:', error);
      return null;
    }
  }

  async saveExpoPushToken(token: string, userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        expoPushTokens: arrayUnion(token)
      });
      console.log('[NotificationService] Expo push token saved to Firestore');
    } catch (error) {
      console.error('[NotificationService] Failed to save Expo push token:', error);
      throw error;
    }
  }

  async removeExpoPushToken(token: string, userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        expoPushTokens: arrayRemove(token)
      });
      console.log('[NotificationService] Expo push token removed from Firestore');
    } catch (error) {
      console.error('[NotificationService] Failed to remove Expo push token:', error);
      throw error;
    }
  }

  private async setNotificationChannelAsync(): Promise<void> {
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      enableBadge: true,
    });
  }

  private setupTokenRefreshListener(): void {
    Notifications.addPushTokenListener((token) => {
      console.log('[NotificationService] Expo push token refreshed:', token.data);
      this.expoPushToken = token.data;
    });
  }
}

export const notificationService = new NotificationServiceImpl();
