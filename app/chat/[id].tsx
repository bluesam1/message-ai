/**
 * Chat Screen
 * Individual conversation screen for sending and receiving messages
 * Displays messages in real-time with optimistic updates
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAuth } from '../../src/store/AuthContext';
import useMessages from '../../src/hooks/useMessages';
import useConversation from '../../src/hooks/useConversation';
import MessageList from '../../src/components/chat/MessageList';
import MessageInput from '../../src/components/chat/MessageInput';
import OfflineBanner from '../../src/components/chat/OfflineBanner';
import GroupInfo from '../../src/components/chat/GroupInfo';
import { initDatabase } from '../../src/services/sqlite/sqliteService';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Initialize database on mount
  useEffect(() => {
    initDatabase().catch((err) => {
      console.error('[ChatScreen] Failed to initialize database:', err);
    });
  }, []);

  // Load conversation and messages
  const { conversation, otherParticipant, participants, loading: conversationLoading } = useConversation(
    id || '',
    user?.uid || ''
  );
  const {
    messages,
    loading: messagesLoading,
    sendMessage,
    retryMessage,
    loadMore,
  } = useMessages(id || '', user?.uid || '');

  // Handle send message
  const handleSendMessage = async (text: string) => {
    await sendMessage(text);
  };

  // Determine if this is a group conversation
  const isGroup = conversation?.type === 'group';
  
  // Get header title and subtitle
  const headerTitle = isGroup 
    ? (conversation?.groupName || 'Group Chat')
    : (otherParticipant?.displayName || 'Chat');
  
  const headerSubtitle = isGroup && conversation
    ? `${conversation.participants.length} ${conversation.participants.length === 1 ? 'member' : 'members'}`
    : (otherParticipant?.email || null);

  return (
    <>
      <Stack.Screen
        options={{
          headerBackTitle: 'Back',
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {headerTitle || 'Chat'}
              </Text>
              {headerSubtitle ? (
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {headerSubtitle}
                </Text>
              ) : null}
            </View>
          ),
          headerRight: isGroup
            ? () => (
                <TouchableOpacity
                  onPress={() => setShowGroupInfo(true)}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonText}>ⓘ</Text>
                </TouchableOpacity>
              )
            : undefined,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Offline Banner */}
        <OfflineBanner />

        {/* Message List */}
        <MessageList
          messages={messages}
          currentUserId={user?.uid || ''}
          loading={messagesLoading}
          onLoadMore={loadMore}
          onRetryMessage={retryMessage}
          userNames={Object.fromEntries(
            Object.entries(participants).map(([uid, user]) => [uid, user.displayName])
          )}
          userPhotoURLs={Object.fromEntries(
            Object.entries(participants).map(([uid, user]) => [uid, user.photoURL || ''])
          )}
        />

        {/* Message Input */}
        <MessageInput
          onSend={handleSendMessage}
          disabled={conversationLoading || !user}
        />
      </KeyboardAvoidingView>

      {/* Group Info Modal */}
      {isGroup && conversation && (
        <GroupInfo
          conversation={conversation}
          currentUserId={user?.uid || ''}
          visible={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 250,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    textAlign: 'center',
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 20,
    color: '#007AFF',
  },
});

