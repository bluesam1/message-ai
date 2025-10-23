/**
 * AI Integration Example
 * 
 * This file demonstrates how to integrate AI features into the chat screen.
 * Copy this pattern into app/chat/[id].tsx
 */

import React from 'react';
import { View } from 'react-native';
import { Message } from '../../types/message';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import { MessageActions, MessageAction } from './MessageActions';
import { ContextExplanation } from './ContextExplanation';
import { SlangDefinition } from './SlangDefinition';
import MessageList from './MessageList';

interface AIIntegrationExampleProps {
  messages: Message[];
  currentUserId: string;
  userNames: Record<string, string>;
  userPhotoURLs: Record<string, string>;
  totalParticipants?: number;
  onRetryMessage?: (message: Message) => void;
}

/**
 * Example component showing AI features integration
 * 
 * TO INTEGRATE INTO CHAT SCREEN:
 * 1. Import useAIFeatures hook
 * 2. Import MessageActions, ContextExplanation, SlangDefinition components
 * 3. Add the AI state and handlers from useAIFeatures
 * 4. Pass onMessageLongPress and getTranslationState to MessageList
 * 5. Add the three modal components (MessageActions, ContextExplanation, SlangDefinition)
 */
export function AIIntegrationExample({
  messages,
  currentUserId,
  userNames,
  userPhotoURLs,
  totalParticipants,
  onRetryMessage,
}: AIIntegrationExampleProps) {
  // 1. Use AI features hook
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

  // 2. Define message actions
  const getMessageActions = (message: Message): MessageAction[] => [
    {
      id: 'translate',
      label: '🌐 Translate to English',
      onPress: () => handleTranslate(message, 'en'),
    },
    {
      id: 'explain',
      label: '💡 Explain Cultural Context',
      onPress: () => handleExplainContext(message),
    },
    {
      id: 'define',
      label: '📖 Define Slang/Idiom',
      onPress: () => handleDefineSlang(message),
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* 3. Message List with AI props */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        userNames={userNames}
        userPhotoURLs={userPhotoURLs}
        totalParticipants={totalParticipants}
        onRetryMessage={onRetryMessage}
        onMessageLongPress={handleMessageLongPress}
        getTranslationState={getTranslationState}
      />

      {/* 4. Message Actions Modal */}
      {selectedMessage && (
        <MessageActions
          visible={showActions}
          onClose={closeActions}
          message={selectedMessage}
          actions={getMessageActions(selectedMessage)}
        />
      )}

      {/* 5. Context Explanation Modal */}
      {selectedMessage && (
        <ContextExplanation
          visible={showContextExplanation}
          onClose={closeContextExplanation}
          explanation={contextExplanation.text}
          isLoading={contextExplanation.isLoading}
          error={contextExplanation.error}
          messageText={selectedMessage.text}
        />
      )}

      {/* 6. Slang Definition Modal */}
      {selectedMessage && (
        <SlangDefinition
          visible={showSlangDefinition}
          onClose={closeSlangDefinition}
          definition={slangDefinition.text}
          isLoading={slangDefinition.isLoading}
          error={slangDefinition.error}
          messageText={selectedMessage.text}
        />
      )}
    </View>
  );
}

/**
 * INTEGRATION STEPS FOR app/chat/[id].tsx:
 * 
 * 1. Add imports at the top:
 *    ```typescript
 *    import { useAIFeatures } from '../../src/hooks/useAIFeatures';
 *    import { MessageActions } from '../../src/components/chat/MessageActions';
 *    import { ContextExplanation } from '../../src/components/chat/ContextExplanation';
 *    import { SlangDefinition } from '../../src/components/chat/SlangDefinition';
 *    ```
 * 
 * 2. Inside the component, add the AI hook:
 *    ```typescript
 *    const {
 *      selectedMessage,
 *      showActions,
 *      showContextExplanation,
 *      showSlangDefinition,
 *      contextExplanation,
 *      slangDefinition,
 *      handleMessageLongPress,
 *      closeActions,
 *      handleTranslate,
 *      handleExplainContext,
 *      handleDefineSlang,
 *      closeContextExplanation,
 *      closeSlangDefinition,
 *      getTranslationState,
 *    } = useAIFeatures();
 *    ```
 * 
 * 3. Update MessageList props:
 *    ```typescript
 *    <MessageList
 *      // ... existing props
 *      onMessageLongPress={handleMessageLongPress}
 *      getTranslationState={getTranslationState}
 *    />
 *    ```
 * 
 * 4. Add the three modals before the closing tag of the main View:
 *    ```typescript
 *    {selectedMessage && (
 *      <>
 *        <MessageActions
 *          visible={showActions}
 *          onClose={closeActions}
 *          message={selectedMessage}
 *          actions={[
 *            {
 *              id: 'translate',
 *              label: '🌐 Translate to English',
 *              onPress: () => handleTranslate(selectedMessage, 'en'),
 *            },
 *            {
 *              id: 'explain',
 *              label: '💡 Explain Cultural Context',
 *              onPress: () => handleExplainContext(selectedMessage),
 *            },
 *            {
 *              id: 'define',
 *              label: '📖 Define Slang/Idiom',
 *              onPress: () => handleDefineSlang(selectedMessage),
 *            },
 *          ]}
 *        />
 *        <ContextExplanation
 *          visible={showContextExplanation}
 *          onClose={closeContextExplanation}
 *          explanation={contextExplanation.text}
 *          isLoading={contextExplanation.isLoading}
 *          error={contextExplanation.error}
 *          messageText={selectedMessage.text}
 *        />
 *        <SlangDefinition
 *          visible={showSlangDefinition}
 *          onClose={closeSlangDefinition}
 *          definition={slangDefinition.text}
 *          isLoading={slangDefinition.isLoading}
 *          error={slangDefinition.error}
 *          messageText={selectedMessage.text}
 *        />
 *      </>
 *    )}
 *    ```
 */

