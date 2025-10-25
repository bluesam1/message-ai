# PRD 2.3: Smart Composition & AI Replies

**Phase:** 2 - International Communicator  
**Sub-Phase:** 2.3  
**Duration:** 4-6 hours  
**Dependencies:** Sub-Phase 2.1 (Cloud Functions), Sub-Phase 2.2 (preferences system)

---

## 🎯 Objective

Enhance message composition with AI-powered tone control and intelligent reply suggestions. Deliver **Context-Aware Smart Replies v2** (Advanced AI Capability) that generates relevant, contextual replies based on conversation history, tone, and language preferences.

---

## 📋 Scope

### Feature 5: Formality Adjustment

**User Experience**
- User types a message in the composer
- Taps "Rephrase" button in toolbar
- Selects "Make it Formal" or "Make it Casual"
- System rewrites message in requested tone
- Preview shows rewritten text
- User can accept, reject, or edit before sending
- System remembers preferred tone per conversation

**Tone Adjustment Mode (Real-time)**
- User enables tone adjustment mode in settings
- As user types, system automatically generates tone-adjusted version
- Debounced every 2 seconds to avoid excessive API calls
- Rewritten message appears above text input as a suggestion chip
- User can tap chip to replace current message with adjusted version
- User can disable real-time mode at any time

**Technical Requirements**
- Add "Rephrase" button to message composer toolbar
- Create modal with "Formal" and "Casual" options
- Call Cloud Function `/rephraseMessage` to rewrite message using OpenAI
- Display preview of rewritten message
- Allow user to accept or reject rewrite
- Store tone preference in conversation `aiPrefs.defaultTone`
- Implement real-time tone adjustment with 2-second debounce
- Display tone-adjusted suggestions above message input
- Allow user to toggle real-time mode on/off

### Advanced AI Capability: Context-Aware Smart Replies v2

**User Experience**
- Three quick reply chips appear above message input
- Replies are relevant to recent conversation context
- Replies match conversation language automatically
- Replies reflect conversation tone (formal/casual based on history)
- User taps chip to insert reply (editable before sending)
- Chips refresh when new messages arrive
- Replies are concise (10-30 words each)

**Multi-Step Contextual Workflow**

This advanced feature demonstrates sophisticated AI orchestration:

1. **Retrieve:** Pull last 5-10 messages from Firestore
2. **Infer:** Determine conversation language and tone from message history and `aiPrefs`
3. **Generate:** Ask GPT to produce 3 relevant replies using consistent tone and language
4. **Filter:** Post-process results (limit length, remove inappropriate content)
5. **Return:** Send structured JSON with replies to client

**Technical Requirements**
- Create Cloud Function `/generateSmartReplies`
- Fetch recent message history (5-10 messages)
- Read conversation `aiPrefs` for language and tone
- Analyze conversation context and sentiment
- Generate 3 diverse, relevant reply options
- Cache replies per conversation per user (invalidate on new message)
- Update UI with chips above message input
- Implement 2-second debounce for reply generation
- Handle API failures with fallback message: "AI had a hard time fulfilling your request. Try again later."

---

## 🗄️ Data Model Changes

### Firestore Schema Extensions

**conversations collection:**
Update `aiPrefs` object:

```typescript
aiPrefs: {
  ...existing fields,
  defaultTone?: 'formal' | 'casual' | 'neutral',  // User's preferred tone
  realTimeToneAdjustment?: boolean,                // Enable real-time tone suggestions
  lastReplyStyle?: string                         // Track reply style for learning
}
```

**conversations collection:**
Add smart replies cache per conversation:

```typescript
smartRepliesCache?: {
  replies: string[],
  lastUpdated: Timestamp,
  userId: string
}
```

**messages collection:**
Extend `aiMeta` object:

```typescript
aiMeta: {
  ...existing fields,
  rephraseHistory?: {
    original: string,
    formal?: string,
    casual?: string
  }
}
```

---

## 👤 User Stories

**US-037:** As a user, I can rephrase my message to be more formal before sending to a professional contact.

**US-038:** As a user, I can rephrase my message to be more casual when chatting with friends.

**US-039:** As a user, I want to preview the rephrased message before accepting it.

**US-040:** As a user, I want the system to remember my tone preference so future messages can be pre-adjusted.

**US-040a:** As a user, I can enable real-time tone adjustment to see suggestions as I type.

**US-041:** As a user, I see 3 quick reply suggestions that match the conversation context.

**US-042:** As a user, I want smart replies to match the language I'm using in the conversation.

**US-043:** As a user, I can tap a smart reply to insert it, then edit before sending if needed.

**US-044:** As a user, I want smart replies to refresh when new messages arrive.

---

## ✅ Success Criteria

### Functional Requirements
- [ ] Formality adjustment produces natural, appropriate rewrites
- [ ] Preview modal allows user to accept/reject rephrased message
- [ ] Tone preference persists per conversation
- [ ] Real-time tone adjustment works with 2-second debounce
- [ ] Tone-adjusted suggestions appear above message input
- [ ] User can toggle real-time mode on/off
- [ ] Smart replies display above message input
- [ ] 3 diverse, relevant replies generated
- [ ] Replies match conversation language (80%+ accuracy)
- [ ] Replies reflect conversation tone
- [ ] Replies refresh on new message (with 2-second debounce)
- [ ] User can tap chip to insert reply into composer
- [ ] API failures show fallback message instead of crashing

### Performance Targets
| Metric | Target | Maximum |
|--------|--------|---------|
| Rephrase Response | < 2s | 3s |
| Smart Replies Generation | < 2.5s | 4s |
| Reply Insertion (tap chip) | < 50ms | 100ms |

### Quality Requirements
- Formality adjustments sound natural (manual validation with 10+ test messages)
- Smart replies relevant to context (80%+ useful responses)
- Replies diverse (not repetitive or generic)
- Language matching: > 95% accuracy

---

## 🎨 UI/UX Requirements

### Formality Adjustment UI
- "Rephrase" button in message composer toolbar (icon: ✏️ or 🔄)
- Modal with two large buttons: "Make it Formal" | "Make it Casual"
- Preview screen showing original vs. rephrased side-by-side
- "Use This" and "Cancel" buttons
- Optional: "Always use [formal/casual] tone" checkbox
- Settings toggle for "Real-time tone adjustment"

### Real-time Tone Adjustment UI
- Tone-adjusted suggestion chip appears above message input
- Chip shows "Formal version" or "Casual version" with preview
- Tap chip to replace current message with adjusted version
- Chip disappears after user continues typing
- Loading state while generating adjustment
- Toggle in settings to enable/disable feature

### Smart Replies UI
- Three pill-shaped chips above message input
- Chips scroll horizontally if text overflows
- Subtle animation when chips appear/refresh
- Loading state while generating replies
- Tap chip inserts text into composer (cursor at end)
- Chips disappear after user starts typing (to avoid clutter)
- Empty state if replies unavailable ("Thinking...")
- Fallback message on API failure: "AI had a hard time fulfilling your request. Try again later."

### Composer Layout
```
┌──────────────────────────────────────┐
│  [Chip 1]  [Chip 2]  [Chip 3]       │ ← Smart Replies
├──────────────────────────────────────┤
│  [Tone-adjusted suggestion chip]     │ ← Real-time Tone (if enabled)
├──────────────────────────────────────┤
│  Type a message...                   │ ← Message Input
├──────────────────────────────────────┤
│  [📷] [🎤] [✏️] [➤]                  │ ← Toolbar
└──────────────────────────────────────┘
```

---

## 🚫 Out of Scope

- Grammar correction (different from tone adjustment)
- Translation within composer (handled by Sub-Phase 2.2)
- Voice-to-text or dictation features
- Custom tone templates beyond formal/casual
- Sentiment analysis or emotion detection

---

## 🧪 Testing Requirements

### Formality Adjustment Testing
- [ ] Test with casual messages → formal (slang removed, proper grammar)
- [ ] Test with formal messages → casual (relaxed, friendly tone)
- [ ] Test with very short messages (< 5 words)
- [ ] Test with very long messages (100+ words)
- [ ] Test with messages in multiple languages
- [ ] Verify tone preference saves and applies
- [ ] Test real-time tone adjustment with 2-second debounce
- [ ] Test tone suggestion chip appears and disappears correctly
- [ ] Test toggling real-time mode on/off

### Smart Replies Testing
- [ ] Test in short conversations (2-3 messages)
- [ ] Test in long conversations (20+ messages)
- [ ] Test in multiple languages (English, Spanish, French)
- [ ] Test in formal vs. casual conversations
- [ ] Verify replies are diverse (not all saying same thing)
- [ ] Test rapid message succession (replies refresh appropriately)
- [ ] Test with emoji-heavy messages
- [ ] Test with question messages (replies should answer)

### Context Awareness Testing
- [ ] Send a question → verify replies answer it
- [ ] Express emotion → verify replies match sentiment
- [ ] Switch topics → verify replies follow new context
- [ ] Test in group chat (replies address group, not individual)

### Performance Testing
- [ ] Generate replies for 100 conversations, measure average time
- [ ] Test cache effectiveness (repeated views use cached replies)
- [ ] Measure token usage per request
- [ ] Verify UI remains responsive during generation
- [ ] Test API failure scenarios with fallback message
- [ ] Verify 2-second debounce works correctly for both features

---

## 📊 Performance Benchmarks

### Formality Adjustment
- Average response time: < 2s
- Success rate: > 99%
- Natural language quality: Manual review, 90%+ acceptable

### Smart Replies
- Average generation time: < 2.5s
- Reply relevance: 80%+ rated "useful" in user testing
- Language matching: > 95% accuracy
- Diversity score: Levenshtein distance between replies > 50%

### Cost Efficiency
- Rephrase: ~50-100 tokens per request
- Real-time tone adjustment: ~50-100 tokens per request (2-second debounce)
- Smart replies: ~200-400 tokens per request
- Target cost per use: < $0.03
- Cache hit rate for repeated views: > 50%
- Debounce reduces API calls by ~70% for real-time features

---

## 🔐 Security & Privacy Considerations

- Message content sent to OpenAI only when user explicitly requests rephrase or enables real-time mode
- Smart replies generated server-side (no client-side API keys)
- Rate limiting per user to prevent abuse
- Conversation context limited to last 10 messages (privacy)
- No storage of rejected rephrases or unused replies
- Real-time tone adjustment respects user privacy settings
- API failures handled gracefully without exposing internal errors

---

## 📝 Documentation Requirements

- [ ] Update README with smart composition features
- [ ] Document tone preference system
- [ ] Create user guide for formality adjustment
- [ ] Document real-time tone adjustment feature
- [ ] Document smart replies generation workflow
- [ ] Add troubleshooting guide for common issues
- [ ] Document API failure handling and fallback behavior

---

## 🎬 Demo Requirements

For sub-phase completion, demonstrate:

1. **Formality Adjustment:** Type casual message, rephrase to formal, show preview, send
2. **Tone Persistence:** Show conversation preferences save and apply
3. **Real-time Tone Adjustment:** Enable feature, type message, show tone suggestion chip appears
4. **Smart Replies Generation:** Open chat, see 3 relevant replies appear
5. **Reply Insertion:** Tap smart reply chip, edit, send
6. **Context Awareness:** Send different messages, show replies adapt to context
7. **Multi-Language:** Test smart replies in English and one other language
8. **API Failure Handling:** Simulate API failure, show fallback message

---

## 🚀 Deployment Checklist

- [ ] Cloud Function `/rephraseMessage` deployed
- [ ] Cloud Function `/generateSmartReplies` deployed
- [ ] UI components integrated into message composer
- [ ] Formality adjustment modal implemented
- [ ] Real-time tone adjustment implemented
- [ ] Smart reply chips implemented
- [ ] Firestore schema updated (aiPrefs.defaultTone, realTimeToneAdjustment, smartRepliesCache)
- [ ] Error handling tested (API failures with fallback message)
- [ ] Cost monitoring configured
- [ ] 2-second debounce implemented for both features

---

## 📈 Success Metrics

**Quantitative:**
- Rephrase response time: < 2s average
- Smart replies relevance: > 80% useful
- User adoption: > 30% of users try smart replies within first week
- Reply usage rate: > 50% of smart replies are actually sent

**Qualitative:**
- Formality adjustments sound natural and appropriate
- Smart replies feel relevant and helpful
- Users discover features easily (good discoverability)

---

## 🏆 Rubric Alignment

**Advanced AI Capability (9-10 pts criteria):**

✅ **Multi-step context workflow:** 5-step process (Retrieve → Infer → Generate → Filter → Return)

✅ **Context retention:** Uses message history and conversation preferences

✅ **Sophisticated reasoning:** Infers tone, language, and sentiment from context

✅ **Adaptive responses:** Replies adapt to conversation style and topic changes

✅ **Seamless integration:** Natural part of messaging experience

---

## 🔄 Next Steps

Upon completion of Sub-Phase 2.3:
- Proceed to **Sub-Phase 2.4** (UX & Engagement Features)
- All 5 required AI features complete
- Both advanced AI capabilities complete
- Focus shifts to engagement and polish

---

**Status:** Not Started  
**Assigned To:** TBD  
**Target Completion:** TBD

