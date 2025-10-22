/**
 * Cloud Functions for MessageAI
 * 
 * Functions:
 * 1. onPresenceChange - Mirrors RTDB presence to Firestore
 * 2. (Future) sendPushNotification - Sends push notifications on new messages
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Mirror Presence from RTDB to Firestore
 * 
 * Listens to changes in /status/{uid} in Realtime Database
 * and mirrors the data to Firestore users/{uid} collection.
 * 
 * This ensures:
 * - Offline status is updated even when client crashes/disconnects
 * - Firestore queries can be used for user lists with presence
 * - UI components can read from Firestore (existing code works)
 * 
 * Triggered on: Any write to /status/{uid} in RTDB
 * 
 * IMPORTANT: Must specify the RTDB instance name for non-default databases
 */
export const onPresenceChange = functions.database
  .instance('msg-ai-1-default-rtdb')
  .ref('/status/{uid}')
  .onWrite(async (change, context) => {
    const { uid } = context.params;
    
    // Get the data after the write
    const status = change.after.val();
    
    // Debug: Log the raw status data
    console.log(`[Cloud Function] Raw status data for user ${uid}:`, JSON.stringify(status));
    
    // If status was deleted, set user offline
    if (!status) {
      console.log(`[Cloud Function] Status deleted for user ${uid}, setting offline`);
      await admin.firestore().doc(`users/${uid}`).update({
        online: false,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });
      return null;
    }
    
    // Mirror RTDB presence to Firestore
    const online = status.state === 'online';
    
    // Handle RTDB serverTimestamp properly
    // When RTDB writes serverTimestamp(), it's stored as a number (milliseconds since epoch)
    // The Firebase JS SDK's serverTimestamp() creates {".sv": "timestamp"} which RTDB resolves server-side
    let lastSeen: number;
    
    console.log(`[Cloud Function] lastSeenAt type: ${typeof status.lastSeenAt}, value:`, status.lastSeenAt);
    
    if (typeof status.lastSeenAt === 'number') {
      // Already resolved to a timestamp (normal case)
      lastSeen = status.lastSeenAt;
      console.log(`[Cloud Function] Using RTDB timestamp: ${lastSeen}`);
    } else if (status.lastSeenAt && typeof status.lastSeenAt === 'object') {
      // Still a server value object (shouldn't happen, but handle it)
      console.warn(`[Cloud Function] lastSeenAt is still an object for user ${uid}:`, status.lastSeenAt);
      lastSeen = Date.now();
    } else {
      // Fallback: use current server time
      console.warn(`[Cloud Function] lastSeenAt is missing/invalid for user ${uid}`);
      lastSeen = Date.now();
    }
    
    console.log(`[Cloud Function] Mirroring presence for user ${uid}: ${online ? 'online' : 'offline'}, lastSeen: ${lastSeen}`);
    
    try {
      // Use Firestore FieldValue.serverTimestamp() for consistency
      // This ensures Firestore always stores it as a proper Timestamp
      await admin.firestore().doc(`users/${uid}`).update({
        online,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`[Cloud Function] Successfully updated Firestore for user ${uid} with server timestamp`);
    } catch (error) {
      console.error(`[Cloud Function] Error updating Firestore for user ${uid}:`, error);
      
      // If document doesn't exist, we can't update it
      // This is OK - the document might not be created yet
      if ((error as any).code === 5) {
        console.log(`[Cloud Function] User document doesn't exist yet for ${uid}, skipping`);
      } else {
        throw error;
      }
    }
    
    return null;
  });

/**
 * Future: Send Push Notifications on New Messages
 * 
 * This will be implemented in PRD 08 - Push Notifications
 * 
 * Will listen to new messages in Firestore and send FCM notifications
 * to recipients who aren't currently viewing the conversation.
 */
// export const sendPushNotification = functions.firestore
//   .document('messages/{messageId}')
//   .onCreate(async (snap, context) => {
//     // Implementation coming in PRD 08
//   });

