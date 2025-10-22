/**
 * usePresence Hook
 * Listens to real-time presence updates for a specific user
 * Returns online status and lastSeen timestamp
 */

import { useState, useEffect } from 'react';
import { presenceService } from '../services/user/presenceService';

interface PresenceState {
  online: boolean;
  lastSeen: number;
  loading: boolean;
}

/**
 * Hook to listen to user presence status
 * 
 * @param userId - ID of the user to track presence for
 * @returns Object containing online status, lastSeen timestamp, and loading state
 */
export function usePresence(userId: string | null | undefined): PresenceState {
  const [presence, setPresence] = useState<PresenceState>({
    online: false,
    lastSeen: Date.now(),
    loading: true,
  });

  useEffect(() => {
    // Don't listen if no userId provided
    if (!userId) {
      setPresence({ online: false, lastSeen: Date.now(), loading: false });
      return;
    }

    // Set up real-time listener
    const unsubscribe = presenceService.listenToPresence(
      userId,
      (online, lastSeen) => {
        setPresence({ online, lastSeen, loading: false });
      }
    );

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, [userId]);

  return presence;
}

