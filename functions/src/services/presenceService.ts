import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

export interface PresenceStatus {
  state: 'online' | 'offline';
  lastSeenAt: number;
}

export interface FirestorePresence {
  online: boolean;
  lastSeen: admin.firestore.Timestamp;
}

/**
 * Presence Service for managing user presence
 */
export class PresenceService {
  private static instance: PresenceService;
  private db: FirebaseFirestore.Firestore;

  private constructor() {
    this.db = getFirestore();
  }

  public static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  /**
   * Mirror RTDB presence to Firestore
   */
  async mirrorPresence(uid: string, status: PresenceStatus | null): Promise<boolean> {
    try {
      console.log(`[PresenceService] Raw status data for user ${uid}: ${JSON.stringify(status)}`);
      
      // If status was deleted, set user offline
      if (!status) {
        console.log(`[PresenceService] Status deleted for user ${uid}, setting offline`);
        await this.setOffline(uid);
        return true;
      }
      
      // Mirror RTDB presence to Firestore
      const online = status.state === 'online';
      
      // Handle RTDB serverTimestamp properly
      // When RTDB writes serverTimestamp(), it's stored as a number (milliseconds since epoch)
      // The Firebase JS SDK's serverTimestamp() creates {".sv": "timestamp"} which RTDB resolves server-side
      let lastSeen: number;
      
      console.log(`[PresenceService] lastSeenAt type: ${typeof status.lastSeenAt}, value: ${status.lastSeenAt}`);
      
      if (typeof status.lastSeenAt === 'number') {
        // Already resolved to a timestamp (normal case)
        lastSeen = status.lastSeenAt;
        console.log(`[PresenceService] Using RTDB timestamp: ${lastSeen}`);
      } else if (status.lastSeenAt && typeof status.lastSeenAt === 'object') {
        // Still a server value object (shouldn't happen, but handle it)
        console.warn(`[PresenceService] lastSeenAt is still an object for user ${uid}:`, status.lastSeenAt);
        lastSeen = Date.now();
      } else {
        // Fallback: use current server time
        console.warn(`[PresenceService] lastSeenAt is missing/invalid for user ${uid}`);
        lastSeen = Date.now();
      }
      
      console.log(`[PresenceService] Mirroring presence for user ${uid}: ${online ? 'online' : 'offline'}, lastSeen: ${lastSeen}`);
      
      // Use Firestore FieldValue.serverTimestamp() for consistency
      // This ensures Firestore always stores it as a proper Timestamp
      await this.db.doc(`users/${uid}`).update({
        online,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`[PresenceService] Successfully updated Firestore for user ${uid} with server timestamp`);
      return true;
      
    } catch (error) {
      console.error(`[PresenceService] Error updating Firestore for user ${uid}:`, error);
      
      // If document doesn't exist, we can't update it
      // This is OK - the document might not be created yet
      if ((error as any).code === 5) {
        console.log(`[PresenceService] User document doesn't exist yet for ${uid}, skipping`);
        return true; // Not an error, just skip
      } else {
        throw error;
      }
    }
  }

  /**
   * Set user as offline
   */
  async setOffline(uid: string): Promise<boolean> {
    try {
      await this.db.doc(`users/${uid}`).update({
        online: false,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`[PresenceService] Set user ${uid} as offline`);
      return true;
    } catch (error) {
      console.error(`[PresenceService] Error setting user ${uid} offline:`, error);
      
      // If document doesn't exist, we can't update it
      if ((error as any).code === 5) {
        console.log(`[PresenceService] User document doesn't exist for ${uid}, skipping offline update`);
        return true; // Not an error, just skip
      } else {
        throw error;
      }
    }
  }

  /**
   * Set user as online
   */
  async setOnline(uid: string): Promise<boolean> {
    try {
      await this.db.doc(`users/${uid}`).update({
        online: true,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`[PresenceService] Set user ${uid} as online`);
      return true;
    } catch (error) {
      console.error(`[PresenceService] Error setting user ${uid} online:`, error);
      
      // If document doesn't exist, we can't update it
      if ((error as any).code === 5) {
        console.log(`[PresenceService] User document doesn't exist for ${uid}, skipping online update`);
        return true; // Not an error, just skip
      } else {
        throw error;
      }
    }
  }

  /**
   * Get user presence status
   */
  async getPresence(uid: string): Promise<FirestorePresence | null> {
    try {
      const userDoc = await this.db.doc(`users/${uid}`).get();
      
      if (!userDoc.exists) {
        return null;
      }
      
      const data = userDoc.data()!;
      return {
        online: data.online || false,
        lastSeen: data.lastSeen || admin.firestore.Timestamp.now()
      };
    } catch (error) {
      console.error(`[PresenceService] Error getting presence for user ${uid}:`, error);
      return null;
    }
  }

  /**
   * Get multiple users' presence status
   */
  async getMultiplePresence(uids: string[]): Promise<{ [uid: string]: FirestorePresence | null }> {
    const results: { [uid: string]: FirestorePresence | null } = {};
    
    try {
      const userDocs = await Promise.all(
        uids.map(uid => this.db.doc(`users/${uid}`).get())
      );
      
      userDocs.forEach((userDoc, index) => {
        const uid = uids[index];
        
        if (!userDoc.exists) {
          results[uid] = null;
          return;
        }
        
        const data = userDoc.data()!;
        results[uid] = {
          online: data.online || false,
          lastSeen: data.lastSeen || admin.firestore.Timestamp.now()
        };
      });
      
      return results;
    } catch (error) {
      console.error(`[PresenceService] Error getting multiple presence:`, error);
      
      // Return null for all users on error
      uids.forEach(uid => {
        results[uid] = null;
      });
      
      return results;
    }
  }

  /**
   * Update last seen timestamp
   */
  async updateLastSeen(uid: string): Promise<boolean> {
    try {
      await this.db.doc(`users/${uid}`).update({
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`[PresenceService] Updated last seen for user ${uid}`);
      return true;
    } catch (error) {
      console.error(`[PresenceService] Error updating last seen for user ${uid}:`, error);
      
      // If document doesn't exist, we can't update it
      if ((error as any).code === 5) {
        console.log(`[PresenceService] User document doesn't exist for ${uid}, skipping last seen update`);
        return true; // Not an error, just skip
      } else {
        throw error;
      }
    }
  }

  /**
   * Check if user is online
   */
  async isOnline(uid: string): Promise<boolean> {
    try {
      const presence = await this.getPresence(uid);
      return presence?.online || false;
    } catch (error) {
      console.error(`[PresenceService] Error checking if user ${uid} is online:`, error);
      return false;
    }
  }

  /**
   * Get online users from a list
   */
  async getOnlineUsers(uids: string[]): Promise<string[]> {
    try {
      const presenceMap = await this.getMultiplePresence(uids);
      return uids.filter(uid => presenceMap[uid]?.online === true);
    } catch (error) {
      console.error(`[PresenceService] Error getting online users:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const presenceService = PresenceService.getInstance();
