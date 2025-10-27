/**
 * MessageComposer Component
 * 
 * Enhanced message input with AI features:
 * - Smart reply chips
 * - Real-time tone adjustment
 * - Formality adjustment modal
 * - Rephrase functionality
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToneAdjustment } from '../../hooks/useToneAdjustment';
import { toneAdjustmentService } from '../../services/ai/toneAdjustmentService';
import { SmartRepliesCarousel } from './SmartRepliesCarousel';
import ToneSuggestionChip from './ToneSuggestionChip';
import RephraseModal from './RephraseModal';

interface MessageComposerProps {
  /** Callback function when send button is pressed */
  onSend: (text: string) => Promise<void>;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Conversation ID for smart replies */
  conversationId: string;
  /** User ID for smart replies */
  userId: string;
  /** Whether smart replies are enabled */
  smartRepliesEnabled?: boolean;
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
}

/**
 * Enhanced MessageComposer with AI features
 */
export default function MessageComposer({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  conversationId,
  userId,
  smartRepliesEnabled = true,
  autoFocus = true,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [showRephraseModal, setShowRephraseModal] = useState(false);
  const [messageId, setMessageId] = useState<string | undefined>(undefined);
  const textInputRef = useRef<TextInput>(null);

  // Auto-focus on mount if enabled
  useEffect(() => {
    if (autoFocus && !disabled) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 300); // Small delay to ensure the screen is fully loaded
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  // Re-focus when disabled state changes (e.g., when conversation loads)
  useEffect(() => {
    if (autoFocus && !disabled) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [disabled, autoFocus]);

  // Smart replies are now handled by SmartRepliesCarousel component

  // Tone adjustment hook
  const {
    rephrasedText,
    loading: toneLoading,
    error: toneError,
    rephraseMessage,
    clearRephrase,
    rephraseWithRealTime,
    acceptRephrase,
    rejectRephrase,
  } = useToneAdjustment({
    enabled: false, // Real-time tone adjustment disabled
    messageId,
  });

  /**
   * Check if send button should be enabled
   */
  const canSend = text.trim().length > 0 && !disabled;

  /**
   * Handle send button press
   */
  const handleSend = async () => {
    if (!canSend) return;

    const messageText = text.trim();
    
    // Clear input immediately for better UX
    setText('');
    clearRephrase();

    try {
      await onSend(messageText);
      console.log('[MessageComposer] Message sent successfully');
      
      // Re-focus the input after sending to allow immediate typing
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('[MessageComposer] Failed to send message:', error);
      setText(messageText); // Restore text on error
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  /**
   * Handle text change with real-time tone adjustment
   */
  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
  }, []);

  /**
   * Handle smart reply selection
   */
  const handleSmartReplyPress = useCallback((reply: string) => {
    setText(reply);
    // Focus the text input to show keyboard and allow immediate editing
    // Use a small delay to ensure the text is set before focusing
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 150);
  }, []);

  /**
   * Handle rephrase button press
   */
  const handleRephrasePress = () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter some text to rephrase');
      return;
    }
    setShowRephraseModal(true);
  };

  /**
   * Handle rephrase modal rephrase action
   */
  const handleRephraseModalRephrase = async (tone: 'formal' | 'casual') => {
    try {
      console.log('[MessageComposer] Rephrasing text with tone:', tone);
      const response = await toneAdjustmentService.rephraseMessage(text, tone);
      const rephrasedText = response.rephrasedText;
      console.log('[MessageComposer] Rephrased text received:', rephrasedText);
      
      // Update the text input with the rephrased text
      setText(rephrasedText);
      
      // Close the modal
      setShowRephraseModal(false);
    } catch (error) {
      console.error('Error in rephrase modal:', error);
      Alert.alert('Error', 'Failed to rephrase message. Please try again.');
    }
  };

  /**
   * Handle tone suggestion acceptance
   */
  const handleToneAccept = useCallback((rephrasedText: string) => {
    setText(rephrasedText);
    clearRephrase();
  }, [clearRephrase]);

  /**
   * Handle tone suggestion rejection
   */
  const handleToneReject = useCallback(() => {
    clearRephrase();
  }, [clearRephrase]);

  /**
   * Handle settings toggle
   */

  // Smart replies generation is now handled by SmartRepliesCarousel component

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        {/* Smart Reply Carousel */}
        {smartRepliesEnabled && (
          <SmartRepliesCarousel
            conversationId={conversationId}
            userId={userId}
            onReplySelect={handleSmartReplyPress}
            enabled={smartRepliesEnabled}
          />
        )}


        {/* Message Input Area */}
        <View style={styles.inputContainer}>
          {/* Text Input */}
          <TextInput
            ref={textInputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#8E8E93"
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={2000}
            editable={!disabled}
            returnKeyType="default"
          />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Rephrase Button */}
            <TouchableOpacity
              style={[styles.actionButton, !text.trim() && styles.actionButtonDisabled]}
              onPress={handleRephrasePress}
              disabled={!text.trim()}
              activeOpacity={0.7}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={text.trim() ? '#007AFF' : '#C7C7CC'}
              />
            </TouchableOpacity>


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
              <Ionicons
                name="send"
                size={20}
                color={canSend ? '#FFFFFF' : '#C7C7CC'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Rephrase Modal */}
        <RephraseModal
          visible={showRephraseModal}
          originalText={text}
          onClose={() => setShowRephraseModal(false)}
          onRephrase={handleRephraseModalRephrase}
          loading={toneLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  actionButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  actionButtonDisabled: {
    opacity: 0.5,
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

export { MessageComposer };
