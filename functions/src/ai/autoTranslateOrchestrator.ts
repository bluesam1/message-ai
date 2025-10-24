import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { detectLanguage } from '../utils/languageDetection';
import { translateText } from '../utils/translation';

/**
 * Auto-Translate Orchestrator
 * 
 * Firestore-triggered Cloud Function that automatically translates incoming messages
 * based on per-conversation user preferences.
 * 
 * Workflow:
 * 1. Detect: Identify incoming message language
 * 2. Lookup: Retrieve conversation aiPrefs
 * 3. Decide: Check if auto-translate is enabled and languages differ
 * 4. Translate: Call OpenAI to translate
 * 5. Persist: Save translation in message aiMeta
 * 
 * Triggered on: New message creation in /messages/{messageId}
 */
export const autoTranslateOrchestrator = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { messageId } = context.params;
    const { conversationId, senderId, text } = message;
    
    console.log(`[Auto-Translate] Processing message ${messageId} in conversation ${conversationId}`);
    
    try {
      // Skip if message has no text or is too short
      if (!text || text.trim().length < 3) {
        console.log(`[Auto-Translate] Skipping: message too short or empty`);
        return null;
      }
      
      // Skip if message already has detected language (avoid re-processing)
      if (message.aiMeta?.detectedLang) {
        console.log(`[Auto-Translate] Skipping: language already detected (${message.aiMeta.detectedLang})`);
        return null;
      }
      
      // Step 1: Detect message language
      console.log(`[Auto-Translate] Step 1: Detecting language...`);
      const detectedLanguage = await detectMessageLanguage(text, senderId);
      
      if (detectedLanguage === 'unknown') {
        console.log(`[Auto-Translate] Skipping: language detection failed`);
        
        // Still save the 'unknown' detection to avoid re-processing
        await snap.ref.update({
          'aiMeta.detectedLang': 'unknown',
        });
        
        return null;
      }
      
      console.log(`[Auto-Translate] Detected language: ${detectedLanguage}`);
      
      // Step 2: Query conversation preferences
      console.log(`[Auto-Translate] Step 2: Retrieving conversation preferences...`);
      const conversationRef = admin.firestore().doc(`conversations/${conversationId}`);
      const conversationDoc = await conversationRef.get();
      
      if (!conversationDoc.exists) {
        console.log(`[Auto-Translate] Skipping: conversation not found`);
        return null;
      }
      
      const conversation = conversationDoc.data()!;
      const aiPrefsMap = conversation.aiPrefs || {};
      const participants = conversation.participants || [];
      
      // Step 3: Decision logic - translate for each recipient who wants it
      console.log(`[Auto-Translate] Step 3: Checking recipients' preferences...`);
      
      // Get recipients (all participants except sender)
      const recipients = participants.filter((uid: string) => uid !== senderId);
      
      if (recipients.length === 0) {
        console.log(`[Auto-Translate] No recipients found`);
        await snap.ref.update({
          'aiMeta.detectedLang': detectedLanguage,
        });
        return null;
      }
      
      // Collect unique target languages that need translation
      const translationsNeeded = new Set<string>();
      
      for (const recipientId of recipients) {
        const recipientPrefs = aiPrefsMap[recipientId];
        
        if (recipientPrefs && recipientPrefs.autoTranslate) {
          const targetLang = recipientPrefs.targetLang;
          
          // Only translate if language differs
          if (detectedLanguage !== targetLang) {
            translationsNeeded.add(targetLang);
            console.log(`[Auto-Translate] Recipient ${recipientId} wants translation to ${targetLang}`);
          }
        }
      }
      
      if (translationsNeeded.size === 0) {
        console.log(`[Auto-Translate] No translations needed - all recipients either have no prefs, disabled auto-translate, or already in their target language`);
        await snap.ref.update({
          'aiMeta.detectedLang': detectedLanguage,
        });
        return null;
      }
      
      console.log(`[Auto-Translate] Decision: TRANSLATE from ${detectedLanguage} to [${Array.from(translationsNeeded).join(', ')}]`);
      
      // Step 4: Translate to each needed language
      console.log(`[Auto-Translate] Step 4: Translating message...`);
      const translations: { [lang: string]: string } = {};
      
      for (const targetLang of translationsNeeded) {
        const { translatedText, tokensUsed } = await translateMessageText(
          text,
          targetLang,
          senderId
        );
        
        translations[targetLang] = translatedText;
        console.log(`[Auto-Translate] Translated to ${targetLang} (${tokensUsed} tokens)`);
      }
      
      // Step 5: Persist the results
      console.log(`[Auto-Translate] Step 5: Saving translations...`);
      const updateData: any = {
        'aiMeta.detectedLang': detectedLanguage,
      };
      
      // Add each translation
      for (const [lang, translation] of Object.entries(translations)) {
        updateData[`aiMeta.translatedText.${lang}`] = translation;
      }
      
      await snap.ref.update(updateData);
      
      console.log(`[Auto-Translate] Successfully auto-translated message ${messageId} to ${translations.length} language(s)`);
      
      return null;
    } catch (error) {
      console.error(`[Auto-Translate] Error processing message ${messageId}:`, error);
      
      // Don't throw - we don't want to block message delivery
      // Just log the error and continue
      return null;
    }
  });

/**
 * Detect the language of a message using OpenAI
 */
async function detectMessageLanguage(text: string, userId: string): Promise<string> {
  try {
    // Handle edge cases
    if (text.length < 3) {
      return 'unknown';
    }
    
    // Check if text is only emojis/symbols
    const textWithoutEmojis = text.replace(/[\p{Emoji}\p{Symbol}\s]/gu, '');
    if (textWithoutEmojis.length === 0) {
      return 'unknown';
    }
    
    return await detectLanguage(text, userId);
  } catch (error) {
    console.error('[Auto-Translate] Error detecting language:', error);
    return 'unknown';
  }
}

/**
 * Translate text using OpenAI
 */
async function translateMessageText(
  text: string,
  targetLang: string,
  userId: string
): Promise<{ translatedText: string; tokensUsed: number }> {
  const translatedText = await translateText(text, targetLang, undefined, userId);
  
  return {
    translatedText: translatedText.trim(),
    tokensUsed: 0, // Token usage is logged in the utility function
  };
}

