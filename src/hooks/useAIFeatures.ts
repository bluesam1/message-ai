import { useState } from 'react';
import { Message } from '../types/message';
import { translateMessage } from '../services/ai/translationService';
import { explainMessageContext } from '../services/ai/contextService';
import { defineMessageSlang } from '../services/ai/definitionService';
import { getUserLanguage } from '../services/user/userPreferencesService';
import { useAuth } from '../store/AuthContext';

interface AIState {
  selectedMessage: Message | null;
  showActions: boolean;
  showContextExplanation: boolean;
  showSlangDefinition: boolean;
  translationStates: Record<string, {
    translatedText: string | null;
    targetLanguage: string;
    isLoading: boolean;
    error: string | null;
  }>;
  contextExplanation: {
    text: string | null;
    isLoading: boolean;
    error: string | null;
  };
  slangDefinition: {
    text: string | null;
    isLoading: boolean;
    error: string | null;
  };
}

export function useAIFeatures() {
  const { user } = useAuth();
  const [aiState, setAIState] = useState<AIState>({
    selectedMessage: null,
    showActions: false,
    showContextExplanation: false,
    showSlangDefinition: false,
    translationStates: {},
    contextExplanation: {
      text: null,
      isLoading: false,
      error: null,
    },
    slangDefinition: {
      text: null,
      isLoading: false,
      error: null,
    },
  });

  /**
   * Handle long press on a message
   */
  const handleMessageLongPress = (message: Message) => {
    setAIState((prev) => ({
      ...prev,
      selectedMessage: message,
      showActions: true,
    }));
  };

  /**
   * Close the actions modal
   */
  const closeActions = () => {
    setAIState((prev) => ({
      ...prev,
      showActions: false,
    }));
  };

  /**
   * Translate a message
   */
  const handleTranslate = async (message: Message, targetLanguage: string = 'en') => {
    const messageId = message.id;

    // Set loading state
    setAIState((prev) => ({
      ...prev,
      translationStates: {
        ...prev.translationStates,
        [messageId]: {
          translatedText: message.aiMeta?.translatedText?.[targetLanguage] || null,
          targetLanguage,
          isLoading: true,
          error: null,
        },
      },
    }));

    try {
      const translatedText = await translateMessage(message, targetLanguage);
      
      // Update with translation
      setAIState((prev) => ({
        ...prev,
        translationStates: {
          ...prev.translationStates,
          [messageId]: {
            translatedText,
            targetLanguage,
            isLoading: false,
            error: null,
          },
        },
      }));
    } catch (error: any) {
      console.error('Translation failed:', error);
      setAIState((prev) => ({
        ...prev,
        translationStates: {
          ...prev.translationStates,
          [messageId]: {
            translatedText: null,
            targetLanguage,
            isLoading: false,
            error: error.message || 'Translation failed',
          },
        },
      }));
    }
  };

  /**
   * Explain context for a message
   */
  const handleExplainContext = async (message: Message) => {
    console.log('[useAIFeatures] Starting context explanation for message:', message.id);
    
    // Always reset state first
    setAIState((prev) => ({
      ...prev,
      selectedMessage: message,
      showContextExplanation: true,
      contextExplanation: {
        text: null, // Always start fresh
        isLoading: true,
        error: null,
      },
    }));

    // Small delay to ensure state is updated
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Get user's preferred language for the explanation
      const userLanguage = user ? await getUserLanguage(user.uid) : 'en';
      console.log('[useAIFeatures] User language:', userLanguage);
      console.log('[useAIFeatures] Message language:', message.aiMeta?.detectedLang);
      
      const explanation = await explainMessageContext(message, userLanguage, true); // Force refresh
      console.log('[useAIFeatures] Received explanation:', explanation);
      
      setAIState((prev) => ({
        ...prev,
        contextExplanation: {
          text: explanation,
          isLoading: false,
          error: null,
        },
      }));
    } catch (error: any) {
      console.error('[useAIFeatures] Context explanation failed:', error);
      setAIState((prev) => ({
        ...prev,
        contextExplanation: {
          text: null,
          isLoading: false,
          error: error.message || 'Failed to get explanation',
        },
      }));
    }
  };

  /**
   * Define slang for a message
   */
  const handleDefineSlang = async (message: Message) => {
    setAIState((prev) => ({
      ...prev,
      selectedMessage: message,
      showSlangDefinition: true,
      slangDefinition: {
        text: message.aiMeta?.slangDefinition || null,
        isLoading: true,
        error: null,
      },
    }));

    try {
      const userLanguage = user ? await getUserLanguage(user.uid) : 'en';
      const definition = await defineMessageSlang(message, userLanguage);
      
      setAIState((prev) => ({
        ...prev,
        slangDefinition: {
          text: definition,
          isLoading: false,
          error: null,
        },
      }));
    } catch (error: any) {
      console.error('Slang definition failed:', error);
      setAIState((prev) => ({
        ...prev,
        slangDefinition: {
          text: null,
          isLoading: false,
          error: error.message || 'Failed to get definition',
        },
      }));
    }
  };

  /**
   * Close context explanation modal
   */
  const closeContextExplanation = () => {
    setAIState((prev) => ({
      ...prev,
      showContextExplanation: false,
      contextExplanation: {
        text: null,
        isLoading: false,
        error: null,
      },
    }));
  };

  /**
   * Close slang definition modal
   */
  const closeSlangDefinition = () => {
    setAIState((prev) => ({
      ...prev,
      showSlangDefinition: false,
      slangDefinition: {
        text: null,
        isLoading: false,
        error: null,
      },
    }));
  };

  /**
   * Get translation state for a message
   */
  const getTranslationState = (messageId: string) => {
    return aiState.translationStates[messageId] || null;
  };

  return {
    // State
    selectedMessage: aiState.selectedMessage,
    showActions: aiState.showActions,
    showContextExplanation: aiState.showContextExplanation,
    showSlangDefinition: aiState.showSlangDefinition,
    contextExplanation: aiState.contextExplanation,
    slangDefinition: aiState.slangDefinition,
    
    // Actions
    handleMessageLongPress,
    closeActions,
    handleTranslate,
    handleExplainContext,
    handleDefineSlang,
    closeContextExplanation,
    closeSlangDefinition,
    getTranslationState,
  };
}

