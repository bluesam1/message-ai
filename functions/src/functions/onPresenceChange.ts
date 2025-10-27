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

import * as functions from 'firebase-functions';
import { presenceService } from '../services/presenceService';

export const onPresenceChange = functions.database
  .instance('msg-ai-1-default-rtdb')
  .ref('/status/{uid}')
  .onWrite(async (change, context) => {
    const { uid } = context.params;
    
    // Get the data after the write
    const status = change.after.val();
    
    try {
      // Use presence service to mirror the presence
      await presenceService.mirrorPresence(uid, status);
      return null;
    } catch (error) {
      console.error(`[onPresenceChange] Error mirroring presence for user ${uid}:`, error);
      return null;
    }
  });
