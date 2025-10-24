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
import { networkService } from '../src/services/network/networkService';
import { syncPendingMessages } from '../src/services/messaging/syncService';
import { initDatabase } from '../src/services/sqlite/sqliteService';
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
    // Initialize SQLite database as early as possible
    initDatabase().catch((error) => {
      console.error('Failed to initialize database:', error);
    });

    // Initialize network monitoring service
    networkService.initialize();

    // Subscribe to network changes and trigger sync when reconnected
    const unsubscribe = networkService.subscribe((online) => {
      console.log('[App] Network state changed:', online ? 'ONLINE' : 'OFFLINE');
      if (online) {
        console.log('[App] Triggering sync on reconnection...');
        // Trigger sync when coming back online
        syncPendingMessages().catch((error) => {
          console.error('[App] Failed to sync on reconnection:', error);
        });
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      networkService.cleanup();
    };
  }, []);

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}


