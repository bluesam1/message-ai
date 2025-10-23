/**
 * Google Authentication Hook
 * 
 * Custom hook for Google OAuth flow using expo-auth-session
 * Must be used in a React component
 */

import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { authService } from '../services/firebase/authService';

/**
 * Hook to handle Google Sign-In
 * Returns request object and promptAsync function
 */
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '1006898666705-akm2l7gvjkcs0mp0if4ahjfsvol1js71.apps.googleusercontent.com',
    // Android client ID is required for React Native
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '1006898666705-akm2l7gvjkcs0mp0if4ahjfsvol1js71.apps.googleusercontent.com',
    // iOS client ID (using web client ID as fallback for now)
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '1006898666705-akm2l7gvjkcs0mp0if4ahjfsvol1js71.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      
      if (id_token) {
        // Sign in with Firebase using the Google ID token
        authService.signInWithGoogleCredential(id_token).catch((error) => {
          console.error('Failed to sign in with Google:', error);
        });
      }
    }
  }, [response]);

  return {
    request,
    response,
    promptAsync,
  };
};

