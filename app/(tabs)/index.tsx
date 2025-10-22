/**
 * Conversations Screen
 * Displays list of user's conversations
 * Allows starting new chats
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Unsubscribe } from 'firebase/firestore';
import { useAuth } from '../../src/store/AuthContext';
import { getUserConversations } from '../../src/services/messaging/conversationService';
import { ConversationWithParticipants } from '../../src/types/message';
import { getRelativeTime } from '../../src/utils/messageUtils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { User } from '../../src/types/user';
import { initDatabase } from '../../src/services/sqlite/sqliteService';

export default function ConversationsScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize database on mount
   */
  useEffect(() => {
    initDatabase().catch((err) => {
      console.error('[Conversations] Failed to initialize database:', err);
    });
  }, []);

  /**
   * Load user information for conversations
   */
  const enrichConversationsWithUserData = async (
    convs: ConversationWithParticipants[]
  ): Promise<ConversationWithParticipants[]> => {
    const enriched = await Promise.all(
      convs.map(async (conv) => {
        if (conv.type === 'direct' && user) {
          // Get the other participant's ID
          const otherParticipantId = conv.participants.find((id) => id !== user.uid);
          
          if (otherParticipantId) {
            try {
              // Fetch other participant's data
              const usersRef = collection(db, 'users');
              const userQuery = query(usersRef, where('uid', '==', otherParticipantId));
              const userSnapshot = await getDocs(userQuery);
              
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data() as User;
                return {
                  ...conv,
                  otherParticipantId,
                  otherParticipantName: userData.displayName || 'Unknown User',
                  otherParticipantPhotoURL: userData.photoURL || null,
                };
              }
            } catch (err) {
              console.error('[Conversations] Error fetching user data:', err);
            }
          }
        }
        
        return conv;
      })
    );
    
    return enriched;
  };

  /**
   * Set up conversations listener
   */
  useEffect(() => {
    if (!user) return;

    let unsubscribe: Unsubscribe | null = null;

    const setupListener = async () => {
      try {
        unsubscribe = await getUserConversations(user.uid, async (convs) => {
          const enriched = await enrichConversationsWithUserData(convs);
          setConversations(enriched);
          setLoading(false);
        });
      } catch (err) {
        console.error('[Conversations] Error setting up listener:', err);
        setError('Failed to load conversations');
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  /**
   * Navigate to chat screen
   */
  const openChat = (conversation: ConversationWithParticipants) => {
    router.push(`/chat/${conversation.id}`);
  };

  /**
   * Navigate to new chat screen
   */
  const startNewChat = () => {
    router.push('/new-chat');
  };

  /**
   * Navigate to new group screen
   */
  const startNewGroup = () => {
    router.push('/new-group');
  };

  /**
   * Render a conversation item
   */
  const renderConversationItem = ({ item }: { item: ConversationWithParticipants }) => {
    const isGroup = item.type === 'group';
    const displayName = isGroup 
      ? (item.groupName || 'Unnamed Group')
      : (item.otherParticipantName || 'Unknown User');
    const photoURL = isGroup ? item.groupPhoto : item.otherParticipantPhotoURL;
    const timeAgo = item.lastMessageTime ? getRelativeTime(item.lastMessageTime) : '';
    const memberCount = isGroup ? item.participants.length : 0;

    // Group avatar shows first letter of group name, with different color
    const avatarStyle = isGroup 
      ? [styles.avatar, styles.groupAvatarPlaceholder] 
      : [styles.avatar, styles.avatarPlaceholder];

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => openChat(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={avatarStyle}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Conversation Info */}
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.displayName}>{displayName}</Text>
            {timeAgo && <Text style={styles.timestamp}>{timeAgo}</Text>}
          </View>
          
          {/* Member count for groups */}
          {isGroup && (
            <Text style={styles.memberCount}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
          )}
          
          {/* Last message */}
          {item.lastMessage && (
            <Text style={styles.lastMessage} numberOfLines={1} ellipsizeMode="tail">
              {item.lastMessage}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.emptyText}>Loading conversations...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.emptySubtitle}>
          Tap the + button to start a new chat
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          conversations.length === 0 ? styles.emptyListContent : undefined
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.newGroupButton}
          onPress={startNewGroup}
          activeOpacity={0.8}
        >
          <Text style={styles.newGroupButtonText}>👥</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={startNewChat}
          activeOpacity={0.8}
        >
          <Text style={styles.newChatButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  emptyListContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarPlaceholder: {
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
  memberCount: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  actionButtons: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    flexDirection: 'column',
    gap: 12,
  },
  newChatButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  newChatButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
  },
  newGroupButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  newGroupButtonText: {
    fontSize: 24,
  },
});
