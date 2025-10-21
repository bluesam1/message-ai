/**
 * Validation Utilities Tests
 */

import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateRegistrationForm,
  validateLoginForm,
} from '../../src/utils/validation';

describe('validateEmail', () => {
  it('should validate correct email addresses', () => {
    expect(validateEmail('test@example.com').valid).toBe(true);
    expect(validateEmail('user.name@domain.co.uk').valid).toBe(true);
    expect(validateEmail('test+tag@example.com').valid).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('').valid).toBe(false);
    expect(validateEmail('notanemail').valid).toBe(false);
    expect(validateEmail('missing@domain').valid).toBe(false);
    expect(validateEmail('@example.com').valid).toBe(false);
    expect(validateEmail('user@').valid).toBe(false);
  });

  it('should provide error messages for invalid emails', () => {
    expect(validateEmail('').error).toBe('Email is required');
    expect(validateEmail('notanemail').error).toBe('Please enter a valid email address');
  });
});

describe('validatePassword', () => {
  it('should validate passwords with 6+ characters', () => {
    expect(validatePassword('123456').valid).toBe(true);
    expect(validatePassword('password').valid).toBe(true);
    expect(validatePassword('verylongpassword').valid).toBe(true);
  });

  it('should reject short passwords', () => {
    expect(validatePassword('').valid).toBe(false);
    expect(validatePassword('12345').valid).toBe(false);
    expect(validatePassword('abc').valid).toBe(false);
  });

  it('should provide error messages', () => {
    expect(validatePassword('').error).toBe('Password is required');
    expect(validatePassword('12345').error).toBe('Password must be at least 6 characters');
  });
});

describe('validateDisplayName', () => {
  it('should validate display names between 2-50 characters', () => {
    expect(validateDisplayName('Jo').valid).toBe(true);
    expect(validateDisplayName('John Doe').valid).toBe(true);
    expect(validateDisplayName('A'.repeat(50)).valid).toBe(true);
  });

  it('should reject empty or very short display names', () => {
    expect(validateDisplayName('').valid).toBe(false);
    expect(validateDisplayName(' ').valid).toBe(false);
    expect(validateDisplayName('A').valid).toBe(false);
  });

  it('should reject very long display names', () => {
    expect(validateDisplayName('A'.repeat(51)).valid).toBe(false);
  });

  it('should provide error messages', () => {
    expect(validateDisplayName('').error).toBe('Display name is required');
    expect(validateDisplayName('A').error).toBe('Display name must be at least 2 characters');
    expect(validateDisplayName('A'.repeat(51)).error).toBe('Display name must be less than 50 characters');
  });
});

describe('validateRegistrationForm', () => {
  it('should validate valid registration form', () => {
    const result = validateRegistrationForm('test@example.com', 'password123', 'John Doe');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return all validation errors', () => {
    const result = validateRegistrationForm('', '123', 'A');
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
    expect(result.errors.displayName).toBeDefined();
  });

  it('should return specific field errors', () => {
    const result = validateRegistrationForm('test@example.com', '123', 'John Doe');
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeUndefined();
    expect(result.errors.password).toBeDefined();
    expect(result.errors.displayName).toBeUndefined();
  });
});

describe('validateLoginForm', () => {
  it('should validate valid login form', () => {
    const result = validateLoginForm('test@example.com', 'password123');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return validation errors', () => {
    const result = validateLoginForm('', '123');
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
  });
});


