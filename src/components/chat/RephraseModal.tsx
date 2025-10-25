/**
 * RephraseModal Component
 * 
 * Modal for formality adjustment with preview functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { RephraseModalProps } from '../../types/ai';

interface RephraseModalState {
  loading: boolean;
  rephrasedText: string | null;
  selectedTone: 'formal' | 'casual' | null;
  error: string | null;
}

/**
 * Rephrase Modal Component
 * Allows users to rephrase messages to be more formal or casual
 */
export const RephraseModal: React.FC<RephraseModalProps> = ({
  visible,
  originalText,
  onClose,
  onRephrase,
  loading = false,
}) => {
  const [state, setState] = useState<RephraseModalState>({
    loading: false,
    rephrasedText: null,
    selectedTone: null,
    error: null,
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setState({
        loading: false,
        rephrasedText: null,
        selectedTone: null,
        error: null,
      });
    }
  }, [visible]);

  const handleRephrase = async (tone: 'formal' | 'casual') => {
    if (!originalText.trim()) {
      Alert.alert('Error', 'Please enter some text to rephrase');
      return;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      selectedTone: tone,
      error: null,
    }));

    try {
      await onRephrase(tone);
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to rephrase message',
      }));
    }
  };

  const handleClose = () => {
    setState({
      loading: false,
      rephrasedText: null,
      selectedTone: null,
      error: null,
    });
    onClose();
  };

  const handleUseThis = () => {
    if (state.rephrasedText) {
      // This would typically be handled by the parent component
      // For now, we'll just close the modal
      handleClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Rephrase Message</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.originalLabel}>Original:</Text>
            <View style={styles.textContainer}>
              <Text style={styles.originalText}>"{originalText}"</Text>
            </View>

            {state.loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Rephrasing...</Text>
              </View>
            )}

            {state.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{state.error}</Text>
              </View>
            )}

            {state.rephrasedText && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>
                  {state.selectedTone === 'formal' ? '📝 Formal version:' : '😊 Casual version:'}
                </Text>
                <View style={styles.textContainer}>
                  <Text style={styles.rephrasedText}>"{state.rephrasedText}"</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            {!state.rephrasedText && !state.loading && (
              <>
                <TouchableOpacity
                  style={[styles.toneButton, styles.formalButton]}
                  onPress={() => handleRephrase('formal')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toneButtonText}>📝 Make it Formal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toneButton, styles.casualButton]}
                  onPress={() => handleRephrase('casual')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toneButtonText}>😊 Make it Casual</Text>
                </TouchableOpacity>
              </>
            )}

            {state.rephrasedText && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.useButton]}
                  onPress={handleUseThis}
                  activeOpacity={0.7}
                >
                  <Text style={styles.useText}>Use This</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  originalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  originalText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  rephrasedText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  toneButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  formalButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  casualButton: {
    backgroundColor: '#F3E5F5',
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  toneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  useButton: {
    backgroundColor: '#007AFF',
  },
  useText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default RephraseModal;
