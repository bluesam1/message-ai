/**
 * Tests for Network Service
 * Tests network monitoring, listener pattern, and state management
 */

import { networkService } from '../../src/services/network/networkService';
import NetInfo from '@react-native-community/netinfo';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

describe('NetworkService', () => {
  let mockUnsubscribe: jest.Mock;
  let mockNetInfoListener: ((state: any) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock unsubscribe function
    mockUnsubscribe = jest.fn();
    
    // Mock addEventListener to capture the listener
    (NetInfo.addEventListener as jest.Mock).mockImplementation((listener) => {
      mockNetInfoListener = listener;
      return mockUnsubscribe;
    });

    // Mock fetch to return initial online state
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
    });
  });

  afterEach(() => {
    networkService.cleanup();
    mockNetInfoListener = null;
  });

  describe('initialization', () => {
    it('should initialize and set up NetInfo listener', () => {
      networkService.initialize();

      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(NetInfo.fetch).toHaveBeenCalled();
    });

    it('should not initialize twice', () => {
      networkService.initialize();
      networkService.initialize();

      expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('should fetch initial network state', async () => {
      networkService.initialize();
      
      // Wait for fetch to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(NetInfo.fetch).toHaveBeenCalled();
    });
  });

  describe('isOnline', () => {
    it('should return boolean value', async () => {
      networkService.initialize();
      await new Promise(resolve => setTimeout(resolve, 10));

      const status = networkService.isOnline();
      expect(typeof status).toBe('boolean');
    });
  });

  describe('subscribe', () => {
    it('should call listener when network state changes', () => {
      const mockListener = jest.fn();
      
      networkService.initialize();
      networkService.subscribe(mockListener);

      // Trigger state change
      if (mockNetInfoListener) {
        mockNetInfoListener({ isConnected: false });
      }

      expect(mockListener).toHaveBeenCalledWith(false);
    });

    it('should call multiple listeners', () => {
      const mockListener1 = jest.fn();
      const mockListener2 = jest.fn();
      
      networkService.initialize();
      networkService.subscribe(mockListener1);
      networkService.subscribe(mockListener2);

      // Trigger state change
      if (mockNetInfoListener) {
        mockNetInfoListener({ isConnected: false });
      }

      expect(mockListener1).toHaveBeenCalledWith(false);
      expect(mockListener2).toHaveBeenCalledWith(false);
    });

    it('should return unsubscribe function', () => {
      const mockListener = jest.fn();
      
      networkService.initialize();
      const unsubscribe = networkService.subscribe(mockListener);

      // Unsubscribe
      unsubscribe();

      // Trigger state change - listener should not be called
      if (mockNetInfoListener) {
        mockNetInfoListener({ isConnected: false });
      }

      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const mockListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      
      networkService.initialize();
      networkService.subscribe(mockListener);

      // Should not throw
      expect(() => {
        if (mockNetInfoListener) {
          mockNetInfoListener({ isConnected: false });
        }
      }).not.toThrow();
    });
  });

  describe('state changes', () => {
    it('should call listeners on state change', () => {
      const mockListener = jest.fn();
      
      networkService.initialize();
      networkService.subscribe(mockListener);

      // Trigger any state change
      if (mockNetInfoListener) {
        mockNetInfoListener({ isConnected: false });
      }
      
      // Should have been called at least once
      expect(mockListener).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup listeners and unsubscribe', () => {
      networkService.initialize();
      networkService.cleanup();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should clear all subscribed listeners', () => {
      const mockListener = jest.fn();
      
      networkService.initialize();
      networkService.subscribe(mockListener);
      networkService.cleanup();

      // Re-initialize and trigger change
      networkService.initialize();
      if (mockNetInfoListener) {
        mockNetInfoListener({ isConnected: false });
      }

      // Old listener should not be called
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentState', () => {
    it('should return current network state', async () => {
      const mockState = { isConnected: true, isInternetReachable: true };
      (NetInfo.fetch as jest.Mock).mockResolvedValue(mockState);

      const state = await networkService.getCurrentState();

      expect(state).toEqual(mockState);
      expect(NetInfo.fetch).toHaveBeenCalled();
    });
  });
});

