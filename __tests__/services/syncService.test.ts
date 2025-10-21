/**
 * Tests for Sync Service
 * Tests sync process, retry logic, and failure handling
 */

import * as syncService from '../../src/services/messaging/syncService';
import { networkService } from '../../src/services/network/networkService';
import * as offlineQueueService from '../../src/services/messaging/offlineQueueService';
import * as sqliteService from '../../src/services/sqlite/sqliteService';
import { Message } from '../../src/types/message';

// Mock dependencies
jest.mock('../../src/services/network/networkService');
jest.mock('../../src/services/messaging/offlineQueueService');
jest.mock('../../src/services/sqlite/sqliteService');
jest.mock('../../src/config/firebase', () => ({
  db: {},
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

describe('SyncService', () => {
  const mockMessage: Message = {
    id: 'msg_123',
    conversationId: 'conv_1',
    senderId: 'user_1',
    text: 'Test message',
    imageUrl: null,
    timestamp: Date.now(),
    status: 'pending',
    readBy: [],
    createdAt: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    (networkService.isOnline as jest.Mock).mockReturnValue(true);
    (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([]);
    (offlineQueueService.removeFromQueue as jest.Mock).mockResolvedValue(undefined);
    (offlineQueueService.incrementRetryCount as jest.Mock).mockResolvedValue(undefined);
    (offlineQueueService.getRetryCount as jest.Mock).mockResolvedValue(0);
    (sqliteService.updateMessageStatus as jest.Mock).mockResolvedValue(undefined);
    
    // Mock Firestore
    (doc as jest.Mock).mockReturnValue({ id: 'mockDoc' });
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
  });

  describe('checkMessageExists', () => {
    it('should return true if message exists in Firestore', async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true });

      const exists = await syncService.checkMessageExists('msg_123');

      expect(exists).toBe(true);
      expect(getDoc).toHaveBeenCalled();
    });

    it('should return false if message does not exist', async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

      const exists = await syncService.checkMessageExists('msg_123');

      expect(exists).toBe(false);
    });

    it('should return false on error (to allow retry)', async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      const exists = await syncService.checkMessageExists('msg_123');

      expect(exists).toBe(false);
    });
  });

  describe('syncPendingMessages', () => {
    it('should not sync if already syncing', async () => {
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);

      // Start first sync
      const promise1 = syncService.syncPendingMessages();
      
      // Start second sync immediately
      const promise2 = syncService.syncPendingMessages();

      await Promise.all([promise1, promise2]);

      // getPendingMessages should only be called once
      expect(offlineQueueService.getPendingMessages).toHaveBeenCalledTimes(1);
    });

    it('should not sync if offline', async () => {
      (networkService.isOnline as jest.Mock).mockReturnValue(false);

      await syncService.syncPendingMessages();

      expect(offlineQueueService.getPendingMessages).not.toHaveBeenCalled();
    });

    it('should sync pending messages successfully', async () => {
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);

      await syncService.syncPendingMessages();

      expect(offlineQueueService.getPendingMessages).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled(); // Update conversation
      expect(sqliteService.updateMessageStatus).toHaveBeenCalledWith('msg_123', 'sent');
      expect(offlineQueueService.removeFromQueue).toHaveBeenCalledWith('msg_123');
    });

    it('should skip message if it already exists in Firestore', async () => {
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true });

      await syncService.syncPendingMessages();

      expect(setDoc).not.toHaveBeenCalled();
      expect(offlineQueueService.removeFromQueue).toHaveBeenCalledWith('msg_123');
    });

    it('should handle sync failure and increment retry count', async () => {
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);
      (offlineQueueService.getRetryCount as jest.Mock).mockResolvedValue(1);
      (setDoc as jest.Mock).mockRejectedValue(new Error('Sync failed'));

      await syncService.syncPendingMessages();

      expect(offlineQueueService.incrementRetryCount).toHaveBeenCalledWith('msg_123');
      expect(offlineQueueService.removeFromQueue).not.toHaveBeenCalled();
    });

    it('should mark message as failed after 3 retries', async () => {
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);
      (offlineQueueService.getRetryCount as jest.Mock).mockResolvedValue(3);
      (setDoc as jest.Mock).mockRejectedValue(new Error('Sync failed'));

      await syncService.syncPendingMessages();

      expect(sqliteService.updateMessageStatus).toHaveBeenCalledWith('msg_123', 'failed');
    });

    it('should stop syncing if connection lost during process', async () => {
      const messages = [mockMessage, { ...mockMessage, id: 'msg_456' }];
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue(messages);

      // Mock goes offline before second message check
      let isOnlineCallCount = 0;
      (networkService.isOnline as jest.Mock).mockImplementation(() => {
        isOnlineCallCount++;
        // First few calls for initial check and first message, then go offline
        return isOnlineCallCount <= 3;
      });

      await syncService.syncPendingMessages();

      // Should process at least one message, but stop when offline
      expect(offlineQueueService.removeFromQueue).toHaveBeenCalled();
    });

    it('should handle empty pending queue', async () => {
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([]);

      await syncService.syncPendingMessages();

      expect(setDoc).not.toHaveBeenCalled();
    });
  });

  describe('retryMessage', () => {
    it('should retry a failed message successfully', async () => {
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);

      const success = await syncService.retryMessage('msg_123');

      expect(success).toBe(true);
      expect(sqliteService.updateMessageStatus).toHaveBeenCalledWith('msg_123', 'pending');
      expect(setDoc).toHaveBeenCalled();
    });

    it('should not retry if offline', async () => {
      (networkService.isOnline as jest.Mock).mockReturnValue(false);

      const success = await syncService.retryMessage('msg_123');

      expect(success).toBe(false);
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('should return false if message not in queue', async () => {
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([]);

      const success = await syncService.retryMessage('nonexistent');

      expect(success).toBe(false);
    });

    it('should handle retry failure', async () => {
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);
      (setDoc as jest.Mock).mockRejectedValue(new Error('Retry failed'));

      const success = await syncService.retryMessage('msg_123');

      expect(success).toBe(false);
    });
  });

  describe('subscribeSyncProgress', () => {
    it('should call callback on sync progress', async () => {
      const mockCallback = jest.fn();
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);

      syncService.subscribeSyncProgress(mockCallback);
      await syncService.syncPendingMessages();

      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(1, 1, 'msg_123', 'syncing');
      expect(mockCallback).toHaveBeenCalledWith(1, 1, 'msg_123', 'success');
    });

    it('should allow unsubscribing from progress updates', async () => {
      const mockCallback = jest.fn();
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);

      const unsubscribe = syncService.subscribeSyncProgress(mockCallback);
      unsubscribe();

      await syncService.syncPendingMessages();

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', async () => {
      const mockCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);

      syncService.subscribeSyncProgress(mockCallback);

      // Should not throw
      await expect(syncService.syncPendingMessages()).resolves.not.toThrow();
    });
  });

  describe('isSyncInProgress', () => {
    it('should return false initially', () => {
      expect(syncService.isSyncInProgress()).toBe(false);
    });

    it('should return true during sync', async () => {
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);
      (setDoc as jest.Mock).mockImplementation(() => {
        // Check sync status during sync
        expect(syncService.isSyncInProgress()).toBe(true);
        return Promise.resolve();
      });

      await syncService.syncPendingMessages();
    });

    it('should return false after sync completes', async () => {
      (offlineQueueService.getPendingMessages as jest.Mock).mockResolvedValue([mockMessage]);

      await syncService.syncPendingMessages();

      expect(syncService.isSyncInProgress()).toBe(false);
    });
  });
});

