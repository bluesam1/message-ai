/**
 * New Chat Screen
 * Dynamic screen for creating individual or group conversations
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Switch } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/store/AuthContext';
import UserPicker from '../src/components/users/UserPicker';
import GroupCreation from '../src/components/chat/GroupCreation';
import { User } from '../src/types/user';
import { findOrCreateConversation } from '../src/services/messaging/conversationService';
import { initDatabase } from '../src/services/sqlite/sqliteService';

export default function NewChatScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [isGroup, setIsGroup] = useState(params.type === 'group');

  /**
   * Initialize database on mount
   */
  useEffect(() => {
    initDatabase().catch((err) => {
      console.error('[NewChat] Failed to initialize database:', err);
    });
  }, []);

  /**
   * Handle user selection for individual chat
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
        {/* Chat Type Selection */}
        <View style={styles.selectionSection}>
          <Text style={styles.selectionTitle}>Choose Chat Type</Text>
          <View style={styles.optionButtons}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                !isGroup && styles.optionButtonSelected
              ]}
              onPress={() => {
                router.replace('/new-chat?type=individual');
              }}
            >
              <Text style={[
                styles.optionButtonText,
                !isGroup && styles.optionButtonTextSelected
              ]}>
                Individual Chat
              </Text>
              <Text style={[
                styles.optionButtonSubtext,
                !isGroup && styles.optionButtonSubtextSelected
              ]}>
                Start a private conversation
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.optionButton,
                isGroup && styles.optionButtonSelected
              ]}
              onPress={() => {
                router.replace('/new-chat?type=group');
              }}
            >
              <Text style={[
                styles.optionButtonText,
                isGroup && styles.optionButtonTextSelected
              ]}>
                Group Chat
              </Text>
              <Text style={[
                styles.optionButtonSubtext,
                isGroup && styles.optionButtonSubtextSelected
              ]}>
                Create a group conversation
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Content */}
        {isGroup ? (
          <GroupCreation onCancel={() => {
            router.replace('/new-chat?type=individual');
          }} />
        ) : (
          user && (
            <UserPicker
              currentUserId={user.uid}
              onUserSelect={handleUserSelect}
            />
          )
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
  selectionSection: {
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    marginHorizontal: 6,
    minHeight: 80,
    justifyContent: 'center',
    // Android-specific fixes
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    elevation: 4,
    shadowOpacity: 0.2,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
    textAlign: 'center',
    // Android text rendering fix
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  optionButtonSubtext: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  optionButtonSubtextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

