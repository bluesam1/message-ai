/**
 * TranslationToggle Component
 * Compact component showing translated text with globe icon
 * Click globe to see original and rate translation
 * Specifically designed for auto-translated messages (different from TranslationView for manual translations)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { TranslationFeedback } from './TranslationFeedback';

interface TranslationToggleProps {
  /** Original message text */
  originalText: string;
  /** Translated message text */
  translatedText: string;
  /** Target language code */
  targetLanguage: string;
  /** Whether this is the user's own message */
  isOwnMessage: boolean;
  /** Current feedback value */
  feedback?: 'positive' | 'negative';
  /** Callback when feedback is given */
  onFeedback: (feedback: 'positive' | 'negative') => void;
  /** Callback when globe icon is pressed */
  onShowOriginal: () => void;
  /** Whether to show the original text modal */
  showOriginal: boolean;
  /** Callback to close the modal */
  onCloseModal: () => void;
}

export const TranslationToggle: React.FC<TranslationToggleProps> = ({
  originalText,
  translatedText,
  targetLanguage,
  isOwnMessage,
  feedback,
  onFeedback,
  showOriginal,
  onCloseModal,
}) => {
  return (
    <View style={styles.container}>
      {/* Message Text (always show translated by default) */}
      <Text style={[styles.text, isOwnMessage && styles.ownMessageText]}>
        {translatedText}
      </Text>

      {/* Translation Details Modal */}
      <Modal
        visible={showOriginal}
        transparent={true}
        animationType="fade"
        onRequestClose={onCloseModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onCloseModal}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Original Message</Text>
                <TouchableOpacity onPress={onCloseModal}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.originalText}>{originalText}</Text>

              {/* Translation Feedback */}
              {!isOwnMessage && (
                <View style={styles.feedbackSection}>
                  <Text style={styles.feedbackLabel}>Rate this translation:</Text>
                  <TranslationFeedback feedback={feedback} onFeedback={onFeedback} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000',
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    fontSize: 24,
    color: '#8E8E93',
    fontWeight: '300',
  },
  originalText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000',
    marginBottom: 16,
  },
  feedbackSection: {
    borderTopWidth: 1,
    borderTopColor: '#E9E9EB',
    paddingTop: 16,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
});

