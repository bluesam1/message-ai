/**
 * Presence Utilities for MessageAI
 * Helper functions for formatting and displaying user presence status
 */

/**
 * Format a timestamp into a human-readable "last seen" string
 * 
 * @param lastSeen - Timestamp in milliseconds
 * @returns Formatted string describing when the user was last seen
 * 
 * @example
 * formatLastSeen(Date.now() - 30000) // "Just now"
 * formatLastSeen(Date.now() - 300000) // "Last seen 5m ago"
 * formatLastSeen(Date.now() - 7200000) // "Last seen 2h ago"
 */
export function formatLastSeen(lastSeen: number): string {
  console.log('[presenceUtils] formatLastSeen called with:', { 
    lastSeen, 
    type: typeof lastSeen,
    isNaN: isNaN(lastSeen),
    truthyCheck: !lastSeen
  });
  
  // Validate lastSeen is a valid number
  if (!lastSeen || typeof lastSeen !== 'number' || isNaN(lastSeen)) {
    console.warn('[presenceUtils] Invalid lastSeen value:', lastSeen);
    return 'Last seen recently';
  }

  const now = Date.now();
  const diff = now - lastSeen;
  
  console.log('[presenceUtils] Time diff:', { now, lastSeen, diff, minutes: Math.floor(diff / 60000) });

  // Convert milliseconds to various time units
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  // Return appropriate format based on time difference
  if (minutes < 1) {
    console.log('[presenceUtils] Returning "Just now"');
    return 'Just now';
  }
  
  if (minutes < 60) {
    return `Last seen ${minutes}m ago`;
  }
  
  if (hours < 24) {
    return `Last seen ${hours}h ago`;
  }
  
  if (days === 1) {
    return 'Last seen yesterday';
  }
  
  if (days < 7) {
    return `Last seen ${days} days ago`;
  }

  // For > 7 days, show formatted date
  const date = new Date(lastSeen);
  return `Last seen on ${date.toLocaleDateString()}`;
}

/**
 * Get the color for a presence indicator
 * 
 * @param online - Whether the user is online
 * @returns Color hex string for the presence indicator
 */
export function getPresenceColor(online: boolean): string {
  return online ? '#4CAF50' : '#9E9E9E'; // Green for online, gray for offline
}

/**
 * Get the presence text to display for a user
 * Returns "Online" if user is online, otherwise returns formatted last seen time
 * 
 * @param online - Whether the user is online
 * @param lastSeen - Timestamp of last activity in milliseconds
 * @returns String to display for user presence
 */
export function getPresenceText(online: boolean, lastSeen: number): string {
  if (online) {
    return 'Online';
  }
  return formatLastSeen(lastSeen);
}

