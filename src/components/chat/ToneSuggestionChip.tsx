/**
 * ToneSuggestionChip Component
 * 
 * Displays real-time tone adjustment suggestions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ToneSuggestionChipProps } from '../../types/ai';

/**
 * Tone Suggestion Chip Component
 * Shows a tone-adjusted version of the current message
 */
export const ToneSuggestionChip: React.FC<ToneSuggestionChipProps> = ({
  originalText,
  rephrasedText,
  tone,
  onAccept,
  onReject,
  loading = false,
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Adjusting tone...</Text>
        </View>
      </View>
    );
  }

  if (!rephrasedText || rephrasedText === originalText) {
    return null;
  }

  const toneLabel = tone === 'formal' ? 'Formal version' : 'Casual version';
  const toneIcon = tone === 'formal' ? '📝' : '😊';

  return (
    <View style={styles.container}>
      <View style={styles.chip}>
        <View style={styles.header}>
          <Text style={styles.toneLabel}>
            {toneIcon} {toneLabel}
          </Text>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.originalText} numberOfLines={2}>
            "{originalText}"
          </Text>
          <Text style={styles.arrow}>↓</Text>
          <Text style={styles.rephrasedText} numberOfLines={2}>
            "{rephrasedText}"
          </Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={onReject}
            activeOpacity={0.7}
          >
            <Text style={styles.rejectText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => onAccept(rephrasedText)}
            activeOpacity={0.7}
          >
            <Text style={styles.acceptText}>Use This</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E5E9',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    marginBottom: 8,
  },
  toneLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  content: {
    marginBottom: 12,
  },
  originalText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  arrow: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    marginVertical: 4,
  },
  rephrasedText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rejectText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  acceptText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
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
});

export default ToneSuggestionChip;
