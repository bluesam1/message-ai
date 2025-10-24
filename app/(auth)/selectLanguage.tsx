/**
 * Language Selection Screen (Onboarding)
 * 
 * Shown to new users after sign-up to select their preferred language
 * This will be used as the default for auto-translate features
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/store/AuthContext';
import { LanguageSelector } from '../../src/components/chat/LanguageSelector';
import { userPreferencesService } from '../../src/services/user/userPreferencesService';
import { getLanguageName } from '../../src/services/ai/languageService';

export default function SelectLanguageScreen() {
  const { user } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Default to English
  const [loading, setLoading] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const handleContinue = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please sign in to continue');
      return;
    }

    try {
      setLoading(true);
      
      // Save preferred language to Firestore
      await userPreferencesService.updateUserLanguage(user.uid, selectedLanguage);
      
      console.log('[SelectLanguage] ✅ Language preference saved:', selectedLanguage);
      
      // Navigate to main app
      router.replace('/(tabs)/conversations');
    } catch (error: any) {
      console.error('[SelectLanguage] Error saving language:', error);
      Alert.alert(
        'Error',
        'Failed to save language preference. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🌐</Text>
          <Text style={styles.title}>What's your preferred language?</Text>
          <Text style={styles.description}>
            This will be used as the default language for translating messages in your conversations.
            You can change this later in Settings.
          </Text>
        </View>

        {/* Language Selector Button */}
        <View style={styles.selectorContainer}>
          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => setShowLanguageSelector(true)}
          >
            <Text style={styles.languageButtonText}>
              {getLanguageName(selectedLanguage)}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>

        {/* Skip Option */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)/conversations')}
          disabled={loading}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={showLanguageSelector}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        onClose={() => setShowLanguageSelector(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  selectorContainer: {
    marginBottom: 32,
  },
  languageButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  languageButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  chevron: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '300',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

