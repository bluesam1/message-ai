/**
 * Unit Tests for Read Receipt Service
 * Tests marking messages as read and querying unread messages
 */

import { markMessagesAsRead, getUnreadMessageIds } from '../../src/services/messaging/readReceiptService';

// Mock Firebase
jest.mock('../../src/config/firebase', () => ({
  db: {},
}));

// Mock SQLite service
jest.mock('../../src/services/sqlite/sqliteService', () => ({
  sqliteService: {
    markMessagesAsRead: jest.fn(),
  },
}));

// Mock Firestore functions
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();
const mockGetDocs = jest.fn();

jest.mock('firebase/firestore', () => ({
  writeBatch: jest.fn(() => ({
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
  doc: jest.fn((db, collection, id) => ({ id, collection })),
  arrayUnion: jest.fn((userId) => ({ _type: 'arrayUnion', value: userId })),
  query: jest.fn((...args) => args),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  collection: jest.fn((db, name) => ({ name })),
  getDocs: mockGetDocs,
}));

import { sqliteService } from '../../src/services/sqlite/sqliteService';

describe('readReceiptService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markMessagesAsRead', () => {
    it('should mark multiple messages as read using batch write', async () => {
      const messageIds = ['msg1', 'msg2', 'msg3'];
      const userId = 'user123';

      await markMessagesAsRead(messageIds, userId);

      // Verify batch update was called for each message
      expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('should update SQLite after Firestore update', async () => {
      const messageIds = ['msg1', 'msg2'];
      const userId = 'user456';

      await markMessagesAsRead(messageIds, userId);

      expect(sqliteService.markMessagesAsRead).toHaveBeenCalledWith(messageIds, userId);
    });

    it('should handle empty message array', async () => {
      const messageIds: string[] = [];
      const userId = 'user123';

      await markMessagesAsRead(messageIds, userId);

      // Should not call batch operations for empty array
      expect(mockBatchUpdate).not.toHaveBeenCalled();
      expect(mockBatchCommit).not.toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      const messageIds = ['msg1'];
      const userId = 'user123';

      mockBatchCommit.mockRejectedValueOnce(new Error('Firestore error'));

      await expect(markMessagesAsRead(messageIds, userId)).rejects.toThrow('Failed to mark messages as read');
    });
  });

  describe('getUnreadMessageIds', () => {
    it.skip('should return unread message IDs for a user', async () => {
      const conversationId = 'conv123';
      const userId = 'user456';

      const mockDocs = [
        { id: () => 'msg1', data: () => ({ senderId: 'user789', readBy: ['user789'] }) },
        { id: () => 'msg2', data: () => ({ senderId: 'user789', readBy: ['user789'] }) },
        { id: () => 'msg3', data: () => ({ senderId: 'user456', readBy: ['user456'] }) }, // Own message
      ];

      mockGetDocs.mockResolvedValueOnce({
        docs: mockDocs.map(doc => ({
          id: doc.id(),
          data: doc.data,
        })),
      });

      const result = await getUnreadMessageIds(conversationId, userId);

      expect(result).toEqual(['msg1', 'msg2']);
    });

    it.skip('should exclude messages sent by the user', async () => {
      const conversationId = 'conv123';
      const userId = 'user456';

      const mockDocs = [
        { id: () => 'msg1', data: () => ({ senderId: 'user456', readBy: ['user456'] }) },
        { id: () => 'msg2', data: () => ({ senderId: 'user789', readBy: [] }) },
      ];

      mockGetDocs.mockResolvedValueOnce({
        docs: mockDocs.map(doc => ({
          id: doc.id(),
          data: doc.data,
        })),
      });

      const result = await getUnreadMessageIds(conversationId, userId);

      expect(result).toEqual(['msg2']);
    });

    it.skip('should exclude messages already read by the user', async () => {
      const conversationId = 'conv123';
      const userId = 'user456';

      const mockDocs = [
        { id: () => 'msg1', data: () => ({ senderId: 'user789', readBy: ['user789', 'user456'] }) },
        { id: () => 'msg2', data: () => ({ senderId: 'user789', readBy: ['user789'] }) },
      ];

      mockGetDocs.mockResolvedValueOnce({
        docs: mockDocs.map(doc => ({
          id: doc.id(),
          data: doc.data,
        })),
      });

      const result = await getUnreadMessageIds(conversationId, userId);

      expect(result).toEqual(['msg2']);
    });

    it.skip('should return empty array when all messages are read', async () => {
      const conversationId = 'conv123';
      const userId = 'user456';

      const mockDocs = [
        { id: () => 'msg1', data: () => ({ senderId: 'user789', readBy: ['user789', 'user456'] }) },
        { id: () => 'msg2', data: () => ({ senderId: 'user789', readBy: ['user789', 'user456'] }) },
      ];

      mockGetDocs.mockResolvedValueOnce({
        docs: mockDocs.map(doc => ({
          id: doc.id(),
          data: doc.data,
        })),
      });

      const result = await getUnreadMessageIds(conversationId, userId);

      expect(result).toEqual([]);
    });

    it('should handle errors and throw', async () => {
      const conversationId = 'conv123';
      const userId = 'user456';

      mockGetDocs.mockRejectedValueOnce(new Error('Firestore error'));

      await expect(getUnreadMessageIds(conversationId, userId)).rejects.toThrow('Failed to get unread messages');
    });
  });
});

