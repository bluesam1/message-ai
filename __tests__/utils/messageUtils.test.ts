/**
 * Tests for messageUtils
 * Tests ID generation, time formatting, and helper functions
 */

import {
  generateMessageId,
  getRelativeTime,
  formatTimestamp,
  getDateHeader,
  shouldGroupMessages,
  sortMessagesByTimestamp,
  deduplicateMessages,
} from '../../src/utils/messageUtils';

describe('generateMessageId', () => {
  it('should generate a message ID with correct format', () => {
    const messageId = generateMessageId();
    expect(messageId).toMatch(/^msg_\d+_[a-z0-9]+$/);
  });

  it('should generate unique IDs', () => {
    const id1 = generateMessageId();
    const id2 = generateMessageId();
    expect(id1).not.toBe(id2);
  });

  it('should include timestamp in the ID', () => {
    const messageId = generateMessageId();
    const parts = messageId.split('_');
    expect(parts[0]).toBe('msg');
    expect(parseInt(parts[1], 10)).toBeGreaterThan(0);
  });

  it('should generate IDs with sufficient randomness', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateMessageId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('getRelativeTime', () => {
  it('should return "Just now" for recent messages (< 1 minute)', () => {
    const now = Date.now();
    expect(getRelativeTime(now)).toBe('Just now');
    expect(getRelativeTime(now - 30000)).toBe('Just now'); // 30 seconds ago
  });

  it('should return minutes for messages < 1 hour', () => {
    const now = Date.now();
    expect(getRelativeTime(now - 60000)).toBe('1m ago'); // 1 minute ago
    expect(getRelativeTime(now - 300000)).toBe('5m ago'); // 5 minutes ago
    expect(getRelativeTime(now - 3540000)).toBe('59m ago'); // 59 minutes ago
  });

  it('should return hours for messages < 24 hours', () => {
    const now = Date.now();
    expect(getRelativeTime(now - 3600000)).toBe('1h ago'); // 1 hour ago
    expect(getRelativeTime(now - 7200000)).toBe('2h ago'); // 2 hours ago
    expect(getRelativeTime(now - 86340000)).toBe('23h ago'); // 23 hours ago
  });

  it('should return days for messages < 7 days', () => {
    const now = Date.now();
    expect(getRelativeTime(now - 86400000)).toBe('1d ago'); // 1 day ago
    expect(getRelativeTime(now - 172800000)).toBe('2d ago'); // 2 days ago
    expect(getRelativeTime(now - 518400000)).toBe('6d ago'); // 6 days ago
  });

  it('should return formatted date for messages > 7 days', () => {
    const now = Date.now();
    const oldTimestamp = now - 604800000; // 7 days ago
    const result = getRelativeTime(oldTimestamp);
    // Should not contain "ago"
    expect(result).not.toContain('ago');
  });
});

describe('formatTimestamp', () => {
  it('should format date without time by default', () => {
    const timestamp = new Date('2023-10-31T14:30:00').getTime();
    const result = formatTimestamp(timestamp);
    expect(result).toBe('10/31/2023');
  });

  it('should include time when requested', () => {
    const timestamp = new Date('2023-10-31T14:30:00').getTime();
    const result = formatTimestamp(timestamp, true);
    expect(result).toContain('10/31/2023');
    expect(result).toContain('2:30');
    expect(result).toContain('PM');
  });
});

describe('getDateHeader', () => {
  it('should return "Today" for today\'s messages', () => {
    const now = Date.now();
    expect(getDateHeader(now)).toBe('Today');
  });

  it('should return "Yesterday" for yesterday\'s messages', () => {
    const yesterday = Date.now() - 86400000;
    expect(getDateHeader(yesterday)).toBe('Yesterday');
  });

  it('should return formatted date for older messages', () => {
    const twoDaysAgo = Date.now() - 172800000;
    const result = getDateHeader(twoDaysAgo);
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Yesterday');
  });
});

describe('shouldGroupMessages', () => {
  it('should group messages from same sender within 5 minutes', () => {
    const timestamp1 = Date.now();
    const timestamp2 = timestamp1 + 60000; // 1 minute later
    
    expect(shouldGroupMessages('user1', timestamp1, 'user1', timestamp2)).toBe(true);
  });

  it('should not group messages from different senders', () => {
    const timestamp1 = Date.now();
    const timestamp2 = timestamp1 + 60000;
    
    expect(shouldGroupMessages('user1', timestamp1, 'user2', timestamp2)).toBe(false);
  });

  it('should not group messages more than 5 minutes apart', () => {
    const timestamp1 = Date.now();
    const timestamp2 = timestamp1 + 360000; // 6 minutes later
    
    expect(shouldGroupMessages('user1', timestamp1, 'user1', timestamp2)).toBe(false);
  });

  it('should group messages exactly 5 minutes apart', () => {
    const timestamp1 = Date.now();
    const timestamp2 = timestamp1 + 299999; // Just under 5 minutes
    
    expect(shouldGroupMessages('user1', timestamp1, 'user1', timestamp2)).toBe(true);
  });
});

describe('sortMessagesByTimestamp', () => {
  it('should sort messages by timestamp in ascending order', () => {
    const messages = [
      { id: '3', timestamp: 3000 },
      { id: '1', timestamp: 1000 },
      { id: '2', timestamp: 2000 },
    ];

    const sorted = sortMessagesByTimestamp(messages);
    expect(sorted[0].id).toBe('1');
    expect(sorted[1].id).toBe('2');
    expect(sorted[2].id).toBe('3');
  });

  it('should not mutate the original array', () => {
    const messages = [
      { id: '2', timestamp: 2000 },
      { id: '1', timestamp: 1000 },
    ];

    const sorted = sortMessagesByTimestamp(messages);
    expect(messages[0].id).toBe('2'); // Original unchanged
    expect(sorted[0].id).toBe('1'); // Sorted
  });

  it('should handle empty array', () => {
    const result = sortMessagesByTimestamp([]);
    expect(result).toEqual([]);
  });
});

describe('deduplicateMessages', () => {
  it('should remove duplicate messages by ID', () => {
    const messages = [
      { id: 'msg1', text: 'Hello' },
      { id: 'msg2', text: 'World' },
      { id: 'msg1', text: 'Hello again' }, // Duplicate
    ];

    const result = deduplicateMessages(messages);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('msg1');
    expect(result[1].id).toBe('msg2');
  });

  it('should keep the first occurrence of duplicates', () => {
    const messages = [
      { id: 'msg1', text: 'First' },
      { id: 'msg1', text: 'Second' },
    ];

    const result = deduplicateMessages(messages);
    expect(result[0].text).toBe('First');
  });

  it('should handle empty array', () => {
    const result = deduplicateMessages([]);
    expect(result).toEqual([]);
  });

  it('should handle array with no duplicates', () => {
    const messages = [
      { id: 'msg1', text: 'Hello' },
      { id: 'msg2', text: 'World' },
    ];

    const result = deduplicateMessages(messages);
    expect(result.length).toBe(2);
  });
});

