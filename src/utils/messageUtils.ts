/**
 * Message utility functions for MessageAI
 * Includes ID generation, time formatting, and helper functions
 */

/**
 * Generates a unique message ID
 * Format: msg_timestamp_randomstring
 * 
 * @returns {string} Unique message ID (e.g., "msg_1234567890123_a5b2c8d")
 * 
 * @example
 * const messageId = generateMessageId();
 * // Returns: "msg_1698765432101_k3m9n2p"
 */
export function generateMessageId(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  return `msg_${timestamp}_${randomSuffix}`;
}

/**
 * Converts a timestamp to a relative time string
 * Returns human-readable relative time like "Just now", "5m ago", "2h ago", etc.
 * 
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Relative time string
 * 
 * @example
 * getRelativeTime(Date.now() - 30000); // Returns: "Just now"
 * getRelativeTime(Date.now() - 300000); // Returns: "5m ago"
 * getRelativeTime(Date.now() - 7200000); // Returns: "2h ago"
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  
  // Less than 1 minute
  if (diffMs < 60000) {
    return 'Just now';
  }
  
  // Less than 1 hour
  if (diffMs < 3600000) {
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than 24 hours
  if (diffMs < 86400000) {
    const hours = Math.floor(diffMs / 3600000);
    return `${hours}h ago`;
  }
  
  // Less than 7 days
  if (diffMs < 604800000) {
    const days = Math.floor(diffMs / 86400000);
    return `${days}d ago`;
  }
  
  // More than 7 days - return absolute date
  return formatTimestamp(timestamp);
}

/**
 * Formats a timestamp to an absolute date/time string
 * Returns formatted date for display
 * 
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {boolean} includeTime - Whether to include time (default: false)
 * @returns {string} Formatted date string
 * 
 * @example
 * formatTimestamp(1698765432101); // Returns: "10/31/2023"
 * formatTimestamp(1698765432101, true); // Returns: "10/31/2023 2:30 PM"
 */
export function formatTimestamp(timestamp: number, includeTime: boolean = false): string {
  const date = new Date(timestamp);
  
  if (includeTime) {
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a timestamp for message grouping in chat UI
 * Returns date header string like "Today", "Yesterday", or formatted date
 * 
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Date header string
 * 
 * @example
 * getDateHeader(Date.now()); // Returns: "Today"
 * getDateHeader(Date.now() - 86400000); // Returns: "Yesterday"
 */
export function getDateHeader(timestamp: number): string {
  const messageDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset time to midnight for comparison
  const messageDateMidnight = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayMidnight = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  
  if (messageDateMidnight.getTime() === todayMidnight.getTime()) {
    return 'Today';
  }
  
  if (messageDateMidnight.getTime() === yesterdayMidnight.getTime()) {
    return 'Yesterday';
  }
  
  // Return formatted date
  return messageDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Checks if two messages should be grouped together in the UI
 * Messages from the same sender within 5 minutes should be grouped
 * 
 * @param {string} senderId1 - First message sender ID
 * @param {number} timestamp1 - First message timestamp
 * @param {string} senderId2 - Second message sender ID
 * @param {number} timestamp2 - Second message timestamp
 * @returns {boolean} True if messages should be grouped
 */
export function shouldGroupMessages(
  senderId1: string,
  timestamp1: number,
  senderId2: string,
  timestamp2: number
): boolean {
  // Same sender
  if (senderId1 !== senderId2) {
    return false;
  }
  
  // Within 5 minutes
  const timeDiff = Math.abs(timestamp2 - timestamp1);
  return timeDiff < 300000; // 5 minutes in milliseconds
}

/**
 * Sorts messages by timestamp in ascending order (oldest first)
 * 
 * @param {Array} messages - Array of message objects
 * @returns {Array} Sorted array of messages
 */
export function sortMessagesByTimestamp<T extends { timestamp: number }>(messages: T[]): T[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Removes duplicate messages by ID
 * Keeps the first occurrence of each message
 * 
 * @param {Array} messages - Array of message objects
 * @returns {Array} Deduplicated array of messages
 */
export function deduplicateMessages<T extends { id: string }>(messages: T[]): T[] {
  const seen = new Set<string>();
  return messages.filter(message => {
    if (seen.has(message.id)) {
      return false;
    }
    seen.add(message.id);
    return true;
  });
}

