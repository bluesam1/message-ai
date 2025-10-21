/**
 * Error Message Utilities Tests
 */

import {
  getAuthErrorMessage,
  getFirestoreErrorMessage,
  formatErrorForDisplay,
} from '../../src/utils/errorMessages';

describe('getAuthErrorMessage', () => {
  it('should return friendly message for common Firebase auth errors', () => {
    expect(getAuthErrorMessage({ code: 'auth/email-already-in-use' }))
      .toContain('already registered');
    
    expect(getAuthErrorMessage({ code: 'auth/weak-password' }))
      .toContain('too weak');
    
    expect(getAuthErrorMessage({ code: 'auth/user-not-found' }))
      .toContain('No account found');
    
    expect(getAuthErrorMessage({ code: 'auth/wrong-password' }))
      .toContain('Incorrect password');
    
    expect(getAuthErrorMessage({ code: 'auth/network-request-failed' }))
      .toContain('Network error');
  });

  it('should extract error code from Firebase error message format', () => {
    const error = {
      message: 'Firebase: Error (auth/email-already-in-use).',
    };
    expect(getAuthErrorMessage(error)).toContain('already registered');
  });

  it('should return user-friendly message if available', () => {
    const error = {
      message: 'Custom user-friendly error',
    };
    expect(getAuthErrorMessage(error)).toBe('Custom user-friendly error');
  });

  it('should return default message for unknown errors', () => {
    expect(getAuthErrorMessage({ code: 'auth/unknown-error' }))
      .toContain('unexpected error');
    
    expect(getAuthErrorMessage({}))
      .toContain('unexpected error');
  });
});

describe('getFirestoreErrorMessage', () => {
  it('should return friendly message for Firestore errors', () => {
    expect(getFirestoreErrorMessage({ code: 'permission-denied' }))
      .toContain('permission');
    
    expect(getFirestoreErrorMessage({ code: 'unavailable' }))
      .toContain('unavailable');
    
    expect(getFirestoreErrorMessage({ code: 'not-found' }))
      .toContain('not found');
  });

  it('should return default message for unknown Firestore errors', () => {
    expect(getFirestoreErrorMessage({ code: 'unknown-error' }))
      .toContain('database');
  });
});

describe('formatErrorForDisplay', () => {
  it('should format string errors', () => {
    expect(formatErrorForDisplay('Simple error message'))
      .toBe('Simple error message');
  });

  it('should handle auth errors', () => {
    const error = { code: 'auth/user-not-found' };
    expect(formatErrorForDisplay(error)).toContain('No account found');
  });

  it('should handle Firestore errors', () => {
    const error = { code: 'permission-denied' }; // Firestore errors don't have 'firestore/' prefix
    expect(formatErrorForDisplay(error)).toContain('permission');
  });

  it('should extract message property', () => {
    const error = { message: 'Error message' };
    expect(formatErrorForDisplay(error)).toBe('Error message');
  });

  it('should return default message for unknown error types', () => {
    expect(formatErrorForDisplay(null)).toContain('unexpected error');
    expect(formatErrorForDisplay(undefined)).toContain('unexpected error');
  });
});

