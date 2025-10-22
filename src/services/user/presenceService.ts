/**
 * Presence Service for MessageAI
 * Manages user online/offline status with debouncing and background handling
 * Reduces Firestore writes by debouncing updates and using delayed offline transitions
 */

import { doc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * Module-level timer for delayed offline status
 * Used to prevent status flicker during quick app switches
 */
let presenceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Module-level timer for debouncing online status updates
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Simple debounce utility function
 * Delays function execution until after wait milliseconds have elapsed
 * since the last time it was invoked
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      debounceTimer = null;
      func(...args);
    };
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(later, wait);
  };
}

/**
 * Initialize presence for a user
 * Sets user as online immediately and configures disconnect handling
 * Should be called when user logs in
 * 
 * @param userId - ID of the user to initialize presence for
 * @returns Promise that resolves when initialization is complete
 */
export async function initialize(userId: string): Promise<void> {
  try {
    // Set user as online immediately (no debounce on init)
    await updatePresenceImmediate(userId, true);

    console.log(`[Presence] Initialized for user ${userId}`);
  } catch (error) {
    console.error('[Presence] Error initializing presence:', error);
    throw new Error('Failed to initialize presence');
  }
}

/**
 * Internal function to update presence immediately (without debounce)
 * Used for initialization and important state changes
 * 
 * @param userId - ID of the user
 * @param online - Whether user is online
 */
async function updatePresenceImmediate(
  userId: string,
  online: boolean
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const updateData = {
    online,
    lastSeen: Date.now(),
  };
  console.log(`[Presence] Updating Firestore for ${userId}:`, updateData);
  await updateDoc(userRef, updateData);
  console.log(`[Presence] Firestore updated successfully for ${userId}`);
}

/**
 * Set user as online with debouncing
 * Debounced by 300ms to reduce Firestore writes during active usage
 * 
 * @param userId - ID of the user to mark as online
 */
export const setOnline = debounce(async (userId: string) => {
  try {
    console.log(`[Presence] setOnline called for user ${userId}`);
    await updatePresenceImmediate(userId, true);
    console.log(`[Presence] User ${userId} set to online (Firestore updated)`);
  } catch (error) {
    console.error('[Presence] Error setting user online:', error);
  }
}, 300);

/**
 * Set user as offline after a delay
 * Default delay is 30 seconds to allow for quick app switches
 * Cancels any existing offline timer before setting a new one
 * 
 * @param userId - ID of the user to mark as offline
 * @param delayMs - Delay in milliseconds before marking offline (default: 30000ms)
 */
export function setOffline(
  userId: string,
  delayMs: number = 30000
): void {
  // Cancel any existing timer
  if (presenceTimer) {
    clearTimeout(presenceTimer);
    presenceTimer = null;
  }

  // Set new timer to mark offline after delay
  presenceTimer = setTimeout(async () => {
    try {
      await updatePresenceImmediate(userId, false);
      console.log(`[Presence] User ${userId} set to offline after ${delayMs}ms delay`);
    } catch (error) {
      console.error('[Presence] Error setting user offline:', error);
    }
  }, delayMs);
}

/**
 * Cancel the offline timer
 * Should be called when user returns to app before timer expires
 * Prevents premature offline status during quick app switches
 */
export function cancelOfflineTimer(): void {
  if (presenceTimer) {
    clearTimeout(presenceTimer);
    presenceTimer = null;
    console.log('[Presence] Offline timer cancelled');
  }
}

/**
 * Listen to presence updates for a specific user
 * Sets up real-time Firestore listener for online/lastSeen changes
 * 
 * @param userId - ID of the user to listen to
 * @param callback - Callback function called when presence changes
 * @returns Unsubscribe function to stop listening
 */
export function listenToPresence(
  userId: string,
  callback: (online: boolean, lastSeen: number) => void
): Unsubscribe {
  const userRef = doc(db, 'users', userId);
  
  return onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log(`[Presence] Received presence update for ${userId}:`, {
          online: data.online,
          lastSeen: data.lastSeen,
          lastSeenType: typeof data.lastSeen,
        });
        const online = data.online || false;
        const lastSeen = data.lastSeen || Date.now();
        console.log(`[Presence] Parsed values:`, { online, lastSeen });
        callback(online, lastSeen);
      }
    },
    (error) => {
      console.error(`[Presence] Error listening to presence for user ${userId}:`, error);
    }
  );
}

/**
 * Presence Service object
 * Provides methods for managing user presence status
 */
export const presenceService = {
  initialize,
  setOnline,
  setOffline,
  cancelOfflineTimer,
  listenToPresence,
};

