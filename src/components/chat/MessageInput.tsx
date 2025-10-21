/**
 * MessageInput Component
 * Text input field with send button for composing messages
 * Implements optimistic UI updates and handles send errors
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageInputProps {
  /** Callback function when send button is pressed */
  onSend: (text: string) => Promise<void>;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * MessageInput Component
 * Text input with send button
 */
export default function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  /**
   * Check if send button should be enabled
   */
  const canSend = text.trim().length > 0 && !sending && !disabled;

  /**
   * Handle send button press
   */
  const handleSend = async () => {
    if (!canSend) return;

    const messageText = text.trim();
    setSending(true);

    try {
      // Clear input immediately for better UX
      setText('');

      // Send message
      await onSend(messageText);
    } catch (error) {
      console.error('[MessageInput] Failed to send message:', error);

      // Restore text on error
      setText(messageText);

      // Show error to user
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  /**
   * Handle text change
   */
  const handleTextChange = (newText: string) => {
    setText(newText);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        {/* Text Input */}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={2000}
          editable={!disabled && !sending}
          returnKeyType="default"
        />

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={canSend ? '#FFFFFF' : '#C7C7CC'}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    fontSize: 16,
    color: '#000000',
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
});

