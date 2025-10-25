/**
 * Profile Screen
 * 
 * Shows user info and sign-out button
 */

import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useState, useEffect } from 'react';
import { useAuth } from '../../src/store/AuthContext';
import { LanguageSelector } from '../../src/components/chat/LanguageSelector';
import { userPreferencesService } from '../../src/services/user/userPreferencesService';
import { getLanguageName } from '../../src/services/ai/languageService';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [loadingLanguage, setLoadingLanguage] = useState(true);
  const [savingLanguage, setSavingLanguage] = useState(false);

  // Load user's preferred language
  useEffect(() => {
    const loadLanguage = async () => {
      if (!user?.uid) return;
      try {
        const language = await userPreferencesService.getUserLanguage(user.uid);
        setCurrentLanguage(language);
        setSelectedLanguage(language);
      } catch (error) {
        console.error('[Profile] Error loading language:', error);
      } finally {
        setLoadingLanguage(false);
      }
    };
    loadLanguage();
  }, [user?.uid]);


  const handleLanguageSelect = async (languageCode: string) => {
    if (!user?.uid) return;
    
    try {
      setSavingLanguage(true);
      await userPreferencesService.updateUserLanguage(user.uid, languageCode);
      setCurrentLanguage(languageCode);
      setSelectedLanguage(languageCode);
      Alert.alert('Success', 'Language preference updated!');
    } catch (error) {
      console.error('[Profile] Error updating language:', error);
      Alert.alert('Error', 'Failed to update language preference');
      // Revert selection on error
      setSelectedLanguage(currentLanguage);
    } finally {
      setSavingLanguage(false);
    }
  };


  const handleSignOut = async () => {
    console.log('[ProfileScreen] handleSignOut called');
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('[ProfileScreen] User cancelled logout')
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('[ProfileScreen] User confirmed logout, calling signOut()...');
            try {
              await signOut();
              console.log('[ProfileScreen] signOut() completed successfully');
              // Navigation handled by root layout
            } catch (error: any) {
              console.error('[ProfileScreen] signOut() error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>International Communicator</Text>
      </View>
      
      <View style={styles.profileInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        
        <Text style={styles.name}>{user?.displayName || 'User'}</Text>
        <Text style={styles.email}>{user?.email || 'No email'}</Text>
      </View>

      {/* Settings Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity 
          style={styles.settingRow} 
          onPress={() => setShowLanguageSelector(true)}
          disabled={loadingLanguage || savingLanguage}
        >
          <Text style={styles.settingIcon}>🌐</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingText}>Language</Text>
            {loadingLanguage ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.settingValue}>{getLanguageName(currentLanguage)}</Text>
            )}
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={showLanguageSelector}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleLanguageSelect}
        onClose={() => setShowLanguageSelector(false)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  appHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  settingRow: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingText: {
    fontSize: 17,
    color: '#000',
  },
  settingValue: {
    fontSize: 15,
    color: '#8E8E93',
  },
  chevron: {
    fontSize: 24,
    color: '#C7C7CC',
    fontWeight: '300',
    marginLeft: 8,
  },
  signOutButton: {
    height: 50,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});



