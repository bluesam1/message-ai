/**
 * Unit tests for group validation utilities
 */

import {
  isValidEmail,
  validateGroupName,
  isDuplicateMember,
  validateMinimumParticipants,
  ValidationResult,
} from '../../src/utils/groupValidation';

describe('groupValidation', () => {
  describe('isValidEmail', () => {
    it('should validate correct email format', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.com')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('user_name@subdomain.example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('noatsign.com')).toBe(false);
      expect(isValidEmail('spaces in@email.com')).toBe(false);
    });

    it('should reject empty or null inputs', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('   ')).toBe(false);
      expect(isValidEmail(null as any)).toBe(false);
      expect(isValidEmail(undefined as any)).toBe(false);
    });

    it('should handle emails with whitespace', () => {
      expect(isValidEmail(' test@example.com ')).toBe(true);
      expect(isValidEmail('  user@domain.com  ')).toBe(true);
    });

    it('should reject non-string inputs', () => {
      expect(isValidEmail(123 as any)).toBe(false);
      expect(isValidEmail({} as any)).toBe(false);
      expect(isValidEmail([] as any)).toBe(false);
    });
  });

  describe('validateGroupName', () => {
    it('should accept valid group names', () => {
      const result1 = validateGroupName('Team Chat');
      expect(result1.valid).toBe(true);
      expect(result1.error).toBeUndefined();

      const result2 = validateGroupName('Project Discussion');
      expect(result2.valid).toBe(true);

      const result3 = validateGroupName('ABC'); // Minimum length
      expect(result3.valid).toBe(true);
    });

    it('should accept group names up to 50 characters', () => {
      const fiftyChars = 'A'.repeat(50);
      const result = validateGroupName(fiftyChars);
      expect(result.valid).toBe(true);
    });

    it('should reject empty group names', () => {
      const result = validateGroupName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Group name is required');
    });

    it('should reject whitespace-only group names', () => {
      const result1 = validateGroupName('   ');
      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('Group name is required');

      const result2 = validateGroupName('\t\n');
      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('Group name is required');
    });

    it('should reject group names that are too short', () => {
      const result1 = validateGroupName('ab');
      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('Group name must be at least 3 characters');

      const result2 = validateGroupName('a');
      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('Group name must be at least 3 characters');
    });

    it('should reject group names that are too long', () => {
      const fiftyOneChars = 'A'.repeat(51);
      const result = validateGroupName(fiftyOneChars);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Group name must be less than 50 characters');

      const hundredChars = 'A'.repeat(100);
      const result2 = validateGroupName(hundredChars);
      expect(result2.valid).toBe(false);
    });

    it('should handle names with leading/trailing whitespace', () => {
      const result = validateGroupName('  Team Chat  ');
      expect(result.valid).toBe(true);
    });

    it('should reject null or undefined inputs', () => {
      const result1 = validateGroupName(null as any);
      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('Group name is required');

      const result2 = validateGroupName(undefined as any);
      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('Group name is required');
    });

    it('should reject non-string inputs', () => {
      const result1 = validateGroupName(123 as any);
      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('Group name is required');

      const result2 = validateGroupName({} as any);
      expect(result2.valid).toBe(false);
    });

    it('should accept group names with special characters', () => {
      const result1 = validateGroupName('Team 2024 🚀');
      expect(result1.valid).toBe(true);

      const result2 = validateGroupName('Project: Alpha');
      expect(result2.valid).toBe(true);
    });
  });

  describe('isDuplicateMember', () => {
    it('should detect duplicate members', () => {
      const existingMembers = ['user1', 'user2', 'user3'];
      
      expect(isDuplicateMember('user1', existingMembers)).toBe(true);
      expect(isDuplicateMember('user2', existingMembers)).toBe(true);
      expect(isDuplicateMember('user3', existingMembers)).toBe(true);
    });

    it('should allow new members', () => {
      const existingMembers = ['user1', 'user2', 'user3'];
      
      expect(isDuplicateMember('user4', existingMembers)).toBe(false);
      expect(isDuplicateMember('user999', existingMembers)).toBe(false);
      expect(isDuplicateMember('newuser', existingMembers)).toBe(false);
    });

    it('should handle empty participant arrays', () => {
      expect(isDuplicateMember('user1', [])).toBe(false);
    });

    it('should be case-sensitive', () => {
      const existingMembers = ['user1', 'user2'];
      
      expect(isDuplicateMember('User1', existingMembers)).toBe(false);
      expect(isDuplicateMember('USER1', existingMembers)).toBe(false);
    });

    it('should handle invalid inputs gracefully', () => {
      expect(isDuplicateMember('', ['user1'])).toBe(false);
      expect(isDuplicateMember(null as any, ['user1'])).toBe(false);
      expect(isDuplicateMember(undefined as any, ['user1'])).toBe(false);
      expect(isDuplicateMember('user1', null as any)).toBe(false);
      expect(isDuplicateMember('user1', undefined as any)).toBe(false);
    });

    it('should work with single-member arrays', () => {
      expect(isDuplicateMember('user1', ['user1'])).toBe(true);
      expect(isDuplicateMember('user2', ['user1'])).toBe(false);
    });

    it('should handle large participant lists', () => {
      const largeList = Array.from({ length: 100 }, (_, i) => `user${i}`);
      
      expect(isDuplicateMember('user50', largeList)).toBe(true);
      expect(isDuplicateMember('user999', largeList)).toBe(false);
    });
  });

  describe('validateMinimumParticipants', () => {
    it('should accept valid participant counts', () => {
      const result1 = validateMinimumParticipants(2);
      expect(result1.valid).toBe(true);
      expect(result1.error).toBeUndefined();

      const result2 = validateMinimumParticipants(3);
      expect(result2.valid).toBe(true);

      const result3 = validateMinimumParticipants(5);
      expect(result3.valid).toBe(true);

      const result4 = validateMinimumParticipants(100);
      expect(result4.valid).toBe(true);
    });

    it('should reject insufficient participant counts', () => {
      const result1 = validateMinimumParticipants(1);
      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('Group must have at least 2 members');

      const result2 = validateMinimumParticipants(0);
      expect(result2.valid).toBe(false);
      expect(result2.error).toBe('Group must have at least 2 members');
    });

    it('should handle negative numbers', () => {
      const result = validateMinimumParticipants(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Group must have at least 2 members');
    });
  });
});

