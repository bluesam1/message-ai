/**
 * Root Layout
 * 
 * Handles authentication state and navigation
 * - Wraps app in AuthProvider
 * - Redirects to login if not authenticated
 * - Redirects to main app if authenticated
 */

import { useEffect } from 'react';
import { useRouter, useSegments, Stack } from 'expo-router';
import { LogBox } from 'react-native';
import { AuthProvider, useAuth } from '../src/store/AuthContext';
import { useNotifications } from '../src/hooks/useNotifications';
import { LoadingScreen } from '../src/components/LoadingScreen';

// Temporarily disable LogBox to see the actual app
LogBox.ignoreAllLogs(true);

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Initialize notification handling
  useNotifications();

  useEffect(() => {
    if (loading) return; // Don't do anything while loading

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  // Show loading screen while determining authentication state
  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hide header by default, individual screens can override
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
      <Stack.Screen name="new-chat" options={{ headerShown: true, title: 'New Chat' }} />
      <Stack.Screen name="new-group" options={{ headerShown: true, title: 'New Group' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Firestore offline persistence is enabled in firebase.ts
    // No need for custom SQLite or network monitoring
    console.log('[App] Firestore offline persistence active');
  }, []);

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}


