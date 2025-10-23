# PRD 2.2: Auto-Translation & Language Detection

**Phase:** 2 - International Communicator  
**Sub-Phase:** 2.2  
**Duration:** 6-8 hours  
**Dependencies:** Sub-Phase 2.1 complete (Cloud Functions + OpenAI working)

---

## 🎯 Objective

Make translation proactive and automatic by detecting incoming message languages and translating them based on user preferences. Implement the **Proactive Auto-Translate Orchestrator** (Advanced AI Capability) that autonomously detects, decides, translates, and remembers preferences for each conversation.

---

## 📋 Scope

### Feature 4: Language Detection & Auto-Translate

**User Experience**
- System automatically detects the language of incoming messages
- User can toggle "Auto-translate messages" per conversation
- User sets preferred language: "Always translate to [English/Spanish/French/etc.]"
- When enabled, incoming foreign messages automatically translate
- Loading indicator shows during translation
- User can tap to view original message
- Preferences persist across app restarts

**Technical Requirements**
- Detect message language automatically when message is received
- Store per-conversation preferences in Firestore (`aiPrefs` object)
- Create UI toggle in chat header for auto-translate on/off
- Add language selector for target language per conversation
- Display loading state during translation
- Cache translated results in Firestore
- Respect user preferences for all future messages

### Advanced AI Capability: Proactive Auto-Translate Orchestrator

**Multi-Step Autonomous Workflow**

This advanced feature demonstrates multi-step AI orchestration:

1. **Detect:** Identify incoming message language automatically
2. **Lookup:** Retrieve per-conversation user preferences
3. **Decide:** If `autoTranslate=true` and detected language ≠ target language, translate
4. **Persist:** Save detected language and translated text in message metadata
5. **Learn:** When user selects "Always translate to X", update conversation preferences
6. **Feedback:** Allow users to rate translations for quality tracking

**Requirements**
- Create Cloud Function that triggers on new message creation
- Implement language detection using OpenAI API
- Query conversation preferences from Firestore
- Make translation decision based on preferences
- Update message with translation result
- Track user feedback on translation quality
- Learn from user behavior (e.g., always manually translating → suggest auto-translate)

---

## 🗄️ Data Model Changes

### Firestore Schema Extensions

**conversations collection:**
Add `aiPrefs` object:

```typescript
aiPrefs: {
  targetLang: string,           // e.g., 'en', 'es', 'fr', 'de'
  autoTranslate: boolean,       // Enable/disable auto-translate
  defaultTone?: string          // For future formality features (Sub-Phase 2.3)
}
```

**messages collection:**
Extend `aiMeta` object:

```typescript
aiMeta: {
  detectedLang: string,         // Language code (e.g., 'en', 'es')
  translatedText: string,       // Translated message text
  feedback?: 'positive' | 'negative',  // User rating of translation
  ...existing fields from 2.1
}
```

---

## 👤 User Stories

**US-030:** As a user, I want messages in other languages to automatically translate so I don't have to manually request translation.

**US-031:** As a user, I can set "Always translate to English" for a specific conversation so all future messages translate automatically.

**US-032:** As a user, I can toggle auto-translate on/off per conversation based on my needs.

**US-033:** As a user, I want to see a loading indicator while messages are being translated so I know the system is working.

**US-034:** As a user, I can tap a translated message to view the original text and verify accuracy.

**US-035:** As a user, I can rate translations (helpful/not helpful) to improve future translations.

**US-036:** As a user, I want my translation preferences to persist across app restarts so I don't have to reconfigure.

---

## ✅ Success Criteria

### Functional Requirements
- [ ] Language detection accuracy > 90% (tested with 10+ languages)
- [ ] Auto-translate toggle works per conversation
- [ ] Target language selector shows common languages
- [ ] Preferences persist in Firestore and reload correctly
- [ ] Incoming messages auto-translate when enabled
- [ ] Users can view original message by tapping translation
- [ ] Translation quality feedback mechanism works
- [ ] System suggests auto-translate if user frequently manually translates

### Performance Targets
| Metric | Target | Maximum |
|--------|--------|---------|
| Language Detection | < 1s | 2s |
| Auto-Translation | < 3s | 5s |
| Preference Update | < 500ms | 1s |
| Translation Accuracy | 90%+ | 85% |

### Quality Requirements
- Language detection tested with short messages (5-10 words)
- Translation quality validated in 5+ language pairs
- Edge cases handled: emoji-only, mixed languages, very short text
- Preferences sync correctly across devices

---

## 🎨 UI/UX Requirements

### Chat Header Enhancements
- Add auto-translate toggle button (globe icon)
- Display current translation status: "🌐 Translating to English" when enabled
- Language selector dropdown for choosing target language
- Clear visual indicator when auto-translate is active

### Message Display
- Show small badge on auto-translated messages
- Loading spinner while translation in progress
- Tap to toggle between original and translation
- Option to disable auto-translate from message long-press menu

### Settings Integration
- Add translation preferences to conversation settings
- Show language selector with common languages first
- Include "Detect automatically" option for target language
- Display translation statistics (X messages translated)

---

## 🚫 Out of Scope

- Offline translation (requires internet connection)
- Voice message translation (text only)
- Image text extraction and translation (future feature)
- Translation of message reactions or emojis
- Custom translation models or fine-tuning

---

## 🧪 Testing Requirements

### Language Detection Testing
- [ ] Test with messages in 10+ languages
- [ ] Test with very short messages (3-5 words)
- [ ] Test with mixed-language messages
- [ ] Test with emoji-only messages (should handle gracefully)
- [ ] Test with code snippets (should not attempt translation)

### Auto-Translation Testing
- [ ] Enable auto-translate, send foreign message, verify translation appears
- [ ] Disable auto-translate, verify messages remain in original language
- [ ] Change target language mid-conversation, verify new language used
- [ ] Test with rapid message succession (10+ messages quickly)
- [ ] Verify cache prevents duplicate translations

### Preference Persistence Testing
- [ ] Set preferences, restart app, verify preferences loaded
- [ ] Change preferences, verify Firestore updated immediately
- [ ] Test with multiple conversations (different preferences per chat)
- [ ] Verify preferences sync across multiple devices

### Edge Case Testing
- [ ] Very long messages (500+ words)
- [ ] Messages with special characters or formatting
- [ ] Messages in unsupported languages (fallback behavior)
- [ ] API timeout or failure (graceful degradation)

---

## 📊 Performance Benchmarks

### Translation Performance
- Average translation time: < 2.5s
- 95th percentile: < 4s
- 99th percentile: < 5s

### Cost Efficiency
- Language detection: ~10-20 tokens per message
- Translation: ~100-300 tokens per message (depends on length)
- Target cost per message: < $0.02
- Cache hit rate target: > 70% (avoid re-translating same message)

### Reliability
- Translation success rate: > 99%
- Error recovery: Fallback to original message if translation fails
- Zero data loss: Original message always preserved

---

## 🔐 Security & Privacy Considerations

- User translation preferences stored securely in Firestore
- Translation happens server-side (no sensitive data in client)
- Rate limiting per user prevents abuse
- Firestore security rules ensure only conversation participants access preferences
- Option to disable translation for sensitive conversations

---

## 📝 Documentation Requirements

- [ ] Document language codes supported (ISO 639-1)
- [ ] Update README with auto-translate feature
- [ ] Create user guide for setting up auto-translate
- [ ] Document Firestore schema changes (aiPrefs)
- [ ] Add troubleshooting guide for translation issues

---

## 🎬 Demo Requirements

For sub-phase completion, demonstrate:

1. **Language Detection:** Send message in Spanish, system detects language
2. **Auto-Translate Setup:** Enable auto-translate for a conversation, select English
3. **Automatic Translation:** Receive foreign message, watch it auto-translate
4. **Toggle Original:** Tap translated message to view original
5. **Preference Persistence:** Restart app, verify auto-translate still enabled
6. **Multi-Language:** Test with 3+ different languages in same conversation

---

## 🚀 Deployment Checklist

- [ ] Cloud Function for auto-translate orchestrator deployed
- [ ] Firestore indexes created for conversation preferences
- [ ] Language detection API tested and working
- [ ] Cost monitoring set up (track token usage per translation)
- [ ] Error handling tested (API failures, timeouts)
- [ ] UI components integrated into chat screen
- [ ] Preferences migration script (if needed for existing conversations)

---

## 📈 Success Metrics

**Quantitative:**
- Language detection accuracy: > 90%
- Translation speed: < 3s average
- User adoption: > 50% of users enable auto-translate
- Cost per translation: < $0.02

**Qualitative:**
- Translation quality: Natural-sounding, accurate
- User satisfaction: Positive feedback on auto-translate
- Feature discovery: Users find auto-translate toggle easily

---

## 🏆 Rubric Alignment

**Advanced AI Capability (9-10 pts criteria):**

✅ **Multi-step context workflow:** 5-step orchestration (Detect → Lookup → Decide → Persist → Learn)

✅ **Context retention:** Stores and retrieves user preferences per conversation

✅ **Autonomous decision-making:** Decides whether to translate based on preferences without user input

✅ **Learning capability:** Updates preferences based on user behavior (feedback, manual translations)

✅ **Sophisticated integration:** Seamlessly integrates with existing messaging flow

---

## 🔄 Next Steps

Upon completion of Sub-Phase 2.2:
- Proceed to **Sub-Phase 2.3** (Smart Composition & AI Replies)
- Use established auto-translate patterns for smart reply generation
- Consider adding tone preference to aiPrefs for formality adjustment

---

**Status:** Not Started  
**Assigned To:** TBD  
**Target Completion:** TBD

