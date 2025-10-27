/**
 * Component for displaying current tone preference
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ConversationSettings } from '../../../functions/src/types/conversationSettings';

interface ToneIndicatorProps {
  tone: ConversationSettings['tonePreference'];
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  style?: any;
}

const TONE_CONFIG = {
  formal: {
    icon: '📝',
    label: 'Formal',
    color: '#007AFF',
    backgroundColor: '#F0F8FF'
  },
  casual: {
    icon: '😊',
    label: 'Casual',
    color: '#34C759',
    backgroundColor: '#F0FFF4'
  },
  auto: {
    icon: '🤖',
    label: 'Auto',
    color: '#8E8E93',
    backgroundColor: '#F8F9FA'
  }
} as const;

export function ToneIndicator({
  tone,
  onPress,
  size = 'medium',
  showLabel = true,
  style
}: ToneIndicatorProps) {
  const config = TONE_CONFIG[tone];
  
  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      icon: styles.iconSmall,
      label: styles.labelSmall
    },
    medium: {
      container: styles.containerMedium,
      icon: styles.iconMedium,
      label: styles.labelMedium
    },
    large: {
      container: styles.containerLarge,
      icon: styles.iconLarge,
      label: styles.labelLarge
    }
  };

  const currentSizeStyles = sizeStyles[size];

  const content = (
    <View style={[
      styles.container,
      currentSizeStyles.container,
      { backgroundColor: config.backgroundColor },
      style
    ]}>
      <Text style={[styles.icon, currentSizeStyles.icon]}>
        {config.icon}
      </Text>
      {showLabel && (
        <Text style={[
          styles.label,
          currentSizeStyles.label,
          { color: config.color }
        ]}>
          {config.label}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

/**
 * Compact tone indicator for use in headers
 */
export function ToneIndicatorCompact({
  tone,
  onPress,
  style
}: Omit<ToneIndicatorProps, 'size' | 'showLabel'>) {
  return (
    <ToneIndicator
      tone={tone}
      onPress={onPress}
      size="small"
      showLabel={false}
      style={style}
    />
  );
}

/**
 * Tone indicator with description
 */
export function ToneIndicatorWithDescription({
  tone,
  onPress,
  style
}: Omit<ToneIndicatorProps, 'size' | 'showLabel'>) {
  const config = TONE_CONFIG[tone];
  
  const descriptions = {
    formal: 'Professional and polite responses',
    casual: 'Friendly and relaxed responses',
    auto: 'Automatically detect conversation tone'
  };

  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.descriptionContainer, style]}
      activeOpacity={0.7}
    >
      <View style={styles.descriptionContent}>
        <Text style={[styles.descriptionIcon, { color: config.color }]}>
          {config.icon}
        </Text>
        <View style={styles.descriptionText}>
          <Text style={[styles.descriptionLabel, { color: config.color }]}>
            {config.label}
          </Text>
          <Text style={styles.descriptionSubtext}>
            {descriptions[tone]}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  containerSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  containerMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  containerLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  icon: {
    fontSize: 16,
    marginRight: 4,
  },
  iconSmall: {
    fontSize: 12,
    marginRight: 2,
  },
  iconMedium: {
    fontSize: 16,
    marginRight: 4,
  },
  iconLarge: {
    fontSize: 20,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  labelSmall: {
    fontSize: 10,
  },
  labelMedium: {
    fontSize: 12,
  },
  labelLarge: {
    fontSize: 14,
  },
  descriptionContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  descriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  descriptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  descriptionText: {
    flex: 1,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  descriptionSubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
