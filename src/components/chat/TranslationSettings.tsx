/**
 * TranslationSettings Component
 * Modal for configuring auto-translation preferences per conversation
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Switch } from 'react-native';
import { LanguageSelector } from './LanguageSelector';
import { getLanguageName } from '../../services/ai/languageService';
import { AIPreferences } from '../../types/message';

interface TranslationSettingsProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Current AI preferences */
  preferences: AIPreferences | null;
  /** Callback when preferences are saved */
  onSave: (preferences: AIPreferences) => void;
  /** User's preferred language (used as default for new conversations) */
  userPreferredLanguage?: string;
}

export const TranslationSettings: React.FC<TranslationSettingsProps> = ({
  visible,
  onClose,
  preferences,
  onSave,
  userPreferredLanguage,
}) => {
  // Use userPreferredLanguage as default if no preference exists, fall back to 'en'
  const defaultLanguage = preferences?.targetLang || userPreferredLanguage || 'en';
  
  const [autoTranslate, setAutoTranslate] = useState(preferences?.autoTranslate || false);
  const [targetLang, setTargetLang] = useState(defaultLanguage);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      const lang = preferences?.targetLang || userPreferredLanguage || 'en';
      setAutoTranslate(preferences?.autoTranslate || false);
      setTargetLang(lang);
      console.log('[TranslationSettings] Default language:', lang, '(from:', preferences?.targetLang ? 'prefs' : userPreferredLanguage ? 'user' : 'fallback', ')');
    }
  }, [visible, preferences, userPreferredLanguage]);

  const handleSave = () => {
    onSave({
      autoTranslate,
      targetLang,
    });
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Translation Settings</Text>
              <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, styles.saveButton]}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Settings Content */}
            <View style={styles.content}>
              {/* Auto-Translate Toggle */}
              <View style={styles.settingItem}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Auto-Translate Messages</Text>
                  <Text style={styles.settingDescription}>
                    Automatically translate incoming messages
                  </Text>
                </View>
                <Switch
                  value={autoTranslate}
                  onValueChange={setAutoTranslate}
                  trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E5E5EA"
                />
              </View>

              {/* Target Language Selector */}
              <TouchableOpacity
                style={[
                  styles.settingItem,
                  !autoTranslate && styles.disabledSetting,
                ]}
                onPress={() => autoTranslate && setShowLanguageSelector(true)}
                disabled={!autoTranslate}
              >
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, !autoTranslate && styles.disabledText]}>
                    Target Language
                  </Text>
                  <Text style={[styles.settingDescription, !autoTranslate && styles.disabledText]}>
                    Translate messages to this language
                  </Text>
                </View>
                <View style={styles.languageValueContainer}>
                  <Text style={[styles.languageValue, !autoTranslate && styles.disabledText]}>
                    {getLanguageName(targetLang)}
                  </Text>
                  {autoTranslate && (
                    <Text style={styles.chevron}>›</Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Info Section */}
              {autoTranslate && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoIcon}>ℹ️</Text>
                  <Text style={styles.infoText}>
                    Messages will be automatically translated when they're in a different language than your target language. Tap on a translated message to view the original.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={showLanguageSelector}
        selectedLanguage={targetLang}
        onSelectLanguage={setTargetLang}
        onClose={() => setShowLanguageSelector(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  saveButton: {
    fontWeight: '600',
    textAlign: 'right',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  disabledSetting: {
    opacity: 0.5,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  disabledText: {
    color: '#C7C7CC',
  },
  languageValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageValue: {
    fontSize: 16,
    color: '#8E8E93',
    marginRight: 4,
  },
  chevron: {
    fontSize: 20,
    color: '#C7C7CC',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
});

