/**
 * Group Validation Utilities
 * 
 * Provides validation functions for group chat operations including:
 * - Email validation
 * - Group name validation
 * - Duplicate member detection
 */

/**
 * Validates email format using regex pattern
 * 
 * @param email - Email address to validate
 * @returns True if email format is valid, false otherwise
 * 
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Standard email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates group name according to requirements:
 * - Required (not empty)
 * - Minimum 3 characters
 * - Maximum 50 characters
 * 
 * @param name - Group name to validate
 * @returns Validation result with error message if invalid
 * 
 * @example
 * validateGroupName('Team Chat') // { valid: true }
 * validateGroupName('') // { valid: false, error: 'Group name is required' }
 * validateGroupName('AB') // { valid: false, error: 'Group name must be at least 3 characters' }
 */
export function validateGroupName(name: string): ValidationResult {
  // Check if name exists and is a string
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Group name is required' };
  }
  
  // Trim whitespace for validation
  const trimmedName = name.trim();
  
  // Check if empty after trimming
  if (trimmedName.length === 0) {
    return { valid: false, error: 'Group name is required' };
  }
  
  // Check minimum length
  if (trimmedName.length < 3) {
    return { valid: false, error: 'Group name must be at least 3 characters' };
  }
  
  // Check maximum length
  if (trimmedName.length > 50) {
    return { valid: false, error: 'Group name must be less than 50 characters' };
  }
  
  return { valid: true };
}

/**
 * Checks if a member ID already exists in the participants array
 * Used to prevent duplicate member additions to groups
 * 
 * @param memberId - User ID to check
 * @param existingMembers - Array of existing participant IDs
 * @returns True if member already exists, false otherwise
 * 
 * @example
 * isDuplicateMember('user123', ['user123', 'user456']) // true
 * isDuplicateMember('user789', ['user123', 'user456']) // false
 */
export function isDuplicateMember(
  memberId: string,
  existingMembers: string[]
): boolean {
  if (!memberId || !Array.isArray(existingMembers)) {
    return false;
  }
  
  return existingMembers.includes(memberId);
}

/**
 * Validates minimum participant count for group creation
 * Groups require at least 2 total participants (creator + 1 other)
 * 
 * @param participantCount - Total number of participants including creator
 * @returns Validation result with error message if invalid
 * 
 * @example
 * validateMinimumParticipants(2) // { valid: true }
 * validateMinimumParticipants(1) // { valid: false, error: 'Group must have at least 2 members' }
 */
export function validateMinimumParticipants(participantCount: number): ValidationResult {
  if (participantCount < 2) {
    return { 
      valid: false, 
      error: 'Group must have at least 2 members' 
    };
  }
  
  return { valid: true };
}

