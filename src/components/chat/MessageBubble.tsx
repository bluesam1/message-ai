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
import { TranslationToggle } from './TranslationToggle';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

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
  /** Auto-translate preferences for the conversation */
  autoTranslatePrefs?: {
    targetLang: string;
    autoTranslate: boolean;
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
    autoTranslatePrefs,
  }) => {
    // Check if message has auto-translation
    // Only show auto-translation for messages from others (not own messages)
    const hasAutoTranslation = 
      !isOwnMessage &&
      autoTranslatePrefs?.autoTranslate &&
      autoTranslatePrefs.targetLang &&
      message.aiMeta?.translatedText?.[autoTranslatePrefs.targetLang];

    // State for showing original text modal
    // State for showing original text inline
    const [showOriginalInline, setShowOriginalInline] = React.useState(false);

    // Handle translation feedback
    const handleFeedback = async (feedback: 'positive' | 'negative') => {
      try {
        const messageRef = doc(db, 'messages', message.id);
        await updateDoc(messageRef, {
          'aiMeta.feedback': feedback,
        });
        console.log(`[MessageBubble] Saved translation feedback: ${feedback}`);
      } catch (error) {
        console.error('[MessageBubble] Error saving feedback:', error);
      }
    };

    // Handle message tap to show/hide original text inline
    const handleMessageTap = () => {
      if (hasAutoTranslation) {
        setShowOriginalInline(!showOriginalInline);
      }
    };

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

        {hasAutoTranslation && showOriginalInline ? (
          /* Full-width side-by-side layout for translated messages */
          <View style={styles.fullWidthSideBySideContainer}>
            <View style={styles.sideBySideContainer}>
              {/* Translated Message Bubble (left side) */}
              <TouchableOpacity 
                style={[styles.translatedBubble, isOwnMessage ? styles.ownTranslatedBubble : styles.otherTranslatedBubble]}
                onPress={handleMessageTap}
                activeOpacity={0.7}
              >
                <Text style={[styles.translatedText, isOwnMessage && styles.ownTranslatedText]}>
                  {message.aiMeta!.translatedText![autoTranslatePrefs!.targetLang] || 'No translated text'}
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
              </TouchableOpacity>

              {/* Original Text Container (right side) */}
              <View style={styles.originalTextContainer}>
                <View style={[styles.originalDashedContainer, isOwnMessage && styles.ownOriginalDashedContainer]}>
                  <Text style={[styles.originalText, isOwnMessage && styles.ownOriginalText]}>
                    {message.text || 'No original text'}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Globe Icon - only show when original text is NOT displayed */}
            {!showOriginalInline && (
              <TouchableOpacity
                style={styles.globeIconRight}
                onPress={handleMessageTap}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.globeEmoji}>🌐</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* Normal message bubble layout */
          <View style={styles.bubbleWrapper}>
            <Pressable
              onLongPress={onLongPress}
              onPress={hasAutoTranslation ? handleMessageTap : undefined}
              style={[
                styles.bubble,
                isOwnMessage ? styles.ownBubble : styles.otherBubble,
              ]}
            >
              {/* Message Text or Auto-Translation */}
              {hasAutoTranslation ? (
                <TranslationToggle
                  originalText={message.text}
                  translatedText={message.aiMeta!.translatedText![autoTranslatePrefs!.targetLang]}
                  targetLanguage={autoTranslatePrefs!.targetLang}
                  isOwnMessage={isOwnMessage}
                  feedback={message.aiMeta?.feedback}
                  onFeedback={handleFeedback}
                  showOriginalInline={false}
                />
              ) : (
                <Text
                  style={[
                    styles.messageText,
                    isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                  ]}
                >
                  {message.text}
                </Text>
              )}

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

            {/* Globe Icon for Auto-Translated Messages - only show when original text is NOT displayed */}
            {hasAutoTranslation && !showOriginalInline && (
              <TouchableOpacity
                style={styles.globeIconRight}
                onPress={handleMessageTap}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.globeEmoji}>🌐</Text>
              </TouchableOpacity>
            )}

          </View>
        )}
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
  fullWidthWrapper: {
    maxWidth: '100%',
  },
  fullWidthSideBySideContainer: {
    width: '100%',
    marginHorizontal: -16, // Counteract the container's paddingHorizontal: 16
    paddingHorizontal: 16, // Add back some padding for the content
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
  globeIcon: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
    width: 18,
    height: 18,
    backgroundColor: '#007AFF',
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  globeEmoji: {
    fontSize: 11,
    lineHeight: 11,
    color: '#007AFF',
  },
  globeIconRight: {
    position: 'absolute',
    top: 6,
    right: -15,
    zIndex: 10,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideBySideContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  translatedBubble: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    position: 'relative',
    minHeight: 40,
    minWidth: 100,
  },
  otherTranslatedBubble: {
    backgroundColor: '#F1F1F1',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  ownTranslatedBubble: {
    backgroundColor: '#007AFF',
  },
  translatedText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#000',
  },
  ownTranslatedText: {
    color: '#FFFFFF',
  },
  originalTextContainer: {
    flex: 1,
    minHeight: 40,
    minWidth: 100,
  },
  originalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
    marginLeft: 4,
  },
  originalDashedContainer: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#999',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  ownOriginalDashedContainer: {
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  originalText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#000',
  },
  ownOriginalText: {
    color: '#FFFFFF',
  },
});

