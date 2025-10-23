/**
 * MessageBubble Component
 * Individual message bubble with memoization for performance
 * Displays message content, timestamp, status indicators, and user avatar
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../../types/message';
import { getRelativeTime } from '../../utils/messageUtils';
import { TranslationView } from './TranslationView';

interface MessageBubbleProps {
  /** Message object to display */
  message: Message;
  /** Whether this message is from the current user */
  isOwnMessage: boolean;
  /** Sender's display name (for other users' messages) */
  senderName?: string;
  /** Sender's photo URL (for other users' messages) */
  senderPhotoURL?: string;
  /** Whether to show the timestamp */
  showTimestamp?: boolean;
  /** Whether this message is grouped with the previous one */
  isGrouped?: boolean;
  /** Callback for retry button (for failed messages) */
  onRetry?: () => void;
  /** Whether the message has been read (for read receipts) */
  isRead?: boolean;
  /** Total number of participants (for group read receipts) */
  totalParticipants?: number;
  /** Callback when message is long-pressed */
  onLongPress?: () => void;
  /** Translation state for this message */
  translationState?: {
    translatedText: string | null;
    targetLanguage: string;
    isLoading: boolean;
    error: string | null;
  };
}

/**
 * MessageBubble Component
 * Memoized for performance
 */
const MessageBubble: React.FC<MessageBubbleProps> = React.memo(
  ({
    message,
    isOwnMessage,
    senderName,
    senderPhotoURL,
    showTimestamp = false,
    isGrouped = false,
    onRetry,
    isRead = false,
    totalParticipants,
    onLongPress,
    translationState,
  }) => {
    /**
     * Render message status indicator with read receipts
     */
    const renderStatusIndicator = () => {
      if (!isOwnMessage) return null;

      // Failed status takes precedence
      if (message.status === 'failed') {
        return (
          <TouchableOpacity
            style={styles.statusContainer}
            onPress={onRetry}
            activeOpacity={0.7}
          >
            <Ionicons name="alert-circle" size={14} color="#FF3B30" />
          </TouchableOpacity>
        );
      }

      // Pending status
      if (message.status === 'pending') {
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="time-outline" size={12} color="#8E8E93" />
          </View>
        );
      }

      // Read receipt: Double checkmark (blue) when read
      if (isRead) {
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="checkmark-done" size={14} color="#34C759" />
          </View>
        );
      }

      // Delivered: Double checkmark (gray)
      if (message.status === 'delivered') {
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="checkmark-done" size={14} color="#8E8E93" />
          </View>
        );
      }

      // Sent: Single checkmark (gray)
      if (message.status === 'sent') {
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="checkmark" size={14} color="#8E8E93" />
          </View>
        );
      }

      return null;
    };

    /**
     * Render group read receipt count if applicable
     */
    const renderGroupReadReceipt = () => {
      if (!isOwnMessage || !totalParticipants || totalParticipants <= 2) {
        return null; // Only show for group chats
      }

      const readCount = message.readBy?.length || 0;
      // Subtract 1 because sender is in readBy but we don't count them
      const othersReadCount = Math.max(0, readCount - 1);
      const totalOthers = totalParticipants - 1;

      if (othersReadCount === 0) {
        return null; // No one has read yet
      }

      return (
        <Text style={styles.readReceiptText}>
          Read by {othersReadCount} of {totalOthers}
        </Text>
      );
    };

    return (
      <View
        style={[
          styles.container,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
          isGrouped && styles.groupedMessage,
        ]}
      >
        {/* Avatar (for other users' messages) */}
        {!isOwnMessage && !isGrouped && (
          <View style={styles.avatarContainer}>
            {senderPhotoURL ? (
              <Image source={{ uri: senderPhotoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {senderName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Spacer for grouped messages */}
        {!isOwnMessage && isGrouped && <View style={styles.avatarSpacer} />}

        {/* Message Bubble Container */}
        <View style={styles.bubbleWrapper}>
          {/* Message Bubble */}
          <Pressable
            onLongPress={onLongPress}
            style={[
              styles.bubble,
              isOwnMessage ? styles.ownBubble : styles.otherBubble,
            ]}
          >
            {/* Message Text */}
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {message.text}
            </Text>

            {/* Timestamp and Status */}
            <View style={styles.metaContainer}>
              {showTimestamp && (
                <Text
                  style={[
                    styles.timestamp,
                    isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp,
                  ]}
                >
                  {getRelativeTime(message.timestamp)}
                </Text>
              )}
              {renderStatusIndicator()}
            </View>

            {/* Group Read Receipt */}
            {renderGroupReadReceipt()}
          </Pressable>

          {/* Translation View */}
          {translationState && (
            <TranslationView
              originalText={message.text}
              translatedText={translationState.translatedText}
              isLoading={translationState.isLoading}
              error={translationState.error}
              targetLanguage={translationState.targetLanguage}
            />
          )}
        </View>
      </View>
    );
  }
);

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  groupedMessage: {
    marginTop: 2,
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatarSpacer: {
    width: 40,
  },
  bubbleWrapper: {
    maxWidth: '70%',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E9E9EB',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#000000',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    marginRight: 4,
  },
  ownTimestamp: {
    color: '#FFFFFF',
    opacity: 0.7,
  },
  otherTimestamp: {
    color: '#8E8E93',
  },
  statusContainer: {
    marginLeft: 4,
  },
  readReceiptText: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
    fontStyle: 'italic',
  },
});

