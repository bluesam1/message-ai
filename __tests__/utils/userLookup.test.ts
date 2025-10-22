/**
 * Unit tests for user lookup utilities
 */

import {
  getUserByEmail,
  getUserIdsByEmails,
  getUsersByEmails,
  validateEmails,
} from '../../src/utils/userLookup';
import { getDocs } from 'firebase/firestore';
import { User } from '../../src/types/user';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

// Mock firebase config
jest.mock('../../src/config/firebase', () => ({
  db: {},
}));

describe('userLookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'alice@example.com',
        displayName: 'Alice',
        photoURL: 'https://example.com/photo.jpg',
        createdAt: { toMillis: () => 1698765000000 },
        lastSeen: { toMillis: () => 1698765432000 },
      };

      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockUser }],
      });

      const result = await getUserByEmail('alice@example.com');

      expect(result).toEqual({
        uid: 'user123',
        email: 'alice@example.com',
        displayName: 'Alice',
        photoURL: 'https://example.com/photo.jpg',
        online: false,
        createdAt: 1698765000000,
        lastSeen: 1698765432000,
      });
    });

    it('should return null when user not found', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should normalize email to lowercase', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'alice@example.com',
        displayName: 'Alice',
        photoURL: null,
        createdAt: { toMillis: () => Date.now() },
        lastSeen: { toMillis: () => Date.now() },
      };

      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockUser }],
      });

      const result = await getUserByEmail('ALICE@EXAMPLE.COM');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('alice@example.com');
    });

    it('should handle emails with whitespace', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'alice@example.com',
        displayName: 'Alice',
        photoURL: null,
        createdAt: { toMillis: () => Date.now() },
        lastSeen: { toMillis: () => Date.now() },
      };

      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockUser }],
      });

      const result = await getUserByEmail('  alice@example.com  ');

      expect(result).not.toBeNull();
    });

    it('should return null for invalid inputs', async () => {
      expect(await getUserByEmail('')).toBeNull();
      expect(await getUserByEmail(null as any)).toBeNull();
      expect(await getUserByEmail(undefined as any)).toBeNull();
      expect(await getUserByEmail(123 as any)).toBeNull();
    });

    it('should handle missing photoURL', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'alice@example.com',
        displayName: 'Alice',
        // photoURL is missing
        createdAt: { toMillis: () => Date.now() },
        lastSeen: { toMillis: () => Date.now() },
      };

      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockUser }],
      });

      const result = await getUserByEmail('alice@example.com');

      expect(result?.photoURL).toBeNull();
    });

    it('should handle Firestore errors', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(getUserByEmail('alice@example.com')).rejects.toThrow(
        'Failed to look up user. Please check your connection.'
      );
    });

    it('should handle missing timestamp methods', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'alice@example.com',
        displayName: 'Alice',
        photoURL: null,
        createdAt: null,
        lastSeen: null,
      };

      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockUser }],
      });

      const result = await getUserByEmail('alice@example.com');

      expect(result).not.toBeNull();
      expect(typeof result?.createdAt).toBe('number');
      expect(typeof result?.lastSeen).toBe('number');
    });
  });

  describe('getUserIdsByEmails', () => {
    it('should return user IDs for found users', async () => {
      const mockUsers = [
        {
          uid: 'user123',
          email: 'alice@example.com',
          displayName: 'Alice',
          photoURL: null,
          createdAt: { toMillis: () => Date.now() },
          lastSeen: { toMillis: () => Date.now() },
        },
        {
          uid: 'user456',
          email: 'bob@example.com',
          displayName: 'Bob',
          photoURL: null,
          createdAt: { toMillis: () => Date.now() },
          lastSeen: { toMillis: () => Date.now() },
        },
      ];

      let callCount = 0;
      (getDocs as jest.Mock).mockImplementation(() => {
        const user = mockUsers[callCount];
        callCount++;
        return Promise.resolve({
          empty: false,
          docs: user ? [{ data: () => user }] : [],
        });
      });

      const emails = ['alice@example.com', 'bob@example.com'];
      const result = await getUserIdsByEmails(emails);

      expect(result).toEqual(['user123', 'user456']);
    });

    it('should filter out non-existent users', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'alice@example.com',
        displayName: 'Alice',
        photoURL: null,
        createdAt: { toMillis: () => Date.now() },
        lastSeen: { toMillis: () => Date.now() },
      };

      let callCount = 0;
      (getDocs as jest.Mock).mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return Promise.resolve({
            empty: false,
            docs: [{ data: () => mockUser }],
          });
        }
        callCount++;
        return Promise.resolve({ empty: true, docs: [] });
      });

      const emails = ['alice@example.com', 'nonexistent@example.com'];
      const result = await getUserIdsByEmails(emails);

      expect(result).toEqual(['user123']);
    });

    it('should return empty array for empty input', async () => {
      const result = await getUserIdsByEmails([]);
      expect(result).toEqual([]);
    });

    it('should handle invalid input', async () => {
      expect(await getUserIdsByEmails(null as any)).toEqual([]);
      expect(await getUserIdsByEmails(undefined as any)).toEqual([]);
      expect(await getUserIdsByEmails('not-an-array' as any)).toEqual([]);
    });

    it('should handle all users not found', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      });

      const emails = ['nonexistent1@example.com', 'nonexistent2@example.com'];
      const result = await getUserIdsByEmails(emails);

      expect(result).toEqual([]);
    });

    it('should handle Firestore errors', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        getUserIdsByEmails(['alice@example.com'])
      ).rejects.toThrow('Failed to look up users. Please check your connection.');
    });
  });

  describe('getUsersByEmails', () => {
    it('should return full user objects for found users', async () => {
      const mockUsers = [
        {
          uid: 'user123',
          email: 'alice@example.com',
          displayName: 'Alice',
          photoURL: null,
          createdAt: { toMillis: () => 1698765000000 },
          lastSeen: { toMillis: () => 1698765000000 },
        },
        {
          uid: 'user456',
          email: 'bob@example.com',
          displayName: 'Bob',
          photoURL: null,
          createdAt: { toMillis: () => 1698765000000 },
          lastSeen: { toMillis: () => 1698765000000 },
        },
      ];

      let callCount = 0;
      (getDocs as jest.Mock).mockImplementation(() => {
        const user = mockUsers[callCount];
        callCount++;
        return Promise.resolve({
          empty: false,
          docs: user ? [{ data: () => user }] : [],
        });
      });

      const emails = ['alice@example.com', 'bob@example.com'];
      const result = await getUsersByEmails(emails);

      expect(result).toHaveLength(2);
      expect(result[0].uid).toBe('user123');
      expect(result[0].displayName).toBe('Alice');
      expect(result[1].uid).toBe('user456');
      expect(result[1].displayName).toBe('Bob');
    });

    it('should filter out non-existent users', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'alice@example.com',
        displayName: 'Alice',
        photoURL: null,
        createdAt: { toMillis: () => Date.now() },
        lastSeen: { toMillis: () => Date.now() },
      };

      let callCount = 0;
      (getDocs as jest.Mock).mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return Promise.resolve({
            empty: false,
            docs: [{ data: () => mockUser }],
          });
        }
        callCount++;
        return Promise.resolve({ empty: true, docs: [] });
      });

      const emails = ['alice@example.com', 'nonexistent@example.com'];
      const result = await getUsersByEmails(emails);

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('user123');
    });

    it('should return empty array for empty input', async () => {
      const result = await getUsersByEmails([]);
      expect(result).toEqual([]);
    });
  });

  describe('validateEmails', () => {
    it('should separate valid and invalid emails', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'alice@example.com',
        displayName: 'Alice',
        photoURL: null,
        createdAt: { toMillis: () => Date.now() },
        lastSeen: { toMillis: () => Date.now() },
      };

      let callCount = 0;
      (getDocs as jest.Mock).mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return Promise.resolve({
            empty: false,
            docs: [{ data: () => mockUser }],
          });
        }
        callCount++;
        return Promise.resolve({ empty: true, docs: [] });
      });

      const emails = ['alice@example.com', 'nonexistent@example.com'];
      const result = await validateEmails(emails);

      expect(result.validUserIds).toEqual(['user123']);
      expect(result.notFoundEmails).toEqual(['nonexistent@example.com']);
    });

    it('should handle all valid emails', async () => {
      const mockUsers = [
        {
          uid: 'user123',
          email: 'alice@example.com',
          displayName: 'Alice',
          photoURL: null,
          createdAt: { toMillis: () => Date.now() },
          lastSeen: { toMillis: () => Date.now() },
        },
        {
          uid: 'user456',
          email: 'bob@example.com',
          displayName: 'Bob',
          photoURL: null,
          createdAt: { toMillis: () => Date.now() },
          lastSeen: { toMillis: () => Date.now() },
        },
      ];

      let callCount = 0;
      (getDocs as jest.Mock).mockImplementation(() => {
        const user = mockUsers[callCount];
        callCount++;
        return Promise.resolve({
          empty: false,
          docs: [{ data: () => user }],
        });
      });

      const emails = ['alice@example.com', 'bob@example.com'];
      const result = await validateEmails(emails);

      expect(result.validUserIds).toEqual(['user123', 'user456']);
      expect(result.notFoundEmails).toEqual([]);
    });

    it('should handle all invalid emails', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        empty: true,
        docs: [],
      });

      const emails = ['nonexistent1@example.com', 'nonexistent2@example.com'];
      const result = await validateEmails(emails);

      expect(result.validUserIds).toEqual([]);
      expect(result.notFoundEmails).toEqual([
        'nonexistent1@example.com',
        'nonexistent2@example.com',
      ]);
    });

    it('should normalize emails', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'alice@example.com',
        displayName: 'Alice',
        photoURL: null,
        createdAt: { toMillis: () => Date.now() },
        lastSeen: { toMillis: () => Date.now() },
      };

      (getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockUser }],
      });

      const emails = ['  ALICE@EXAMPLE.COM  '];
      const result = await validateEmails(emails);

      expect(result.validUserIds).toEqual(['user123']);
      expect(result.notFoundEmails).toEqual([]);
    });

    it('should return empty arrays for empty input', async () => {
      const result = await validateEmails([]);
      expect(result).toEqual({ validUserIds: [], notFoundEmails: [] });
    });

    it('should handle Firestore errors', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(validateEmails(['alice@example.com'])).rejects.toThrow(
        'Failed to validate emails. Please check your connection.'
      );
    });
  });
});

