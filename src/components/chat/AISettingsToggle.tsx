/**
 * AISettingsToggle Component
 * 
 * Settings toggle for AI features like real-time tone adjustment
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AISettingsToggleProps {
  /** Whether real-time tone adjustment is enabled */
  realTimeToneAdjustment: boolean;
  /** Callback when setting changes */
  onToggle: (enabled: boolean) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Custom label text */
  label?: string;
  /** Custom description text */
  description?: string;
}

/**
 * AI Settings Toggle Component
 * Provides a toggle for real-time tone adjustment with description
 */
export const AISettingsToggle: React.FC<AISettingsToggleProps> = ({
  realTimeToneAdjustment,
  onToggle,
  disabled = false,
  label = 'Real-time Tone Adjustment',
  description = 'Get tone suggestions as you type',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        
        <View style={styles.toggleContainer}>
          <Switch
            value={realTimeToneAdjustment}
            onValueChange={onToggle}
            disabled={disabled}
            trackColor={{
              false: '#E5E5E5',
              true: '#007AFF',
            }}
            thumbColor={realTimeToneAdjustment ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
      </View>
    </View>
  );
};

/**
 * Compact AI Settings Toggle
 * For use in smaller spaces like message composer
 */
export const CompactAISettingsToggle: React.FC<AISettingsToggleProps> = ({
  realTimeToneAdjustment,
  onToggle,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.compactContainer,
        realTimeToneAdjustment && styles.compactContainerActive,
        disabled && styles.compactContainerDisabled,
      ]}
      onPress={() => onToggle(!realTimeToneAdjustment)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons
        name="settings-outline"
        size={16}
        color={realTimeToneAdjustment ? '#007AFF' : '#8E8E93'}
      />
      <Text style={[
        styles.compactLabel,
        realTimeToneAdjustment && styles.compactLabelActive,
      ]}>
        AI
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  toggleContainer: {
    // Switch styling is handled by the Switch component
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    marginLeft: 4,
  },
  compactContainerActive: {
    backgroundColor: '#E3F2FD',
  },
  compactContainerDisabled: {
    opacity: 0.5,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 4,
  },
  compactLabelActive: {
    color: '#007AFF',
  },
});

export default AISettingsToggle;
