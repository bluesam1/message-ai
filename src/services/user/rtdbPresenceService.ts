/**
 * Firebase Realtime Database Presence Service
 * 
 * Manages user online/offline status using RTDB's .info/connected and onDisconnect() handlers.
 * This provides reliable disconnect detection even when app crashes or loses connection.
 * 
 * Architecture:
 * 1. RTDB is source of truth for presence (reliable disconnect detection)
 * 2. Cloud Function mirrors RTDB → Firestore automatically (even when client is offline)
 * 3. Existing UI reads from Firestore (no component changes needed)
 * 
 * Key Features:
 * - Automatic online/offline detection via .info/connected
 * - Server-side disconnect handling via onDisconnect()
 * - Cloud Function mirroring ensures Firestore stays in sync
 * - Minimal writes (only on state changes)
 */

import { ref, onValue, set, onDisconnect, serverTimestamp, Unsubscribe } from 'firebase/database';
import { rtdb } from '../../config/firebase';

/**
 * Presence status interface
 */
interface PresenceStatus {
  state: 'online' | 'offline';
  lastSeenAt: number | object; // number for TypeScript, object for serverTimestamp()
}

/**
 * Module-level variable for cleanup
 */
let connectionListenerUnsubscribe: Unsubscribe | null = null;

/**
 * Initialize presence tracking for a user
 * 
 * Sets up:
 * 1. Connection monitoring (.info/connected listener)
 * 2. Automatic online/offline status updates
 * 3. onDisconnect handlers for crash/disconnect scenarios
 * 4. Cloud Function automatically mirrors RTDB → Firestore
 * 
 * @param userId - ID of the user to track presence for
 */
export function initialize(userId: string): void {
  try {
    console.log(`[RTDB Presence] Initializing presence for user ${userId}`);
    
    // Set up connection monitoring
    // Cloud Function will automatically mirror RTDB changes to Firestore
    setupConnectionMonitoring(userId);
    
    console.log(`[RTDB Presence] Initialization complete for user ${userId}`);
  } catch (error) {
    console.error('[RTDB Presence] Error initializing presence:', error);
    throw new Error('Failed to initialize presence tracking');
  }
}

/**
 * Set up connection monitoring using .info/connected
 * 
 * Firebase's .info/connected is a special path that reflects connection status.
 * When connected changes to true, we set online status and register disconnect handler.
 * 
 * @param userId - ID of the user
 */
function setupConnectionMonitoring(userId: string): void {
  // Get reference to Firebase's connection status indicator
  const connectedRef = ref(rtdb, '.info/connected');
  
  // Listen to connection status changes
  connectionListenerUnsubscribe = onValue(connectedRef, (snapshot) => {
    const connected = snapshot.val() as boolean;
    
    if (connected) {
      console.log(`[RTDB Presence] Connected - setting user ${userId} online`);
      // Handle async operation and catch errors
      setOnlineStatus(userId).catch((error) => {
        console.error('[RTDB Presence] Error setting online status:', error);
      });
    } else {
      console.log('[RTDB Presence] Disconnected from Firebase');
    }
  });
}

/**
 * Set user as online and register onDisconnect handler
 * 
 * This is called when Firebase connection is established.
 * It sets the user as online and registers a server-side handler
 * to automatically set them offline if connection is lost.
 * 
 * @param userId - ID of the user
 */
async function setOnlineStatus(userId: string): Promise<void> {
  try {
    const userStatusRef = ref(rtdb, `status/${userId}`);
    
    // Create online status object
    const onlineStatus: PresenceStatus = {
      state: 'online',
      lastSeenAt: serverTimestamp(),
    };
    
    // Set online status in RTDB
    await set(userStatusRef, onlineStatus);
    console.log(`[RTDB Presence] User ${userId} set to online`);
    
    // Register onDisconnect handler
    // This runs SERVER-SIDE when Firebase detects disconnect
    const offlineStatus: PresenceStatus = {
      state: 'offline',
      lastSeenAt: serverTimestamp(),
    };
    
    await onDisconnect(userStatusRef).set(offlineStatus);
    console.log(`[RTDB Presence] onDisconnect handler registered for ${userId}`);
  } catch (error) {
    console.error('[RTDB Presence] Error setting online status:', error);
    throw error;
  }
}

/**
 * Explicitly set user as offline
 * 
 * Should be called before cleanup() during normal logout.
 * For unexpected disconnects (crashes), onDisconnect() handles this automatically.
 * 
 * @param userId - ID of the user to set offline
 */
export async function setOffline(userId: string): Promise<void> {
  try {
    console.log(`[RTDB Presence] Explicitly setting user ${userId} offline`);
    
    const userStatusRef = ref(rtdb, `status/${userId}`);
    const offlineStatus: PresenceStatus = {
      state: 'offline',
      lastSeenAt: serverTimestamp(),
    };
    
    await set(userStatusRef, offlineStatus);
    console.log(`[RTDB Presence] User ${userId} set to offline`);
  } catch (error) {
    console.error('[RTDB Presence] Error setting offline status:', error);
    // Don't throw - this is a cleanup operation, shouldn't block logout
  }
}

/**
 * Clean up presence listeners
 * 
 * Should be called when user logs out or app unmounts.
 * Removes active listener to prevent memory leaks.
 * 
 * Note: Call setOffline() BEFORE cleanup() during normal logout
 * to ensure user is marked offline in RTDB.
 */
export function cleanup(): void {
  console.log('[RTDB Presence] Cleaning up listeners');
  
  if (connectionListenerUnsubscribe) {
    connectionListenerUnsubscribe();
    connectionListenerUnsubscribe = null;
  }
  
  console.log('[RTDB Presence] Cleanup complete');
}

/**
 * RTDB Presence Service
 * 
 * Export object with all public methods
 */
export const rtdbPresenceService = {
  initialize,
  setOffline,
  cleanup,
};


