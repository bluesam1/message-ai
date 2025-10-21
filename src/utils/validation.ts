/**
 * Validation Utilities
 * 
 * Helper functions for validating user input
 */

/**
 * Validate email format
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }

  return { valid: true };
};

/**
 * Validate display name
 */
export const validateDisplayName = (displayName: string): { valid: boolean; error?: string } => {
  if (!displayName || !displayName.trim()) {
    return { valid: false, error: 'Display name is required' };
  }

  if (displayName.trim().length < 2) {
    return { valid: false, error: 'Display name must be at least 2 characters' };
  }

  if (displayName.trim().length > 50) {
    return { valid: false, error: 'Display name must be less than 50 characters' };
  }

  return { valid: true };
};

/**
 * Validate registration form
 */
export const validateRegistrationForm = (
  email: string,
  password: string,
  displayName: string
): { valid: boolean; errors: { email?: string; password?: string; displayName?: string } } => {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  const displayNameValidation = validateDisplayName(displayName);

  const errors: { email?: string; password?: string; displayName?: string } = {};

  if (!emailValidation.valid) errors.email = emailValidation.error;
  if (!passwordValidation.valid) errors.password = passwordValidation.error;
  if (!displayNameValidation.valid) errors.displayName = displayNameValidation.error;

  return {
    valid: emailValidation.valid && passwordValidation.valid && displayNameValidation.valid,
    errors,
  };
};

/**
 * Validate login form
 */
export const validateLoginForm = (
  email: string,
  password: string
): { valid: boolean; errors: { email?: string; password?: string } } => {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);

  const errors: { email?: string; password?: string } = {};

  if (!emailValidation.valid) errors.email = emailValidation.error;
  if (!passwordValidation.valid) errors.password = passwordValidation.error;

  return {
    valid: emailValidation.valid && passwordValidation.valid,
    errors,
  };
};


