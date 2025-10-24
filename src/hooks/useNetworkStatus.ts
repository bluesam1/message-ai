/**
 * React Hook for Network Status
 * 
 * Provides real-time network connectivity state to React components
 * Uses React Native NetInfo for network detection
 */

import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface NetworkStatus {
  isOnline: boolean;
  isConnecting: boolean;
}

/**
 * Hook to monitor network connectivity status
 * 
 * @returns NetworkStatus object with isOnline and isConnecting flags
 * 
 * @example
 * ```tsx
 * const { isOnline, isConnecting } = useNetworkStatus();
 * 
 * if (!isOnline) {
 *   return <OfflineBanner />;
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? true;
      
      if (online && !isOnline) {
        // Going from offline to online - show connecting state briefly
        setIsConnecting(true);
        
        // Clear connecting state after a short delay
        setTimeout(() => {
          setIsConnecting(false);
          setIsOnline(true);
        }, 1000);
      } else {
        // Immediate update for going offline
        setIsConnecting(false);
        setIsOnline(online);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [isOnline]);

  return {
    isOnline,
    isConnecting,
  };
}

