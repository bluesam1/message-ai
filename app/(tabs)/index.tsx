/**
 * Conversations Screen
 * Displays list of user's conversations with real-time last message fetching
 * Uses the new LastMessageService for personalized translations
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
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Unsubscribe } from 'firebase/firestore';
import { useAuth } from '../../src/store/AuthContext';
import { getUserConversations, enrichConversationsWithUserData } from '../../src/services/messaging/conversationService';
import { getLastMessagePreviews, LastMessagePreview } from '../../src/services/messaging/lastMessageService';
import { ConversationWithParticipants } from '../../src/types/message';
import { getRelativeTime } from '../../src/utils/messageUtils';
import { User } from '../../src/types/user';
import { useCurrentTime } from '../../src/hooks/useCurrentTime';
import PresenceIndicator from '../../src/components/users/PresenceIndicator';

export default function ConversationsScreen() {
  const { user } = useAuth();
  const currentTime = useCurrentTime(); // Updates every second for dynamic relative times
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastMessagePreviews, setLastMessagePreviews] = useState<{ [conversationId: string]: LastMessagePreview }>({});
  const [unsubscribe, setUnsubscribe] = useState<Unsubscribe | null>(null);

  /**
   * Fetch last message previews for all conversations
   */
  const fetchLastMessagePreviews = async (convs: ConversationWithParticipants[]) => {
    if (!user?.uid) {
      console.log('[Conversations] No user, skipping last message previews');
      return;
    }

    console.log('[Conversations] 🔄 Fetching last message previews for', convs.length, 'conversations');
    
    try {
      const conversationIds = convs.map(conv => conv.id);
      console.log('[Conversations] 📋 Conversation IDs:', conversationIds);
      
      const previews = await getLastMessagePreviews(conversationIds, user.uid);
      
      console.log('[Conversations] 📊 Preview results:', {
        totalConversations: convs.length,
        previewsFound: Object.keys(previews).length,
        allConversationIds: Object.keys(previews)
      });
      
      setLastMessagePreviews(prev => ({ ...prev, ...previews }));
      console.log('[Conversations] ✅ Updated last message previews');
      
    } catch (error) {
      console.error('[Conversations] ❌ Error fetching last message previews:', error);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Re-fetch last message previews for current conversations
      if (user?.uid && conversations.length > 0) {
        await fetchLastMessagePreviews(conversations);
      }
    } catch (err) {
      console.error('[Conversations] Error refreshing:', err);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Setup conversation listener
   */
  const setupListener = async () => {
    if (!user?.uid) return;

    try {
      console.log('[Conversations] 🔧 Setting up conversation listener for user:', user.uid);
      const unsubscribe = await getUserConversations(user.uid, async (convs) => {
        console.log('[Conversations] 📨 Received conversation update:', {
          count: convs.length,
          conversations: convs.map(c => ({
            id: c.id,
            lastMessageTime: c.lastMessageTime,
            hasAiPrefs: !!c.aiPrefs,
            participants: c.participants,
            type: c.type
          })),
          timestamp: new Date().toISOString()
        });
        
        // Enrich conversations with user data
        const enriched = await enrichConversationsWithUserData(convs, user.uid);
        setConversations(enriched);
        
        // Fetch last message previews for all conversations
        console.log('[Conversations] 🔄 Calling fetchLastMessagePreviews with', enriched.length, 'conversations');
        await fetchLastMessagePreviews(enriched);
        
        setLoading(false);
      });
      
      setUnsubscribe(() => unsubscribe);
    } catch (err) {
      console.error('[Conversations] Error setting up listener:', err);
      setError('Failed to load conversations');
      setLoading(false);
    }
  };

  /**
   * Cleanup listener on unmount
   */
  useEffect(() => {
    return () => {
      if (unsubscribe) {
        console.log('[Conversations] 🧹 Cleaning up conversation listener');
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  /**
   * Setup listener when user changes
   */
  useEffect(() => {
    if (user?.uid) {
      setupListener();
    }
  }, [user?.uid]);

  /**
   * Render conversation item
   */
  const renderConversationItem = ({ item }: { item: ConversationWithParticipants }) => {
    const isGroup = item.type === 'group';
    const displayName = isGroup ? (item.groupName || 'Group') : (item.otherParticipantName || 'Unknown');
    const photoURL = isGroup ? item.groupPhoto : item.otherParticipantPhotoURL;
    const timeAgo = getRelativeTime(item.lastMessageTime, currentTime);
    const memberCount = item.participantNames?.length || 0;
    
    // Check if auto-translate is enabled for this conversation
    const hasAutoTranslate = user?.uid && item.aiPrefs?.[user.uid]?.autoTranslate;
    
    // Get the last message preview
    const lastMessagePreview = lastMessagePreviews[item.id];
    const lastMessageText = lastMessagePreview?.text || 'No messages yet';
    const isTranslated = lastMessagePreview?.isTranslated || false;
    
    console.log(`[Conversations] Rendering conversation ${item.id}:`, {
      displayName,
      lastMessageText,
      isTranslated,
      hasAutoTranslate,
      timeAgo
    });

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        {/* Profile Photo */}
        <View style={styles.photoContainer}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.defaultPhoto}>
              <Text style={styles.defaultPhotoText}>
                {isGroup ? 'G' : (displayName.charAt(0).toUpperCase())}
              </Text>
            </View>
          )}
        </View>

        {/* Conversation Info */}
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <View style={styles.displayNameRow}>
              <Text style={styles.displayName}>{displayName}</Text>
              {hasAutoTranslate && (
                <Text style={styles.globeIcon}>🌐</Text>
              )}
            </View>
            {timeAgo && <Text style={styles.timestamp}>{timeAgo}</Text>}
          </View>
          
          {/* Presence indicator for direct chats */}
          {!isGroup && item.otherParticipantId && (
            <View style={styles.presenceRow}>
              <PresenceIndicator 
                userId={item.otherParticipantId} 
                showText={true}
                size="small"
              />
            </View>
          )}
          
          {/* Member count for group chats */}
          {isGroup && (
            <Text style={styles.memberCount}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
          )}
          
          {/* Last message */}
          <Text style={styles.lastMessage} numberOfLines={1} ellipsizeMode="tail">
            {lastMessageText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        style={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Start a new chat to get started!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  list: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  photoContainer: {
    marginRight: 12,
  },
  profilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultPhotoText: {
    color: '#fff',
    fontSize: 20,
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
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    flex: 1,
  },
  globeIcon: {
    fontSize: 14,
    marginLeft: 6,
  },
  timestamp: {
    fontSize: 12,
    color: '#8e8e93',
    marginLeft: 8,
  },
  presenceRow: {
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8e8e93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
  },
});
