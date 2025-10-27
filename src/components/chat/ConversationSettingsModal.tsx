/**
 * Modal for conversation settings (tone, auto-translate, smart replies)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { ConversationSettingsService } from '../../services/ai/conversationSettingsService';
import { ConversationSettings } from '../../../functions/src/types/conversationSettings';
import { setAutoTranslatePrefs, getAutoTranslatePrefs } from '../../services/ai/autoTranslateService';
import { AIPreferences } from '../../types/message';
import { userPreferencesService } from '../../services/user/userPreferencesService';

interface ConversationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  userId: string;
  onSettingsUpdate?: (settings: ConversationSettings) => void;
}

const TONE_OPTIONS = [
  { value: 'auto', label: 'Auto', icon: '🤖', description: 'Automatically detect tone' },
  { value: 'formal', label: 'Formal', icon: '📝', description: 'Professional and polite' },
  { value: 'casual', label: 'Casual', icon: '😊', description: 'Friendly and relaxed' }
] as const;


export function ConversationSettingsModal({
  visible,
  onClose,
  conversationId,
  userId,
  onSettingsUpdate
}: ConversationSettingsModalProps) {
  const [settings, setSettings] = useState<ConversationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settingsService = new ConversationSettingsService();

  // Load settings when modal opens
  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible, conversationId, userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load conversation settings
      const result = await settingsService.getConversationSettings(conversationId, userId);
      
      if (result.error) {
        setError(result.error);
        return;
      }
      
      let settings = result.settings;
      
      // Also load current auto-translate preferences to sync them
      try {
        const autoTranslatePrefs = await getAutoTranslatePrefs(conversationId, userId);
        if (autoTranslatePrefs && settings) {
          // Sync the auto-translate setting from the conversations collection
          if (autoTranslatePrefs.autoTranslate !== settings.autoTranslate) {
            console.log('[ConversationSettingsModal] Syncing auto-translate from conversations collection:', autoTranslatePrefs.autoTranslate);
            
            // Update the conversation settings to match the auto-translate preferences
            const syncResult = await settingsService.updateConversationSettings(
              conversationId,
              userId,
              { autoTranslate: autoTranslatePrefs.autoTranslate }
            );
            
            if (syncResult.success) {
              settings = { ...settings, autoTranslate: autoTranslatePrefs.autoTranslate };
            }
          }
        }
      } catch (syncError) {
        console.warn('[ConversationSettingsModal] Could not sync auto-translate preferences:', syncError);
      }
      
      setSettings(settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async <K extends keyof ConversationSettings>(
    key: K,
    value: ConversationSettings[K]
  ): Promise<boolean> => {
    if (!settings) return false;

    try {
      setSaving(true);
      setError(null);

      const result = await settingsService.updateConversationSettings(
        conversationId,
        userId,
        { [key]: value }
      );

      if (result.success) {
        const updatedSettings = { ...settings, [key]: value };
        setSettings(updatedSettings);
        onSettingsUpdate?.(updatedSettings);
        return true;
      } else {
        setError(result.error || 'Failed to update setting');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleToneChange = (tone: 'formal' | 'casual' | 'auto') => {
    updateSetting('tonePreference', tone);
  };


  const handleAutoTranslateChange = async (enabled: boolean) => {
    try {
      // Update conversation settings first
      const settingsUpdated = await updateSetting('autoTranslate', enabled);
      
      if (!settingsUpdated) {
        console.error('[ConversationSettingsModal] Failed to update conversation settings');
        return;
      }
      
      // Also update the auto-translate preferences in conversations collection
      // This ensures the chat screen's useAutoTranslate hook gets updated
      let targetLang = 'en'; // Default fallback
      
      if (enabled) {
        try {
          // Get user's preferred language
          targetLang = await userPreferencesService.getUserLanguage(userId);
        } catch (error) {
          console.warn('[ConversationSettingsModal] Could not get user language, using default:', error);
        }
      }
      
      const aiPrefs: AIPreferences = {
        autoTranslate: enabled,
        targetLang: targetLang
      };
      
      await setAutoTranslatePrefs(conversationId, userId, aiPrefs);
      console.log('[ConversationSettingsModal] Auto-translate preferences synchronized with target language:', targetLang);
    } catch (error) {
      console.error('[ConversationSettingsModal] Error updating auto-translate:', error);
      setError('Failed to update auto-translate setting');
    }
  };

  const handleSmartRepliesChange = (enabled: boolean) => {
    updateSetting('smartRepliesEnabled', enabled);
  };

  const handleClose = () => {
    if (saving) {
      Alert.alert(
        'Saving Settings',
        'Please wait while settings are being saved.',
        [{ text: 'OK' }]
      );
      return;
    }
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Conversation Settings</Text>
          <TouchableOpacity 
            onPress={handleClose} 
            style={styles.doneButton}
            disabled={saving}
          >
            <Text style={[styles.doneButtonText, saving && styles.doneButtonTextDisabled]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading settings...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadSettings} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : settings ? (
            <>
              {/* Tone Preference Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reply Tone</Text>
                <Text style={styles.sectionDescription}>
                  Choose how smart replies should sound
                </Text>
                <View style={styles.optionsContainer}>
                  {TONE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        settings.tonePreference === option.value && styles.optionButtonSelected
                      ]}
                      onPress={() => handleToneChange(option.value)}
                    >
                      <Text style={styles.optionIcon}>{option.icon}</Text>
                      <View style={styles.optionContent}>
                        <Text style={[
                          styles.optionLabel,
                          settings.tonePreference === option.value && styles.optionLabelSelected
                        ]}>
                          {option.label}
                        </Text>
                        <Text style={styles.optionDescription}>{option.description}</Text>
                      </View>
                      {settings.tonePreference === option.value && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>


              {/* Auto-Translate Section */}
              <View style={styles.section}>
                <View style={styles.settingRow}>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Auto-Translate</Text>
                    <Text style={styles.settingDescription}>
                      Automatically translate incoming messages
                    </Text>
                  </View>
                  <Switch
                    value={settings.autoTranslate}
                    onValueChange={handleAutoTranslateChange}
                    trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                    thumbColor={settings.autoTranslate ? '#FFFFFF' : '#FFFFFF'}
                  />
                </View>
              </View>

              {/* Smart Replies Section */}
              <View style={styles.section}>
                <View style={styles.settingRow}>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Smart Replies</Text>
                    <Text style={styles.settingDescription}>
                      Show AI-generated reply suggestions
                    </Text>
                  </View>
                  <Switch
                    value={settings.smartRepliesEnabled}
                    onValueChange={handleSmartRepliesChange}
                    trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                    thumbColor={settings.smartRepliesEnabled ? '#FFFFFF' : '#FFFFFF'}
                  />
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>

        {saving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  doneButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  doneButtonTextDisabled: {
    color: '#C7C7CC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  optionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: '#007AFF',
  },
  optionDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  checkmark: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  savingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#1C1C1E',
  },
});
