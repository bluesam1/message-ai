/**
 * New Chat Screen
 * Modal screen for selecting a user to start a conversation with
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuth } from '../src/store/AuthContext';
import UserPicker from '../src/components/users/UserPicker';
import { User } from '../src/types/user';
import { findOrCreateConversation } from '../src/services/messaging/conversationService';
import { initDatabase } from '../src/services/sqlite/sqliteService';

export default function NewChatScreen() {
  const { user } = useAuth();

  /**
   * Initialize database on mount
   */
  useEffect(() => {
    initDatabase().catch((err) => {
      console.error('[NewChat] Failed to initialize database:', err);
    });
  }, []);

  /**
   * Handle user selection
   * Creates or finds conversation and navigates to chat screen
   */
  const handleUserSelect = async (selectedUser: User) => {
    if (!user) return;

    try {
      // Find or create conversation
      const conversation = await findOrCreateConversation(user.uid, selectedUser.uid);

      // Navigate to chat screen
      router.replace(`/chat/${conversation.id}`);
    } catch (error) {
      console.error('[NewChat] Error creating conversation:', error);
      alert('Failed to start conversation. Please try again.');
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Chat',
          presentation: 'modal',
          headerLeft: () => (
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {user && (
          <UserPicker
            currentUserId={user.uid}
            onUserSelect={handleUserSelect}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    color: '#007AFF',
    fontSize: 17,
  },
});

