/**
 * Tests for conversationService
 * Tests conversation creation and management
 */

import conversationService, {
  createGroup,
  addMembersToGroup,
  getConversationById,
} from '../../src/services/messaging/conversationService';
import * as userLookup from '../../src/utils/userLookup';
import * as groupValidation from '../../src/utils/groupValidation';
import { getDocs, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import * as sqliteService from '../../src/services/sqlite/sqliteService';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  Timestamp: {
    fromMillis: (ms: number) => ({ toMillis: () => ms }),
  },
  arrayUnion: jest.fn((...items) => items),
}));

// Mock Firebase config
jest.mock('../../src/config/firebase', () => ({
  db: {},
}));

// Mock SQLite service
jest.mock('../../src/services/sqlite/sqliteService', () => ({
  saveConversation: jest.fn(),
  getConversation: jest.fn(),
  getConversations: jest.fn(),
  updateConversationLastMessage: jest.fn(),
  deleteConversation: jest.fn(),
}));

// Mock user lookup
jest.mock('../../src/utils/userLookup');

// Mock group validation
jest.mock('../../src/utils/groupValidation');

describe('conversationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exports', () => {
    it('should export findOrCreateConversation function', () => {
      expect(conversationService.findOrCreateConversation).toBeDefined();
      expect(typeof conversationService.findOrCreateConversation).toBe('function');
    });

    it('should export getConversationById function', () => {
      expect(conversationService.getConversationById).toBeDefined();
      expect(typeof conversationService.getConversationById).toBe('function');
    });

    it('should export getUserConversations function', () => {
      expect(conversationService.getUserConversations).toBeDefined();
      expect(typeof conversationService.getUserConversations).toBe('function');
    });

    it('should export updateConversationLastMessage function', () => {
      expect(conversationService.updateConversationLastMessage).toBeDefined();
      expect(typeof conversationService.updateConversationLastMessage).toBe('function');
    });

    it('should export deleteConversation function', () => {
      expect(conversationService.deleteConversation).toBeDefined();
      expect(typeof conversationService.deleteConversation).toBe('function');
    });

    it('should export createGroup function', () => {
      expect(conversationService.createGroup).toBeDefined();
      expect(typeof conversationService.createGroup).toBe('function');
    });

    it('should export addMembersToGroup function', () => {
      expect(conversationService.addMembersToGroup).toBeDefined();
      expect(typeof conversationService.addMembersToGroup).toBe('function');
    });
  });

  describe('function signatures', () => {
    it('findOrCreateConversation should accept two user IDs', () => {
      expect(conversationService.findOrCreateConversation.length).toBe(2);
    });

    it('getConversationById should accept conversationId', () => {
      expect(conversationService.getConversationById.length).toBe(1);
    });

    it('getUserConversations should accept userId and callback', () => {
      expect(conversationService.getUserConversations.length).toBe(2);
    });

    it('updateConversationLastMessage should accept conversationId, lastMessage, and timestamp', () => {
      expect(conversationService.updateConversationLastMessage.length).toBe(3);
    });

    it('createGroup should accept groupName, participantEmails, and creatorId', () => {
      expect(conversationService.createGroup.length).toBe(3);
    });

    it('addMembersToGroup should accept conversationId and newMemberEmails', () => {
      expect(conversationService.addMembersToGroup.length).toBe(2);
    });
  });

  describe('createGroup', () => {
    beforeEach(() => {
      (groupValidation.validateGroupName as jest.Mock).mockReturnValue({ valid: true });
      (groupValidation.validateMinimumParticipants as jest.Mock).mockReturnValue({
        valid: true,
      });
      (userLookup.getUserIdsByEmails as jest.Mock).mockResolvedValue([
        'user456',
        'user789',
      ]);
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      (sqliteService.saveConversation as jest.Mock).mockResolvedValue(undefined);
    });

    it('should create group with valid inputs', async () => {
      const result = await createGroup(
        'Team Project',
        ['alice@example.com', 'bob@example.com'],
        'user123'
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('group');
      expect(result.groupName).toBe('Team Project');
      expect(result.createdBy).toBe('user123');
      expect(result.participants).toContain('user123');
      expect(result.participants).toContain('user456');
      expect(result.participants).toContain('user789');
    });

    it('should validate group name', async () => {
      (groupValidation.validateGroupName as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Group name is required',
      });

      await expect(
        createGroup('', ['alice@example.com'], 'user123')
      ).rejects.toThrow('Group name is required');
    });

    it('should throw error if users not found', async () => {
      (userLookup.getUserIdsByEmails as jest.Mock).mockResolvedValue(['user456']); // Only 1 user found

      await expect(
        createGroup('Team', ['alice@example.com', 'bob@example.com'], 'user123')
      ).rejects.toThrow('One or more users not found');
    });

    it('should throw error for insufficient participants', async () => {
      (userLookup.getUserIdsByEmails as jest.Mock).mockResolvedValue([]); // No participants
      (groupValidation.validateMinimumParticipants as jest.Mock).mockReturnValue({
        valid: false,
        error: 'Group must have at least 2 members',
      });

      await expect(
        createGroup('Team', [], 'user123')
      ).rejects.toThrow();
    });

    it('should handle duplicate participants', async () => {
      (userLookup.getUserIdsByEmails as jest.Mock).mockResolvedValue([
        'user123',
        'user456',
      ]); // Creator already in list

      const result = await createGroup(
        'Team Project',
        ['user123@example.com', 'alice@example.com'],
        'user123'
      );

      // Should deduplicate
      const uniqueCount = new Set(result.participants).size;
      expect(uniqueCount).toBe(result.participants.length);
    });

    it('should trim group name', async () => {
      const result = await createGroup(
        '  Team Project  ',
        ['alice@example.com', 'bob@example.com'],
        'user123'
      );

      expect(result.groupName).toBe('Team Project');
    });
  });

  describe('addMembersToGroup', () => {
    const mockConversation = {
      id: 'conv_123',
      participants: ['user123', 'user456'],
      type: 'group' as const,
      groupName: 'Team Project',
      groupPhoto: null,
      createdBy: 'user123',
      lastMessage: '',
      lastMessageTime: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    beforeEach(() => {
      (sqliteService.getConversation as jest.Mock).mockResolvedValue(mockConversation);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'conv_123',
        data: () => ({
          ...mockConversation,
          lastMessageTime: { toMillis: () => mockConversation.lastMessageTime },
          createdAt: { toMillis: () => mockConversation.createdAt },
          updatedAt: { toMillis: () => mockConversation.updatedAt },
        }),
      });
      (userLookup.getUserIdsByEmails as jest.Mock).mockResolvedValue(['user789']);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (sqliteService.saveConversation as jest.Mock).mockResolvedValue(undefined);
    });

    it('should add members to group successfully', async () => {
      await addMembersToGroup('conv_123', ['charlie@example.com']);

      expect(updateDoc).toHaveBeenCalled();
      expect(sqliteService.saveConversation).toHaveBeenCalled();
    });

    it('should throw error if conversation not found', async () => {
      (sqliteService.getConversation as jest.Mock).mockResolvedValue(null);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      await expect(
        addMembersToGroup('conv_999', ['charlie@example.com'])
      ).rejects.toThrow('Conversation not found');
    });

    it('should throw error if not a group conversation', async () => {
      (sqliteService.getConversation as jest.Mock).mockResolvedValue({
        ...mockConversation,
        type: 'direct',
      });
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ ...mockConversation, type: 'direct' }),
      });

      await expect(
        addMembersToGroup('conv_123', ['charlie@example.com'])
      ).rejects.toThrow('Can only add members to group conversations');
    });

    it('should throw error if users not found', async () => {
      (userLookup.getUserIdsByEmails as jest.Mock).mockResolvedValue([]); // No users found

      await expect(
        addMembersToGroup('conv_123', ['invalid@example.com'])
      ).rejects.toThrow('One or more users not found');
    });

    it('should throw error for duplicate members', async () => {
      (userLookup.getUserIdsByEmails as jest.Mock).mockResolvedValue(['user456']); // Already in group

      await expect(
        addMembersToGroup('conv_123', ['alice@example.com'])
      ).rejects.toThrow('One or more users are already in the group');
    });

    it('should handle multiple new members', async () => {
      // Create fresh mock conversation without mutations from previous tests
      const freshMockConversation = {
        id: 'conv_123',
        participants: ['user123', 'user456'], // Only original members
        type: 'group' as const,
        groupName: 'Team Project',
        groupPhoto: null,
        createdBy: 'user123',
        lastMessage: '',
        lastMessageTime: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (sqliteService.getConversation as jest.Mock).mockResolvedValue(freshMockConversation);
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'conv_123',
        data: () => ({
          ...freshMockConversation,
          lastMessageTime: { toMillis: () => freshMockConversation.lastMessageTime },
          createdAt: { toMillis: () => freshMockConversation.createdAt },
          updatedAt: { toMillis: () => freshMockConversation.updatedAt },
        }),
      });

      (userLookup.getUserIdsByEmails as jest.Mock).mockResolvedValue([
        'user789',
        'user999',
      ]);

      await addMembersToGroup('conv_123', [
        'charlie@example.com',
        'david@example.com',
      ]);

      expect(updateDoc).toHaveBeenCalled();
    });
  });
});

// Integration tests would require:
// - Mocking Firestore queries
// - Testing findOrCreateConversation logic (finding existing vs creating new)
// - Testing participant sorting for consistent conversation IDs
// - Testing real-time listener setup
// - Testing cache-first strategy
// - Testing conversation updates
// - Testing participant data enrichment

