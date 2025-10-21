/**
 * Chat Screen
 * Individual conversation screen for sending and receiving messages
 * Displays messages in real-time with optimistic updates
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAuth } from '../../src/store/AuthContext';
import useMessages from '../../src/hooks/useMessages';
import useConversation from '../../src/hooks/useConversation';
import MessageList from '../../src/components/chat/MessageList';
import MessageInput from '../../src/components/chat/MessageInput';
import OfflineBanner from '../../src/components/chat/OfflineBanner';
import { initDatabase } from '../../src/services/sqlite/sqliteService';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  // Initialize database on mount
  useEffect(() => {
    initDatabase().catch((err) => {
      console.error('[ChatScreen] Failed to initialize database:', err);
    });
  }, []);

  // Load conversation and messages
  const { otherParticipant, loading: conversationLoading } = useConversation(
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

  // Get header title
  const headerTitle = otherParticipant?.displayName || 'Chat';

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerBackTitle: 'Back',
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
          userNames={{
            [otherParticipant?.uid || '']: otherParticipant?.displayName || 'Unknown',
          }}
          userPhotoURLs={{
            [otherParticipant?.uid || '']: otherParticipant?.photoURL || '',
          }}
        />

        {/* Message Input */}
        <MessageInput
          onSend={handleSendMessage}
          disabled={conversationLoading || !user}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

