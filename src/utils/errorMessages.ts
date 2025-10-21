/**
 * Error Message Utilities
 * 
 * Maps Firebase error codes to user-friendly messages
 */

/**
 * Firebase auth error codes and their user-friendly messages
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Email/Password errors
  'auth/email-already-in-use': 'This email is already registered. Please sign in or use a different email.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
  'auth/user-not-found': 'No account found with this email. Please check your email or sign up.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password. Please try again.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  
  // Network errors
  'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
  'auth/timeout': 'Request timed out. Please try again.',
  
  // Google Sign-In errors
  'auth/popup-closed-by-user': 'Sign-in cancelled. Please try again.',
  'auth/cancelled-popup-request': 'Sign-in cancelled. Please try again.',
  'auth/popup-blocked': 'Pop-up blocked. Please allow pop-ups for this site.',
  'auth/unauthorized-domain': 'This domain is not authorized for OAuth. Please contact support.',
  'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in credentials.',
  
  // Token errors
  'auth/invalid-api-key': 'Configuration error. Please contact support.',
  'auth/app-deleted': 'Application error. Please contact support.',
  'auth/app-not-authorized': 'Application is not authorized. Please contact support.',
  'auth/argument-error': 'Invalid request. Please try again.',
  'auth/invalid-api-key': 'Configuration error. Please contact support.',
  'auth/requires-recent-login': 'Please sign out and sign in again to complete this action.',
};

/**
 * Get user-friendly error message from Firebase error
 */
export const getAuthErrorMessage = (error: any): string => {
  // If error has a code property
  if (error?.code) {
    const message = AUTH_ERROR_MESSAGES[error.code];
    if (message) return message;
  }

  // If error has a message property
  if (error?.message) {
    // Try to extract error code from message (format: "Firebase: Error (auth/error-code).")
    const codeMatch = error.message.match(/\(auth\/([^)]+)\)/);
    if (codeMatch) {
      const code = `auth/${codeMatch[1]}`;
      const message = AUTH_ERROR_MESSAGES[code];
      if (message) return message;
    }
    
    // Return the message if it's user-friendly (doesn't contain "Firebase:")
    if (!error.message.includes('Firebase:')) {
      return error.message;
    }
  }

  // Default error message
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Get error message for Firestore errors
 */
export const getFirestoreErrorMessage = (error: any): string => {
  if (error?.code === 'permission-denied') {
    return 'You do not have permission to perform this action.';
  }
  
  if (error?.code === 'unavailable') {
    return 'Service temporarily unavailable. Please try again.';
  }
  
  if (error?.code === 'not-found') {
    return 'The requested data was not found.';
  }

  return 'An error occurred while accessing the database. Please try again.';
};

/**
 * Format error for display in UI
 */
export const formatErrorForDisplay = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.code?.startsWith('auth/')) {
    return getAuthErrorMessage(error);
  }

  // Firestore errors have codes like 'permission-denied', 'unavailable', 'not-found'
  // without a prefix
  const firestoreErrorCodes = ['permission-denied', 'unavailable', 'not-found', 'already-exists'];
  if (error?.code && firestoreErrorCodes.includes(error.code)) {
    return getFirestoreErrorMessage(error);
  }

  if (error?.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

