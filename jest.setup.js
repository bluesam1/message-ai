/**
 * Jest Setup File
 * 
 * This file runs before each test suite.
 * Use it to configure testing environment, add custom matchers, or set up global mocks.
 */

// Import React Native Testing Library matchers
import '@testing-library/jest-native/extend-expect';

// Mock Expo modules
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
}));

// Suppress console warnings in tests (optional)
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test timeout (30 seconds max per PRD)
jest.setTimeout(30000);

