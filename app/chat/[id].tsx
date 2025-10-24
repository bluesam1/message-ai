/**
 * Chat Screen
 * Individual conversation screen for sending and receiving messages
 * Displays messages in real-time with optimistic updates
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Animated, Modal, Pressable } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAuth } from '../../src/store/AuthContext';
import useMessages from '../../src/hooks/useMessages';
import useConversation from '../../src/hooks/useConversation';
import MessageList from '../../src/components/chat/MessageList';
import MessageInput from '../../src/components/chat/MessageInput';
import OfflineBanner from '../../src/components/chat/OfflineBanner';
import GroupInfo from '../../src/components/chat/GroupInfo';
import PresenceIndicator from '../../src/components/users/PresenceIndicator';
import { initDatabase } from '../../src/services/sqlite/sqliteService';
import { useAIFeatures } from '../../src/hooks/useAIFeatures';
import { MessageActions } from '../../src/components/chat/MessageActions';
import { ContextExplanation } from '../../src/components/chat/ContextExplanation';
import { SlangDefinition } from '../../src/components/chat/SlangDefinition';
import { useAutoTranslate } from '../../src/hooks/useAutoTranslate';
import { userPreferencesService } from '../../src/services/user/userPreferencesService';
import { getLanguageName } from '../../src/services/ai/languageService';
import { LanguageSelector } from '../../src/components/chat/LanguageSelector';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showTranslateInfo, setShowTranslateInfo] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [userPreferredLanguage, setUserPreferredLanguage] = useState<string>('en');
  const [updatingLanguage, setUpdatingLanguage] = useState(false);
  const [participantsLanguages, setParticipantsLanguages] = useState<Record<string, string>>({});
  const [showLanguageBanner, setShowLanguageBanner] = useState(true);
  
  // Rotation animation for the globe
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Initialize database on mount
  useEffect(() => {
    initDatabase().catch((err) => {
      console.error('[ChatScreen] Failed to initialize database:', err);
    });
  }, []);

  // Load user's preferred language
  useEffect(() => {
    const loadUserLanguage = async () => {
      if (!user?.uid) return;
      try {
        const language = await userPreferencesService.getUserLanguage(user.uid);
        setUserPreferredLanguage(language);
        console.log('[ChatScreen] User preferred language:', language);
      } catch (error) {
        console.error('[ChatScreen] Error loading user language:', error);
        // Fall back to 'en' (already set as initial state)
      }
    };

    loadUserLanguage();
  }, [user?.uid]);

  // Load conversation and messages
  const { conversation, otherParticipant, participants, loading: conversationLoading } = useConversation(
    id || '',
    user?.uid || ''
  );

  // Fetch other participants' preferred languages
  useEffect(() => {
    const fetchParticipantsLanguages = async () => {
      if (!participants || !user?.uid) return;
      
      // Convert participants record to array
      const participantsArray = Object.values(participants);
      if (participantsArray.length === 0) return;
      
      const languages: Record<string, string> = {};
      
      for (const participant of participantsArray) {
        // Skip current user
        if (participant.uid === user.uid) continue;
        
        try {
          const lang = await userPreferencesService.getUserLanguage(participant.uid);
          languages[participant.uid] = lang;
        } catch (error) {
          console.error(`[ChatScreen] Error fetching language for ${participant.uid}:`, error);
          languages[participant.uid] = 'en'; // Default
        }
      }
      
      setParticipantsLanguages(languages);
      console.log('[ChatScreen] Participants languages:', languages);
    };
    
    fetchParticipantsLanguages();
  }, [participants, user?.uid]);
  const {
    messages,
    loading: messagesLoading,
    sendMessage,
    retryMessage,
    loadMore,
  } = useMessages(id || '', user?.uid || '');

  // AI Features
  const {
    selectedMessage,
    showActions,
    showContextExplanation,
    showSlangDefinition,
    contextExplanation,
    slangDefinition,
    handleMessageLongPress,
    closeActions,
    handleTranslate,
    handleExplainContext,
    handleDefineSlang,
    closeContextExplanation,
    closeSlangDefinition,
    getTranslationState,
  } = useAIFeatures();

  // Auto-translate preferences (per-user)
  const { preferences: autoTranslatePrefs, updatePreferences: updateAutoTranslatePrefs } = useAutoTranslate(id || null, user?.uid || null);

  // Handle toggle auto-translate
  const handleToggleAutoTranslate = async () => {
    try {
      const newValue = !autoTranslatePrefs?.autoTranslate;
      console.log('[ChatScreen] Toggling auto-translate:', newValue);
      
      await updateAutoTranslatePrefs({
        autoTranslate: newValue,
        targetLang: userPreferredLanguage, // Always use user's preferred language
      });
      
      console.log('[ChatScreen] Auto-translate toggled successfully');
    } catch (error: any) {
      console.error('[ChatScreen] Error toggling auto-translate:', error);
      Alert.alert('Error', 'Failed to toggle auto-translate');
    }
  };

  // Handle language selection
  const handleLanguageSelect = async (languageCode: string) => {
    if (!user?.uid) return;
    
    try {
      setUpdatingLanguage(true);
      await userPreferencesService.updateUserLanguage(user.uid, languageCode);
      setUserPreferredLanguage(languageCode);
      
      // Update auto-translate preferences if enabled
      if (autoTranslatePrefs?.autoTranslate) {
        await updateAutoTranslatePrefs({
          autoTranslate: true,
          targetLang: languageCode,
        });
      }
      
      Alert.alert('Success', `Language changed to ${getLanguageName(languageCode)}`);
    } catch (error: any) {
      console.error('[ChatScreen] Error updating language:', error);
      Alert.alert('Error', 'Failed to update language');
    } finally {
      setUpdatingLanguage(false);
    }
  };

  // Check if there's a language mismatch between user and other participants
  const hasLanguageMismatch = (): boolean => {
    const otherLanguages = Object.values(participantsLanguages);
    return otherLanguages.some(lang => lang !== userPreferredLanguage);
  };

  // Determine if language banner should be visible
  const shouldShowLanguageBanner = 
    showLanguageBanner && 
    !autoTranslatePrefs?.autoTranslate && 
    Object.keys(participantsLanguages).length > 0 &&
    hasLanguageMismatch();

  // Handle enable auto-translate from banner
  const handleEnableTranslation = async () => {
    try {
      await updateAutoTranslatePrefs({
        autoTranslate: true,
        targetLang: userPreferredLanguage,
      });
      setShowLanguageBanner(false); // Hide banner after enabling
    } catch (error: any) {
      console.error('[ChatScreen] Error enabling translation:', error);
      Alert.alert('Error', 'Failed to enable translation');
    }
  };

  // Handle send message
  const handleSendMessage = async (text: string) => {
    await sendMessage(text);
  };

  // Determine if this is a group conversation
  const isGroup = conversation?.type === 'group';
  
  // Get header title and subtitle
  const headerTitle = isGroup 
    ? (conversation?.groupName || 'Group Chat')
    : (otherParticipant?.displayName || 'Chat');
  
  // Header subtitle: show member count for groups
  const headerSubtitle = isGroup && conversation
    ? `${conversation.participants.length} ${conversation.participants.length === 1 ? 'member' : 'members'}`
    : null;

  // Debug participants
  useEffect(() => {
    if (Object.keys(participants).length > 0) {
      console.log('[ChatScreen] Participants loaded:', {
        count: Object.keys(participants).length,
        participants: Object.entries(participants).map(([uid, user]) => ({
          uid,
          displayName: user.displayName,
          email: user.email,
        })),
      });
    }
  }, [participants]);

  // Animate globe rotation when auto-translate is on
  useEffect(() => {
    if (autoTranslatePrefs?.autoTranslate) {
      // Start rotating
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000, // 3 seconds for full rotation
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Reset rotation when turned off
      rotateAnim.setValue(0);
    }
  }, [autoTranslatePrefs?.autoTranslate, rotateAnim]);

  // Interpolate rotation value
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerBackTitle: 'Back',
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {headerTitle || 'Chat'}
                </Text>
                {/* Group Info Button (groups only) - moved next to group name */}
                {isGroup && (
                  <TouchableOpacity
                    onPress={() => setShowGroupInfo(true)}
                    style={styles.groupInfoButton}
                  >
                    <Text style={styles.groupInfoButtonText}>ⓘ</Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* Show presence for direct chats */}
              {!isGroup && otherParticipant && (
                <PresenceIndicator 
                  userId={otherParticipant.uid} 
                  showText={true}
                  size="small"
                  textStyle={styles.headerPresenceText}
                />
              )}
              {/* Show member count for groups */}
              {headerSubtitle ? (
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {headerSubtitle}
                </Text>
              ) : null}
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {/* Auto-Translate Toggle */}
              <TouchableOpacity
                onPress={handleToggleAutoTranslate}
                style={[
                  styles.translateToggle,
                  autoTranslatePrefs?.autoTranslate && styles.translateToggleActive
                ]}
              >
                <Animated.Text 
                  style={[
                    styles.translateToggleText,
                    autoTranslatePrefs?.autoTranslate && styles.translateToggleTextActive,
                    autoTranslatePrefs?.autoTranslate && { transform: [{ rotate: spin }] }
                  ]}
                >
                  🌐
                </Animated.Text>
              </TouchableOpacity>
              {/* Info Icon */}
              <TouchableOpacity
                onPress={() => setShowTranslateInfo(true)}
                style={styles.infoButton}
              >
                <Text style={styles.infoButtonText}>ⓘ</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Offline Banner */}
        <OfflineBanner />

        {/* Message List */}
        <MessageList
          messages={messages}
          currentUserId={user?.uid || ''}
          loading={messagesLoading}
          onLoadMore={loadMore}
          onRetryMessage={retryMessage}
          userNames={Object.fromEntries(
            Object.entries(participants).map(([uid, user]) => [uid, user.displayName || user.email || 'User'])
          )}
          userPhotoURLs={Object.fromEntries(
            Object.entries(participants).map(([uid, user]) => [uid, user.photoURL || ''])
          )}
          totalParticipants={conversation?.participants.length}
          onMessageLongPress={handleMessageLongPress}
          getTranslationState={getTranslationState}
          autoTranslatePrefs={autoTranslatePrefs ? {
            targetLang: autoTranslatePrefs.targetLang,
            autoTranslate: autoTranslatePrefs.autoTranslate,
          } : undefined}
        />

        {/* Language Mismatch Banner */}
        {shouldShowLanguageBanner && (
          <View style={styles.languageBanner}>
            <View style={styles.languageBannerContent}>
              <Text style={styles.languageBannerIcon}>🌐</Text>
              <View style={styles.languageBannerTextContainer}>
                <Text style={styles.languageBannerText}>
                  You and other participants speak different languages
                </Text>
                <TouchableOpacity onPress={handleEnableTranslation}>
                  <Text style={styles.languageBannerLink}>Enable Real-time Translation</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                onPress={() => setShowLanguageBanner(false)}
                style={styles.languageBannerClose}
              >
                <Text style={styles.languageBannerCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Message Input */}
        <MessageInput
          onSend={handleSendMessage}
          disabled={conversationLoading || !user}
        />
      </KeyboardAvoidingView>

      {/* Group Info Modal */}
      {isGroup && conversation && (
        <GroupInfo
          conversation={conversation}
          currentUserId={user?.uid || ''}
          visible={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
        />
      )}

      {/* AI Features Modals */}
      {selectedMessage && (
        <>
          <MessageActions
            visible={showActions}
            onClose={closeActions}
            message={selectedMessage}
            actions={[
              {
                id: 'explain',
                label: '💡 Explain Cultural Context',
                onPress: () => handleExplainContext(selectedMessage),
              },
              {
                id: 'define',
                label: '📖 Define Slang/Idiom',
                onPress: () => handleDefineSlang(selectedMessage),
              },
            ]}
          />
          <ContextExplanation
            visible={showContextExplanation}
            onClose={closeContextExplanation}
            explanation={contextExplanation.text}
            isLoading={contextExplanation.isLoading}
            error={contextExplanation.error}
            messageText={selectedMessage.text}
          />
          <SlangDefinition
            visible={showSlangDefinition}
            onClose={closeSlangDefinition}
            definition={slangDefinition.text}
            isLoading={slangDefinition.isLoading}
            error={slangDefinition.error}
            messageText={selectedMessage.text}
          />
        </>
      )}

      {/* Auto-Translate Info Modal */}
      <Modal
        visible={showTranslateInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTranslateInfo(false)}
      >
        <Pressable
          style={styles.infoModalOverlay}
          onPress={() => setShowTranslateInfo(false)}
        >
          <View style={styles.infoModalContainer}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>Auto-Translate</Text>
              <TouchableOpacity onPress={() => setShowTranslateInfo(false)}>
                <Text style={styles.infoModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoModalContent}>
              <View style={styles.infoModalRow}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIconGray}>🌐</Text>
                </View>
                <Text style={styles.infoModalText}>
                  <Text style={styles.infoModalBold}>Off (Gray):</Text> Messages appear in their original language
                </Text>
              </View>
              <View style={styles.infoModalRow}>
                <View style={[styles.infoIconContainer, styles.infoIconContainerActive]}>
                  <Text style={styles.infoIconActive}>🌐</Text>
                </View>
                <Text style={styles.infoModalText}>
                  <Text style={styles.infoModalBold}>On (Spinning):</Text> Messages are automatically translated to {getLanguageName(userPreferredLanguage)}
                </Text>
              </View>
              
              {/* Language Selection Section */}
              <View style={styles.infoModalDivider} />
              <View style={styles.infoModalLanguageSection}>
                <Text style={styles.infoModalLabel}>Your Preferred Language</Text>
                <TouchableOpacity
                  style={styles.infoModalLanguageButton}
                  onPress={() => {
                    setShowTranslateInfo(false);
                    setShowLanguageSelector(true);
                  }}
                  disabled={updatingLanguage}
                >
                  <Text style={styles.infoModalLanguageButtonText}>
                    {getLanguageName(userPreferredLanguage)}
                  </Text>
                  <Text style={styles.infoModalLanguageButtonArrow}>›</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={showLanguageSelector}
        selectedLanguage={userPreferredLanguage}
        onSelectLanguage={handleLanguageSelect}
        onClose={() => setShowLanguageSelector(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 250,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  groupInfoButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  groupInfoButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    textAlign: 'center',
  },
  headerPresenceText: {
    fontSize: 11,
    marginTop: 2,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 20,
    color: '#007AFF',
  },
  translateToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
  },
  translateToggleActive: {
    backgroundColor: '#007AFF',
  },
  translateToggleText: {
    fontSize: 16,
    opacity: 0.5, // Gray when off
  },
  translateToggleTextActive: {
    opacity: 1, // Full color when on
  },
  infoButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  infoButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  infoModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  infoModalClose: {
    fontSize: 24,
    color: '#8E8E93',
  },
  infoModalContent: {
    padding: 20,
  },
  infoModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoIconContainerActive: {
    backgroundColor: '#007AFF',
  },
  infoIconGray: {
    fontSize: 20,
    opacity: 0.5,
  },
  infoIconActive: {
    fontSize: 20,
  },
  infoModalText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#000',
  },
  infoModalBold: {
    fontWeight: '600',
  },
  infoModalNote: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoModalNoteText: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  infoModalDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 16,
  },
  infoModalLanguageSection: {
    gap: 8,
  },
  infoModalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoModalLanguageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  infoModalLanguageButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  infoModalLanguageButtonArrow: {
    fontSize: 24,
    color: '#8E8E93',
    fontWeight: '300',
  },
  languageBanner: {
    backgroundColor: '#F8F4E8',
    borderTopWidth: 1,
    borderTopColor: '#E5DFC8',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  languageBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageBannerIcon: {
    fontSize: 20,
    opacity: 0.7,
  },
  languageBannerTextContainer: {
    flex: 1,
    gap: 4,
  },
  languageBannerText: {
    fontSize: 13,
    color: '#5C5649',
    lineHeight: 18,
  },
  languageBannerLink: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  languageBannerClose: {
    padding: 4,
  },
  languageBannerCloseText: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '300',
  },
});

