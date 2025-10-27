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
  onShowOriginal?: () => void;
  /** Whether to show the original text modal */
  showOriginal?: boolean;
  /** Callback to close the modal */
  onCloseModal?: () => void;
  /** Whether to show original text inline */
  showOriginalInline?: boolean;
}

export const TranslationToggle: React.FC<TranslationToggleProps> = ({
  originalText,
  translatedText,
  targetLanguage,
  isOwnMessage,
  feedback,
  onFeedback,
  showOriginal = false,
  onCloseModal,
  showOriginalInline = false,
}) => {
  return (
    <>
      {showOriginalInline ? (
        /* Two completely separate containers side-by-side */
        <>
          {/* Translated Message Bubble (left side) */}
          <View style={[styles.translatedBubble, isOwnMessage ? styles.ownTranslatedBubble : styles.otherTranslatedBubble]}>
            <Text style={[styles.translatedText, isOwnMessage && styles.ownTranslatedText]}>
              {translatedText}
            </Text>
          </View>
          
          {/* Original Text Container (right side) */}
          <View style={styles.originalContainer}>
            <Text style={styles.originalLabel}>Original Text</Text>
            <View style={[styles.originalDashedContainer, isOwnMessage && styles.ownOriginalDashedContainer]}>
              <Text style={[styles.originalText, isOwnMessage && styles.ownOriginalText]}>
                {originalText}
              </Text>
            </View>
          </View>
        </>
      ) : (
        /* Default layout - just translated text */
        <View style={styles.messageContainer}>
          <Text style={[styles.text, isOwnMessage && styles.ownMessageText]}>
            {translatedText}
          </Text>
        </View>
      )}

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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageContainer: {
    flex: 1,
  },
  translatedBubble: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    marginRight: 8,
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
  originalContainer: {
    flex: 1,
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
  text: {
    fontSize: 14,
    lineHeight: 20,
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

