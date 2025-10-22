/**
 * PresenceIndicator Component
 * Displays online/offline status for a user with optional text
 * Shows green dot for online, gray dot for offline
 * Automatically updates relative time text (e.g., "Just now" → "Last seen 1m ago")
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePresence } from '../../hooks/usePresence';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import { getPresenceText, getPresenceColor } from '../../utils/presenceUtils';

interface PresenceIndicatorProps {
  /** User ID to display presence for */
  userId: string | null | undefined;
  /** Whether to show presence text (e.g., "Online" or "Last seen...") */
  showText?: boolean;
  /** Size variant for the indicator dot */
  size?: 'small' | 'medium';
  /** Custom text style (for showText mode) */
  textStyle?: any;
}

/**
 * PresenceIndicator Component
 * Shows a colored dot and optional text indicating user's online status
 * Uses shared global timer to update relative time text every minute
 */
const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  userId,
  showText = false,
  size = 'small',
  textStyle,
}) => {
  const { online, lastSeen, loading } = usePresence(userId);
  // Use global timer that's shared across all PresenceIndicator instances
  // This is much more efficient than having a timer per component
  const currentTime = useCurrentTime();

  // Don't render anything if still loading or no userId
  if (loading || !userId) {
    return null;
  }

  const dotSize = size === 'small' ? 8 : 12;
  const color = getPresenceColor(online);
  // Recalculate text based on current time (will update every minute via global timer)
  const text = getPresenceText(online, lastSeen);

  return (
    <View style={styles.container}>
      {/* Presence Dot */}
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
          },
        ]}
      />

      {/* Presence Text (optional) */}
      {showText && (
        <Text style={[styles.text, { color }, textStyle]}>{text}</Text>
      )}
    </View>
  );
};

export default PresenceIndicator;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});

