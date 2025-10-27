/**
 * Simplified smart replies component with chip-style suggestions
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator
} from 'react-native';
import { useSmartReplies } from '../../hooks/useSmartReplies';

interface SmartRepliesCarouselProps {
  conversationId: string;
  userId: string;
  onReplySelect: (reply: string) => void;
  enabled?: boolean;
  style?: any;
}

export function SmartRepliesCarousel({
  conversationId,
  userId,
  onReplySelect,
  enabled = true,
  style
}: SmartRepliesCarouselProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    replies,
    loading,
    error,
    hasReplies,
    manualRefresh
  } = useSmartReplies({
    conversationId,
    userId,
    enabled
  });

  // Animate in when replies are loaded
  useEffect(() => {
    if (hasReplies && !loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [hasReplies, loading, fadeAnim]);

  const handleReplyPress = (reply: string) => {
    onReplySelect(reply);
  };

  if (!enabled) {
    return null;
  }

  if (loading && !hasReplies) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Generating smart replies...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load smart replies</Text>
          <TouchableOpacity onPress={manualRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!hasReplies) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, style, { opacity: fadeAnim }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {replies.map((reply, index) => (
          <TouchableOpacity
            key={index}
            style={styles.replyChip}
            onPress={() => handleReplyPress(reply)}
            activeOpacity={0.7}
          >
            <Text style={styles.replyText} numberOfLines={2}>
              {reply}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Subtle refresh icon in bottom right */}
        <TouchableOpacity 
          onPress={manualRefresh} 
          style={styles.refreshIcon}
          disabled={loading}
        >
          <Text style={styles.refreshIconText}>
            {loading ? '⟳' : '↻'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  replyChip: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    maxWidth: 200,
  },
  replyText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    lineHeight: 18,
  },
  refreshIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  refreshIconText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
