/**
 * TranslationFeedback Component
 * Thumbs up/down buttons for rating translation quality
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface TranslationFeedbackProps {
  /** Current feedback value */
  feedback?: 'positive' | 'negative';
  /** Callback when feedback is given */
  onFeedback: (feedback: 'positive' | 'negative') => void;
}

export const TranslationFeedback: React.FC<TranslationFeedbackProps> = ({
  feedback,
  onFeedback,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Translation quality:</Text>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[
            styles.feedbackButton,
            feedback === 'positive' && styles.feedbackButtonActive,
          ]}
          onPress={() => onFeedback('positive')}
        >
          <Text
            style={[
              styles.feedbackIcon,
              feedback === 'positive' && styles.feedbackIconActive,
            ]}
          >
            👍
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.feedbackButton,
            feedback === 'negative' && styles.feedbackButtonActive,
          ]}
          onPress={() => onFeedback('negative')}
        >
          <Text
            style={[
              styles.feedbackIcon,
              feedback === 'negative' && styles.feedbackIconActive,
            ]}
          >
            👎
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  label: {
    fontSize: 11,
    color: '#8E8E93',
    marginRight: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  feedbackButtonActive: {
    backgroundColor: '#007AFF',
  },
  feedbackIcon: {
    fontSize: 14,
  },
  feedbackIconActive: {
    opacity: 1,
  },
});

