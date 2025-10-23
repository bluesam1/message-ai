import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Message } from '../../types/message';

export interface MessageAction {
  id: string;
  label: string;
  onPress: () => void;
  icon?: string;
}

interface MessageActionsProps {
  visible: boolean;
  onClose: () => void;
  message: Message;
  actions: MessageAction[];
}

/**
 * MessageActions component
 * Displays a modal with action buttons for a message (translate, explain, define, etc.)
 */
export function MessageActions({
  visible,
  onClose,
  message,
  actions,
}: MessageActionsProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <View style={styles.messagePreview}>
            <Text style={styles.messageText} numberOfLines={3}>
              {message.text}
            </Text>
          </View>

          <View style={styles.actions}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionButton}
                onPress={() => {
                  action.onPress();
                  onClose();
                }}
              >
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  messagePreview: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actions: {
    paddingVertical: 8,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  actionLabel: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f8f8',
  },
  cancelLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
});

