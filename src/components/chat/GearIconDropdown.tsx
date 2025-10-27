/**
 * Gear icon dropdown to replace translation toggle
 */

import React, { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ConversationSettingsModal } from './ConversationSettingsModal';
import { ConversationSettings } from '../../../functions/src/types/conversationSettings';
import { ConversationSettingsService } from '../../services/ai/conversationSettingsService';

interface GearIconDropdownProps {
  conversationId: string;
  userId: string;
  autoTranslateEnabled: boolean;
  onAutoTranslateToggle: () => void;
  userPreferredLanguage: string;
  style?: any;
}

export function GearIconDropdown({
  conversationId,
  userId,
  autoTranslateEnabled,
  onAutoTranslateToggle,
  userPreferredLanguage,
  style
}: GearIconDropdownProps) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<ConversationSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const settingsService = new ConversationSettingsService();

  // Load settings when dropdown opens
  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await settingsService.getConversationSettings(conversationId, userId);
      if (result.settings) {
        setSettings(result.settings);
      }
    } catch (error) {
      console.error('Failed to load conversation settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGearPress = async () => {
    await loadSettings();
    setShowSettingsModal(true);
  };



  const handleSettingsUpdate = (updatedSettings: ConversationSettings) => {
    setSettings(updatedSettings);
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleGearPress}
        style={[styles.gearButton, style]}
        activeOpacity={0.7}
      >
        <Text style={styles.gearIcon}>⚙️</Text>
      </TouchableOpacity>

      {/* Settings Modal */}
      <ConversationSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        conversationId={conversationId}
        userId={userId}
        onSettingsUpdate={handleSettingsUpdate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  gearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  gearIcon: {
    fontSize: 18,
    opacity: 0.8,
  },
});
