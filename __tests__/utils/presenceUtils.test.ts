/**
 * Unit Tests for Presence Utilities
 * Tests formatting and display logic for user presence status
 */

import {
  formatLastSeen,
  getPresenceColor,
  getPresenceText,
} from '../../src/utils/presenceUtils';

describe('presenceUtils', () => {
  describe('formatLastSeen', () => {
    it('should return "Just now" for < 1 minute ago', () => {
      const lastSeen = Date.now() - 30000; // 30 seconds ago
      expect(formatLastSeen(lastSeen)).toBe('Just now');
    });

    it('should return "Just now" for 0 seconds ago', () => {
      const lastSeen = Date.now();
      expect(formatLastSeen(lastSeen)).toBe('Just now');
    });

    it('should return minutes for < 1 hour ago', () => {
      const lastSeen = Date.now() - 300000; // 5 minutes ago
      expect(formatLastSeen(lastSeen)).toBe('Last seen 5m ago');
    });

    it('should return minutes for 59 minutes ago', () => {
      const lastSeen = Date.now() - 3540000; // 59 minutes ago
      expect(formatLastSeen(lastSeen)).toBe('Last seen 59m ago');
    });

    it('should return hours for < 24 hours ago', () => {
      const lastSeen = Date.now() - 7200000; // 2 hours ago
      expect(formatLastSeen(lastSeen)).toBe('Last seen 2h ago');
    });

    it('should return hours for 23 hours ago', () => {
      const lastSeen = Date.now() - 82800000; // 23 hours ago
      expect(formatLastSeen(lastSeen)).toBe('Last seen 23h ago');
    });

    it('should return "Last seen yesterday" for 1 day ago', () => {
      const lastSeen = Date.now() - 86400000; // 24 hours ago
      expect(formatLastSeen(lastSeen)).toBe('Last seen yesterday');
    });

    it('should return days for < 7 days ago', () => {
      const lastSeen = Date.now() - 172800000; // 2 days ago
      expect(formatLastSeen(lastSeen)).toBe('Last seen 2 days ago');
    });

    it('should return days for 6 days ago', () => {
      const lastSeen = Date.now() - 518400000; // 6 days ago
      expect(formatLastSeen(lastSeen)).toBe('Last seen 6 days ago');
    });

    it('should return formatted date for > 7 days ago', () => {
      const lastSeen = Date.now() - 604800000; // 7 days ago
      const result = formatLastSeen(lastSeen);
      expect(result).toMatch(/Last seen on/);
    });

    it('should return formatted date for 30 days ago', () => {
      const lastSeen = Date.now() - 2592000000; // 30 days ago
      const result = formatLastSeen(lastSeen);
      expect(result).toMatch(/Last seen on/);
    });
  });

  describe('getPresenceColor', () => {
    it('should return green color for online users', () => {
      expect(getPresenceColor(true)).toBe('#4CAF50');
    });

    it('should return gray color for offline users', () => {
      expect(getPresenceColor(false)).toBe('#9E9E9E');
    });
  });

  describe('getPresenceText', () => {
    it('should return "Online" for online users', () => {
      const lastSeen = Date.now();
      expect(getPresenceText(true, lastSeen)).toBe('Online');
    });

    it('should return "Online" for online users regardless of lastSeen time', () => {
      const lastSeen = Date.now() - 3600000; // 1 hour ago
      expect(getPresenceText(true, lastSeen)).toBe('Online');
    });

    it('should return formatted time for offline users', () => {
      const lastSeen = Date.now() - 300000; // 5 minutes ago
      expect(getPresenceText(false, lastSeen)).toBe('Last seen 5m ago');
    });

    it('should return "Just now" for recently offline users', () => {
      const lastSeen = Date.now() - 30000; // 30 seconds ago
      expect(getPresenceText(false, lastSeen)).toBe('Just now');
    });
  });
});

