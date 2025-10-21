/**
 * Jest Setup File
 * 
 * This file runs before each test suite.
 * Use it to configure testing environment, add custom matchers, or set up global mocks.
 */

// Load environment variables from .env file for tests
require('dotenv').config();

// Note: React Native Testing Library removed due to React 19.2.0 requirement conflict
// Using Jest's built-in matchers for now

// Mock Expo modules
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(),
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve()),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    closeAsync: jest.fn(() => Promise.resolve()),
  })),
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

