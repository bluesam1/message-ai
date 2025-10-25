/**
 * SmartReplyChips Component
 * 
 * Displays smart reply suggestions as interactive chips
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SmartReplyChipProps } from '../../types/ai';

interface SmartReplyChipsProps {
  replies: string[];
  loading?: boolean;
  onReplyPress: (reply: string) => void;
  onRefresh?: () => void;
  error?: string | null;
}

/**
 * Smart Reply Chips Component
 * Displays 3 smart reply suggestions as interactive chips
 */
export const SmartReplyChips: React.FC<SmartReplyChipsProps> = ({
  replies,
  loading = false,
  onReplyPress,
  onRefresh,
  error,
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Generating replies...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {onRefresh && (
            <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (!replies || replies.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.chipsContainer}>
        {replies.map((reply, index) => (
          <SmartReplyChip
            key={index}
            reply={reply}
            onPress={onReplyPress}
            loading={false}
          />
        ))}
      </View>
    </View>
  );
};

/**
 * Individual Smart Reply Chip
 */
const SmartReplyChip: React.FC<SmartReplyChipProps> = ({
  reply,
  onPress,
  loading = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.chip, loading && styles.chipLoading]}
      onPress={() => onPress(reply)}
      disabled={loading}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, loading && styles.chipTextLoading]}>
        {reply}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 4,
    maxWidth: '100%',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CCCCCC',
  },
  chipLoading: {
    backgroundColor: '#B0B0B0',
    opacity: 0.7,
  },
  chipText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    textAlign: 'center',
  },
  chipTextLoading: {
    color: '#999',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SmartReplyChips;
