/**
 * Tests for Message Deduplication Utilities
 * Tests deduplicateMessages and mergeMessageLists functions
 */

import {
  deduplicateMessages,
  mergeMessageLists,
  messageExists,
  getNewMessages,
  mergeNewMessages,
} from '../../src/utils/messageDeduplication';
import { Message } from '../../src/types/message';

describe('messageDeduplication', () => {
  const createMessage = (id: string, timestamp: number = Date.now(), status: any = 'sent'): Message => ({
    id,
    conversationId: 'conv_1',
    senderId: 'user_1',
    text: `Message ${id}`,
    imageUrl: null,
    timestamp,
    status,
    readBy: [],
    createdAt: timestamp,
  });

  describe('deduplicateMessages', () => {
    it('should remove duplicate message IDs', () => {
      const messages: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
        createMessage('1', 1000), // Duplicate
      ];

      const result = deduplicateMessages(messages);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should keep first occurrence of duplicate', () => {
      const messages: Message[] = [
        { ...createMessage('1', 1000), text: 'First' },
        { ...createMessage('1', 1000), text: 'Second' }, // Duplicate
      ];

      const result = deduplicateMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('First');
    });

    it('should handle empty array', () => {
      const result = deduplicateMessages([]);

      expect(result).toEqual([]);
    });

    it('should handle array with no duplicates', () => {
      const messages: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
        createMessage('3', 3000),
      ];

      const result = deduplicateMessages(messages);

      expect(result).toHaveLength(3);
      expect(result).toEqual(messages);
    });

    it('should handle multiple duplicates', () => {
      const messages: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
        createMessage('1', 1000), // Duplicate
        createMessage('3', 3000),
        createMessage('2', 2000), // Duplicate
        createMessage('1', 1000), // Duplicate
      ];

      const result = deduplicateMessages(messages);

      expect(result).toHaveLength(3);
      expect(result.map(m => m.id)).toEqual(['1', '2', '3']);
    });
  });

  describe('mergeMessageLists', () => {
    it('should prefer live messages over cached ones', () => {
      const cached: Message[] = [
        createMessage('1', 1000, 'pending'),
      ];
      const live: Message[] = [
        createMessage('1', 1000, 'sent'),
      ];

      const result = mergeMessageLists(cached, live);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('sent'); // Live status
    });

    it('should combine unique messages from both lists', () => {
      const cached: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];
      const live: Message[] = [
        createMessage('3', 3000),
        createMessage('4', 4000),
      ];

      const result = mergeMessageLists(cached, live);

      expect(result).toHaveLength(4);
      expect(result.map(m => m.id)).toEqual(['1', '2', '3', '4']);
    });

    it('should sort messages by timestamp (oldest first)', () => {
      const cached: Message[] = [
        createMessage('2', 2000),
        createMessage('4', 4000),
      ];
      const live: Message[] = [
        createMessage('1', 1000),
        createMessage('3', 3000),
      ];

      const result = mergeMessageLists(cached, live);

      expect(result.map(m => m.id)).toEqual(['1', '2', '3', '4']);
      expect(result[0].timestamp).toBeLessThan(result[1].timestamp);
      expect(result[1].timestamp).toBeLessThan(result[2].timestamp);
      expect(result[2].timestamp).toBeLessThan(result[3].timestamp);
    });

    it('should handle empty cached list', () => {
      const cached: Message[] = [];
      const live: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];

      const result = mergeMessageLists(cached, live);

      expect(result).toHaveLength(2);
      expect(result).toEqual(live.sort((a, b) => a.timestamp - b.timestamp));
    });

    it('should handle empty live list', () => {
      const cached: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];
      const live: Message[] = [];

      const result = mergeMessageLists(cached, live);

      expect(result).toHaveLength(2);
      expect(result).toEqual(cached.sort((a, b) => a.timestamp - b.timestamp));
    });

    it('should handle both empty lists', () => {
      const result = mergeMessageLists([], []);

      expect(result).toEqual([]);
    });

    it('should override cached message properties with live data', () => {
      const cached: Message[] = [
        { ...createMessage('1', 1000), text: 'Old text', status: 'pending' },
      ];
      const live: Message[] = [
        { ...createMessage('1', 1000), text: 'New text', status: 'sent' },
      ];

      const result = mergeMessageLists(cached, live);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('New text');
      expect(result[0].status).toBe('sent');
    });
  });

  describe('messageExists', () => {
    it('should return true if message exists in list', () => {
      const messages: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];

      const exists = messageExists(messages, '1');

      expect(exists).toBe(true);
    });

    it('should return false if message does not exist', () => {
      const messages: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];

      const exists = messageExists(messages, '3');

      expect(exists).toBe(false);
    });

    it('should handle empty list', () => {
      const exists = messageExists([], '1');

      expect(exists).toBe(false);
    });
  });

  describe('getNewMessages', () => {
    it('should return only new messages', () => {
      const existing: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];
      const newMessages: Message[] = [
        createMessage('2', 2000), // Already exists
        createMessage('3', 3000), // New
        createMessage('4', 4000), // New
      ];

      const result = getNewMessages(existing, newMessages);

      expect(result).toHaveLength(2);
      expect(result.map(m => m.id)).toEqual(['3', '4']);
    });

    it('should return all messages if none exist', () => {
      const existing: Message[] = [];
      const newMessages: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];

      const result = getNewMessages(existing, newMessages);

      expect(result).toEqual(newMessages);
    });

    it('should return empty array if all messages already exist', () => {
      const existing: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];
      const newMessages: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];

      const result = getNewMessages(existing, newMessages);

      expect(result).toEqual([]);
    });
  });

  describe('mergeNewMessages', () => {
    it('should merge and deduplicate messages', () => {
      const existing: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];
      const newMessages: Message[] = [
        createMessage('2', 2000), // Duplicate
        createMessage('3', 3000),
      ];

      const result = mergeNewMessages(existing, newMessages);

      expect(result).toHaveLength(3);
      expect(result.map(m => m.id)).toEqual(['1', '2', '3']);
    });

    it('should sort merged messages by timestamp', () => {
      const existing: Message[] = [
        createMessage('3', 3000),
        createMessage('1', 1000),
      ];
      const newMessages: Message[] = [
        createMessage('4', 4000),
        createMessage('2', 2000),
      ];

      const result = mergeNewMessages(existing, newMessages);

      expect(result.map(m => m.id)).toEqual(['1', '2', '3', '4']);
      expect(result[0].timestamp).toBeLessThan(result[1].timestamp);
    });

    it('should handle empty existing list', () => {
      const newMessages: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];

      const result = mergeNewMessages([], newMessages);

      expect(result).toEqual(newMessages.sort((a, b) => a.timestamp - b.timestamp));
    });

    it('should handle empty new messages', () => {
      const existing: Message[] = [
        createMessage('1', 1000),
        createMessage('2', 2000),
      ];

      const result = mergeNewMessages(existing, []);

      expect(result).toEqual(existing.sort((a, b) => a.timestamp - b.timestamp));
    });
  });
});

