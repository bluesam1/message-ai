/**
 * Cloud Functions for MessageAI
 * 
 * Clean exports from organized function structure
 */

// Initialize Firebase Admin
import * as admin from 'firebase-admin';
admin.initializeApp();

/**
 * Message Processing Functions
 */
export { processNewMessage } from './functions/processNewMessage';
export { batchTranslateMessages } from './functions/batchTranslateMessages';

/**
 * Contextual Functions
 */
export { explainContext } from './functions/explainContext';
export { defineSlang } from './functions/defineSlang';

/**
 * Smart Replies Functions
 */
export { 
  refreshSmartReplies,
  onConversationSettingsUpdated, 
  onConversationUpdated 
} from './functions/processSmartReplies';

/**
 * Messaging Functions
 */
export { rephraseMessage } from './functions/rephraseMessage';
export { detectLanguage } from './functions/detectLanguage';

/**
 * Presence Functions
 */
export { onPresenceChange } from './functions/onPresenceChange';