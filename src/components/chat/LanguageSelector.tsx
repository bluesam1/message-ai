/**
 * LanguageSelector Component
 * Dropdown selector for choosing a target language
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import { COMMON_LANGUAGES, getLanguageName } from '../../services/ai/languageService';

interface LanguageSelectorProps {
  /** Currently selected language code */
  selectedLanguage: string;
  /** Callback when language is selected */
  onSelectLanguage: (languageCode: string) => void;
  /** Whether the selector is visible */
  visible: boolean;
  /** Callback to close the selector */
  onClose: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
  visible,
  onClose,
}) => {
  const handleSelect = (code: string) => {
    onSelectLanguage(code);
    onClose();
  };

  // Debug logging
  React.useEffect(() => {
    if (visible) {
      console.log('[LanguageSelector] Modal opened, languages available:', COMMON_LANGUAGES.length);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay}
        onPress={onClose}
      >
        <View style={styles.bottomSheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Language</Text>
          </View>
          
          <ScrollView 
            style={styles.languageList}
            contentContainerStyle={styles.languageListContent}
          >
            {COMMON_LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageItem,
                  selectedLanguage === language.code && styles.selectedLanguageItem,
                ]}
                onPress={() => {
                  console.log('[LanguageSelector] Language selected:', language.code);
                  handleSelect(language.code);
                }}
              >
                <Text
                  style={[
                    styles.languageName,
                    selectedLanguage === language.code && styles.selectedLanguageName,
                  ]}
                >
                  {language.name}
                </Text>
                {selectedLanguage === language.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: '#D1D1D6',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  languageList: {
    maxHeight: 400,
  },
  languageListContent: {
    paddingBottom: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  selectedLanguageItem: {
    backgroundColor: '#F2F2F7',
  },
  languageName: {
    fontSize: 16,
    color: '#000',
  },
  selectedLanguageName: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

