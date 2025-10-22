/**
 * MessageList Component
 * Performance-optimized FlatList for displaying messages
 * Implements inverted list with efficient rendering
 */

import React, { useRef, useEffect } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { Message } from '../../types/message';
import { shouldGroupMessages } from '../../utils/messageUtils';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  /** Array of messages to display */
  messages: Message[];
  /** Current user ID */
  currentUserId: string;
  /** Whether messages are loading */
  loading?: boolean;
  /** Callback for loading older messages (pull to refresh) */
  onLoadMore?: () => void;
  /** Callback for retrying failed messages */
  onRetryMessage?: (message: Message) => void;
  /** Map of user IDs to display names */
  userNames?: Record<string, string>;
  /** Map of user IDs to photo URLs */
  userPhotoURLs?: Record<string, string>;
  /** Total number of participants (for group read receipts) */
  totalParticipants?: number;
}

/**
 * MessageList Component
 * Optimized FlatList with inverted rendering
 */
export default function MessageList({
  messages,
  currentUserId,
  loading = false,
  onLoadMore,
  onRetryMessage,
  userNames = {},
  userPhotoURLs = {},
  totalParticipants,
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);

  /**
   * Scroll to bottom when new message is added
   */
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure render is complete
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: 0,
          animated: true,
        });
      }, 100);
    }
  }, [messages.length]);

  /**
   * Render a single message item
   */
  const renderMessageItem = ({ item, index }: ListRenderItemInfo<Message>) => {
    const isOwnMessage = item.senderId === currentUserId;
    const previousMessage = index < messages.length - 1 ? messages[index + 1] : null;

    // Check if this message should be grouped with the previous one
    const isGrouped = previousMessage
      ? shouldGroupMessages(
          item.senderId,
          item.timestamp,
          previousMessage.senderId,
          previousMessage.timestamp
        )
      : false;

    // Get sender info for other users' messages
    const senderName = !isOwnMessage ? userNames[item.senderId] : undefined;
    const senderPhotoURL = !isOwnMessage
      ? userPhotoURLs[item.senderId]
      : undefined;
    
    // Debug logging for sender info
    if (!isOwnMessage && index === 0) {
      console.log('[MessageList] Sender info debug:', {
        senderId: item.senderId,
        senderName,
        senderPhotoURL,
        availableUserNames: Object.keys(userNames),
        availablePhotoURLs: Object.keys(userPhotoURLs),
      });
    }

    // Calculate read status for read receipts
    // For direct chats: Check if the other user has read (readBy includes them)
    // For group chats: Check if at least one other person has read
    const readBy = item.readBy || [];
    const isRead = totalParticipants && totalParticipants > 2
      ? readBy.length > 1 // Group: More than just sender
      : readBy.some(uid => uid !== currentUserId); // Direct: Other person has read

    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        senderName={senderName}
        senderPhotoURL={senderPhotoURL}
        showTimestamp={true}
        isGrouped={isGrouped}
        onRetry={() => onRetryMessage?.(item)}
        isRead={isRead}
        totalParticipants={totalParticipants}
      />
    );
  };

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = (item: Message) => item.id;

  /**
   * Get item layout for performance optimization
   * This helps FlatList calculate scroll position more efficiently
   */
  const getItemLayout = (data: ArrayLike<Message> | null | undefined, index: number) => {
    const AVERAGE_ITEM_HEIGHT = 60; // Approximate average height
    return {
      length: AVERAGE_ITEM_HEIGHT,
      offset: AVERAGE_ITEM_HEIGHT * index,
      index,
    };
  };

  /**
   * Render empty state
   */
  const renderEmptyComponent = () => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyState}>
        {/* Empty state could be added here */}
      </View>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessageItem}
      keyExtractor={keyExtractor}
      inverted
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      // Performance optimizations
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={20}
      updateCellsBatchingPeriod={50}
      getItemLayout={getItemLayout}
      // Pull to refresh for loading older messages
      refreshControl={
        onLoadMore ? (
          <RefreshControl
            refreshing={loading}
            onRefresh={onLoadMore}
            tintColor="#007AFF"
          />
        ) : undefined
      }
      ListEmptyComponent={renderEmptyComponent}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});

