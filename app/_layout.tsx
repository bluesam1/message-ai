/**
 * Root Layout
 * 
 * Handles authentication state and navigation
 * - Wraps app in AuthProvider
 * - Redirects to login if not authenticated
 * - Redirects to main app if authenticated
 */

import { useEffect } from 'react';
import { useRouter, useSegments, Slot } from 'expo-router';
import { LogBox } from 'react-native';
import { AuthProvider, useAuth } from '../src/store/AuthContext';

// Temporarily disable LogBox to see the actual app
LogBox.ignoreAllLogs(true);

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}


