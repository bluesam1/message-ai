/**
 * MessageBubble Component
 * Individual message bubble with memoization for performance
 * Displays message content, timestamp, status indicators, and user avatar
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../../types/message';
import { getRelativeTime } from '../../utils/messageUtils';

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
  }) => {
    /**
     * Render message status indicator
     */
    const renderStatusIndicator = () => {
      if (!isOwnMessage) return null;

      switch (message.status) {
        case 'pending':
          return (
            <View style={styles.statusContainer}>
              <Ionicons name="time-outline" size={12} color="#8E8E93" />
            </View>
          );
        case 'sent':
          return (
            <View style={styles.statusContainer}>
              <Ionicons name="checkmark" size={14} color="#8E8E93" />
            </View>
          );
        case 'delivered':
          return (
            <View style={styles.statusContainer}>
              <Ionicons name="checkmark-done" size={14} color="#8E8E93" />
            </View>
          );
        case 'failed':
          return (
            <TouchableOpacity
              style={styles.statusContainer}
              onPress={onRetry}
              activeOpacity={0.7}
            >
              <Ionicons name="alert-circle" size={14} color="#FF3B30" />
            </TouchableOpacity>
          );
        default:
          return null;
      }
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

        {/* Message Bubble */}
        <View
          style={[
            styles.bubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          {/* Sender Name (for other users' messages, if not grouped) */}
          {!isOwnMessage && !isGrouped && senderName && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}

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
    maxWidth: '70%',
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
});

