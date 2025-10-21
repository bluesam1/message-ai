/**
 * Offline Banner Component
 * 
 * Displays a banner at the top of the screen showing network connectivity status
 * Shows different states: offline, reconnecting, or briefly shows "back online"
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function OfflineBanner() {
  const { isOnline, isConnecting } = useNetworkStatus();
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-60)); // Start off-screen

  useEffect(() => {
    if (!isOnline) {
      // Show offline banner - slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
      setShowOnlineBanner(false);
    } else if (isConnecting) {
      // Show reconnecting banner - slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    } else {
      // Coming back online
      // Show "back online" banner briefly, then hide
      setShowOnlineBanner(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();

      // Hide after 2 seconds
      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowOnlineBanner(false);
        });
      }, 2000);
    }
  }, [isOnline, isConnecting]);

  // Don't render anything if online and not showing the brief "back online" message
  if (isOnline && !showOnlineBanner && !isConnecting) {
    return null;
  }

  // Determine banner content and style
  let backgroundColor = '#FF6B6B'; // Red for offline
  let icon = '⚠️';
  let message = "You're offline. Messages will send when connected.";

  if (isConnecting) {
    backgroundColor = '#FFA500'; // Orange for reconnecting
    icon = '🔄';
    message = 'Reconnecting...';
  } else if (showOnlineBanner && isOnline) {
    backgroundColor = '#51CF66'; // Green for back online
    icon = '✓';
    message = 'Back online';
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

