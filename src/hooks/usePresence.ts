/**
 * usePresence Hook
 * Listens to real-time presence updates for a specific user from Firestore
 * Returns online status and lastSeen timestamp
 * 
 * Note: This reads from Firestore (not RTDB directly) for UI compatibility.
 * RTDB presence service mirrors data to Firestore in real-time.
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

interface PresenceState {
  online: boolean;
  lastSeen: number;
  loading: boolean;
}

/**
 * Safely convert Firestore Timestamp to milliseconds
 */
function toMillis(value: any): number {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return Date.now();
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

    // Listen to Firestore user document for presence data
    // (RTDB mirrors presence data here automatically)
    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          
          // Debug: Log raw data from Firestore
          console.log('[usePresence] Raw Firestore data for user', userId, ':', {
            online: data.online,
            lastSeen: data.lastSeen,
            lastSeenType: typeof data.lastSeen,
          });
          
          const online = data.online || false;
          const lastSeen = toMillis(data.lastSeen);
          
          console.log('[usePresence] Setting presence:', { online, lastSeen });
          setPresence({ online, lastSeen, loading: false });
        } else {
          console.log('[usePresence] User document does not exist for:', userId);
          setPresence({ online: false, lastSeen: Date.now(), loading: false });
        }
      },
      (error) => {
        console.error('[usePresence] Error listening to presence:', error);
        setPresence({ online: false, lastSeen: Date.now(), loading: false });
      }
    );

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, [userId]);

  return presence;
}

