/**
 * usePresenceUpdates Hook
 * Manages user presence status based on app state (active/background/inactive)
 * Automatically updates presence when app state changes
 */

import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { presenceService } from '../services/user/presenceService';

/**
 * Hook to manage presence updates based on app state
 * Should be called once at the app root level or in main navigation
 * 
 * @param userId - ID of the current user
 */
export function usePresenceUpdates(userId: string | null | undefined): void {
  useEffect(() => {
    // Don't set up listeners if no userId
    if (!userId) {
      console.log('[usePresenceUpdates] No userId provided, skipping presence setup');
      return;
    }

    console.log('[usePresenceUpdates] Setting up presence for user:', userId);

    // Initialize presence immediately when hook mounts
    presenceService.initialize(userId);

    // Set up app state listener
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        console.log('[usePresenceUpdates] App state changed to:', nextAppState);
        if (nextAppState === 'active') {
          // App came to foreground - set online immediately and cancel offline timer
          presenceService.cancelOfflineTimer();
          presenceService.setOnline(userId);
          console.log('[usePresenceUpdates] App active - setting user online');
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
          // App went to background - set offline after 30s delay
          presenceService.setOffline(userId, 30000);
          console.log('[usePresenceUpdates] App background/inactive - will set offline in 30s');
        }
      }
    );

    // Cleanup on unmount
    return () => {
      console.log('[usePresenceUpdates] Cleaning up presence for user:', userId);
      subscription.remove();
      
      // Don't immediately mark offline on unmount - this could just be a screen navigation
      // The offline timer from setOffline(30000) will handle it if the app is truly closed
      console.log('[usePresenceUpdates] Skipping immediate offline on cleanup (let timer handle it)');
    };
  }, [userId]);
}

