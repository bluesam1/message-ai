import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface ContextExplanationProps {
  visible: boolean;
  onClose: () => void;
  explanation: string | null;
  isLoading?: boolean;
  error?: string | null;
  messageText: string;
}

/**
 * ContextExplanation component - RECREATED FROM SCRATCH
 * Simple, reliable cultural context explanation modal
 */
export function ContextExplanation({
  visible,
  onClose,
  explanation,
  isLoading = false,
  error = null,
  messageText,
}: ContextExplanationProps) {
  console.log('[ContextExplanation] RENDER - Props:', {
    visible,
    explanation: explanation ? 'present' : 'null',
    isLoading,
    error: error ? 'present' : 'null',
    messageText,
  });

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cultural Context</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>

          {/* Message Preview */}
          <View style={styles.messageBox}>
            <Text style={styles.messageLabel}>MESSAGE:</Text>
            <Text style={styles.messageText}>{messageText}</Text>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Analyzing cultural context...</Text>
            </View>
          )}

          {/* Error State */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* Explanation */}
          {explanation && !isLoading && !error && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationLabel}>EXPLANATION:</Text>
              <Text style={styles.explanationText}>{explanation}</Text>
            </View>
          )}

          {/* No Content */}
          {!explanation && !isLoading && !error && (
            <View style={styles.noContentBox}>
              <Text style={styles.noContentText}>
                No explanation available. Try again or check your connection.
              </Text>
            </View>
          )}
        </View>

        {/* Done Button */}
        <TouchableOpacity style={styles.doneButton} onPress={onClose}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 24,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  messageBox: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorBox: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
  },
  explanationBox: {
    backgroundColor: '#e8f5e8',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  explanationLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  noContentBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noContentText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'center',
  },
  doneText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
