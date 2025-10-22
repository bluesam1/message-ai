/**
 * Unit Tests for RTDB Presence Service
 * 
 * Tests the Firebase Realtime Database presence tracking service
 * including connection monitoring, onDisconnect handlers, and Firestore mirroring
 */

import { rtdbPresenceService } from '../../src/services/user/rtdbPresenceService';

// Mock Firebase Database
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  onValue: jest.fn(),
  set: jest.fn(),
  onDisconnect: jest.fn(),
  serverTimestamp: jest.fn(() => ({ '.sv': 'timestamp' })),
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

// Mock Firebase config
jest.mock('../../src/config/firebase', () => ({
  rtdb: {},
  db: {},
}));

// Import mocked functions
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { doc, updateDoc } from 'firebase/firestore';

describe('rtdbPresenceService', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should set up connection monitoring on .info/connected', () => {
      const userId = 'test-user-123';
      const mockUnsubscribe = jest.fn();
      
      // Mock onValue to return unsubscribe function
      (onValue as jest.Mock).mockReturnValue(mockUnsubscribe);
      
      // Call initialize
      rtdbPresenceService.initialize(userId);
      
      // Verify ref was called with .info/connected
      expect(ref).toHaveBeenCalledWith({}, '.info/connected');
      
      // Verify onValue was called (listener set up)
      expect(onValue).toHaveBeenCalled();
    });

    it('should call setOnlineStatus when connected is true', async () => {
      const userId = 'test-user-123';
      let connectionCallback: (snapshot: any) => void;
      
      // Mock onValue to capture the callback
      (onValue as jest.Mock).mockImplementation((refObj: any, callback: any) => {
        if (callback) {
          connectionCallback = callback;
        }
        return jest.fn(); // return unsubscribe
      });
      
      // Mock set to resolve successfully
      (set as jest.Mock).mockResolvedValue(undefined);
      
      // Mock onDisconnect
      const mockOnDisconnectSet = jest.fn().mockResolvedValue(undefined);
      (onDisconnect as jest.Mock).mockReturnValue({ set: mockOnDisconnectSet });
      
      // Initialize
      rtdbPresenceService.initialize(userId);
      
      // Simulate connection
      connectionCallback!({ val: () => true });
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify set was called for online status
      expect(set).toHaveBeenCalled();
      expect(onDisconnect).toHaveBeenCalled();
    });

    it('should set up connection monitoring only (Cloud Function handles Firestore)', () => {
      const userId = 'test-user-123';
      
      // Mock onValue to be called once (only connection monitoring)
      (onValue as jest.Mock).mockReturnValue(jest.fn());
      
      // Initialize
      rtdbPresenceService.initialize(userId);
      
      // Verify onValue was called once for .info/connected
      // Cloud Function handles Firestore mirroring, so no second listener needed
      expect(onValue).toHaveBeenCalledTimes(1);
    });
  });

  describe('onDisconnect handler', () => {
    it('should register onDisconnect handler with offline status', async () => {
      const userId = 'test-user-123';
      let connectionCallback: (snapshot: any) => void;
      
      // Mock onValue
      (onValue as jest.Mock).mockImplementation((refObj: any, callback: any) => {
        if (callback) {
          connectionCallback = callback;
        }
        return jest.fn();
      });
      
      // Mock set
      (set as jest.Mock).mockResolvedValue(undefined);
      
      // Mock onDisconnect
      const mockOnDisconnectSet = jest.fn().mockResolvedValue(undefined);
      (onDisconnect as jest.Mock).mockReturnValue({ set: mockOnDisconnectSet });
      
      // Initialize and trigger connection
      rtdbPresenceService.initialize(userId);
      connectionCallback!({ val: () => true });
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify onDisconnect was called
      expect(onDisconnect).toHaveBeenCalled();
      
      // Verify offline status was set in onDisconnect
      expect(mockOnDisconnectSet).toHaveBeenCalledWith({
        state: 'offline',
        lastSeenAt: { '.sv': 'timestamp' },
      });
    });
  });

  // Note: Firestore mirroring is now handled by Cloud Functions
  // When RTDB /status/{uid} changes, Cloud Function mirrors to Firestore
  // No client-side mirroring needed!

  describe('cleanup', () => {
    it('should call unsubscribe function for connection listener', () => {
      const userId = 'test-user-123';
      const mockUnsubscribe = jest.fn();
      
      // Mock onValue to return unsubscribe function
      (onValue as jest.Mock).mockReturnValue(mockUnsubscribe); // connection listener only
      
      // Initialize
      rtdbPresenceService.initialize(userId);
      
      // Call cleanup
      rtdbPresenceService.cleanup();
      
      // Verify unsubscribe function was called
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should handle cleanup when listeners were not set up', () => {
      // Call cleanup without initializing
      // Should not throw
      expect(() => {
        rtdbPresenceService.cleanup();
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', () => {
      const userId = 'test-user-123';
      
      // Mock ref to throw error
      (ref as jest.Mock).mockImplementation(() => {
        throw new Error('RTDB connection error');
      });
      
      // Mock console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Initialize should throw
      expect(() => {
        rtdbPresenceService.initialize(userId);
      }).toThrow('Failed to initialize presence tracking');
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Cleanup
      consoleErrorSpy.mockRestore();
    });

    it('should handle set errors during status update', async () => {
      const userId = 'test-user-123';
      let connectionCallback: (snapshot: any) => void;
      
      // Mock console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock ref to return a mock object
      (ref as jest.Mock).mockReturnValue({});
      
      // Mock onValue to capture callback
      (onValue as jest.Mock).mockImplementation((refObj: any, callback: any) => {
        if (callback) {
          connectionCallback = callback;
        }
        return jest.fn();
      });
      
      // Mock set to reject
      (set as jest.Mock).mockRejectedValue(new Error('RTDB write error'));
      
      // Initialize
      rtdbPresenceService.initialize(userId);
      
      // Trigger connection (which calls setOnlineStatus)
      // The .catch() handler should log the error
      await connectionCallback!({ val: () => true });
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify error was logged by the .catch() handler
      expect(consoleErrorSpy).toHaveBeenCalledWith('[RTDB Presence] Error setting online status:', expect.any(Error));
      
      // Cleanup
      consoleErrorSpy.mockRestore();
    });
  });
});


