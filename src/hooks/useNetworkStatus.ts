/**
 * React Hook for Network Status
 * 
 * Provides real-time network connectivity state to React components
 */

import { useState, useEffect } from 'react';
import { networkService } from '../services/network/networkService';

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
  const [isOnline, setIsOnline] = useState(() => networkService.isOnline());
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(networkService.isOnline());

    // Subscribe to network changes
    const unsubscribe = networkService.subscribe((online: boolean) => {
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

