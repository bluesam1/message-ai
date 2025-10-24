/**
 * Network Monitoring Service
 * 
 * Monitors network connectivity state using NetInfo and provides
 * a simple API for components to subscribe to connectivity changes.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkListener = (online: boolean) => void;

class NetworkService {
  private isOnlineState: boolean = true;
  private listeners: Set<NetworkListener> = new Set();
  private initialized: boolean = false;
  private unsubscribe: (() => void) | null = null;

  /**
   * Initialize the network monitoring service
   * Should be called once at app startup
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('NetworkService already initialized');
      return;
    }

    // Subscribe to network state changes
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      this.handleNetworkChange(state);
    });

    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      this.isOnlineState = state.isConnected ?? false;
    });

    this.initialized = true;
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(state: NetInfoState): void {
    const wasOffline = !this.isOnlineState;
    const newOnlineState = state.isConnected ?? false;

    console.log(`[NetworkService] Network state change detected:`, {
      wasOffline,
      wasOnline: this.isOnlineState,
      newOnlineState,
      stateChanged: this.isOnlineState !== newOnlineState
    });

    // Only process if state actually changed
    if (this.isOnlineState === newOnlineState) {
      console.log('[NetworkService] No actual state change, skipping');
      return;
    }

    this.isOnlineState = newOnlineState;

    // Notify all listeners
    this.notifyListeners(newOnlineState);

    // Log state change
    console.log(`[NetworkService] Network state changed: ${newOnlineState ? 'ONLINE' : 'OFFLINE'}`);

    // If we just came back online, trigger sync
    if (wasOffline && newOnlineState) {
      console.log('[NetworkService] Network reconnected - listeners will trigger sync');
      // Notify listeners - they can trigger sync if needed
      // This avoids circular dependency and dynamic import issues
    }
  }

  /**
   * Notify all registered listeners of state change
   */
  private notifyListeners(online: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(online);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Check if device is currently online
   */
  isOnline(): boolean {
    return this.isOnlineState;
  }

  /**
   * Subscribe to network state changes
   * Returns an unsubscribe function
   */
  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clean up and remove all listeners
   */
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
    this.initialized = false;
  }

  /**
   * Get the current network state (for testing/debugging)
   */
  async getCurrentState(): Promise<NetInfoState> {
    return NetInfo.fetch();
  }
}

// Export singleton instance
export const networkService = new NetworkService();

