# PRD 2.3.1: Context-Aware Smart Replies with RAG

**Phase:** 2 - International Communicator  
**Sub-Phase:** 2.3.1  
**Duration:** 8-10 hours  
**Dependencies:** PRD 2.3 (Smart Composition & AI Replies) in progress

---

## 🎯 Objective

Enhance smart replies with Retrieval-Augmented Generation (RAG) to provide contextually relevant, conversation-aware reply suggestions that automatically regenerate on new messages.

---

## 📋 Scope

### Core RAG Pipeline (8-Step Process)

1. **Retrieval**: Extract last 30 messages from current conversation
2. **Context Extraction**: Analyze conversation topics, sentiment, participants using GPT-4o-mini
3. **Relevance Scoring**: Weight messages by recency, engagement, and importance
4. **Entity Recognition**: Extract key entities (names, places, topics, dates)
5. **Augmentation**: Build enriched prompt with conversation context, user language preference, and conversation tone preference
6. **Generation**: Generate 3 contextually relevant smart replies matching the conversation tone
7. **Post-Processing**: Rank replies by relevance, diversity, and tone consistency
8. **Caching**: Store results in Firestore with context analysis metadata

### Parallelization Strategy

- **Steps 2-4**: Run Context Extraction, Relevance Scoring, and Entity Recognition in parallel
- **Language Detection**: Execute concurrently with Context Extraction
- **Tone Detection**: Run in parallel with Entity Recognition
- **Settings Retrieval**: Fetch conversation settings concurrently with message retrieval
- **Optimization Target**: Reduce total pipeline time from 30s to < 15s through parallelization

### Auto-Generation & Caching

- Smart replies generate automatically on every new message
- Proactive generation before user opens conversation
- Cache per conversation per user indefinitely
- Store context analysis metadata for debugging/improvement
- Respect user's language preferences in generation
- **Tone Integration**: Generate replies matching conversation tone preference
- **Tone Preference Setting**: Gear icon dropdown menu (replaces translation toggle)
- **Auto-Translate Settings**: Move auto-translate toggle to conversation settings dialog
- **Auto-Translate Visual**: Spinning globe below conversation name when enabled
- **Tone Indicator**: Show tone name with icon (e.g., "Formal 📝", "Casual 😊", "Auto 🤖")
- **Auto-Detection**: Detect tone from user's message history (no user prompts)
- **Individual Settings**: Each user has independent tone preferences
- **Language Detection**: Use user's latest message language, fallback to other participant's language if user hasn't written in 30 messages
- **Empty Conversation Handling**: Generate general greeting smart replies when no conversation history exists

### UI/UX Requirements

- Auto-display smart replies without user interaction
- Loading spinner during generation (max 1 minute timeout)
- Subtle "Smart Replies" label at top of section
- Hide smart replies when user is offline
- Manual regeneration option if generation fails
- **Carousel Interface**: Show 1 smart reply at a time with swipe navigation
- **Minimal Real Estate**: Compact design that doesn't dominate the input area
- **Swipe Indicators**: Subtle dots or indicators showing available replies

---

## 🗄️ Data Model Changes

### New Firestore Collection: `smartReplies`

```typescript
interface SmartReplies {
  id: string;                    // conversationId_userId
  conversationId: string;
  userId: string;
  replies: string[];             // 3 generated replies
  contextAnalysis: {
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    entities: string[];
    language: string;
    tone: 'formal' | 'casual' | 'auto';
    messageCount: number;
    analyzedAt: number;
  };
  generatedAt: number;
  expiresAt?: number;            // Optional expiration
}
```

### New Firestore Collection: `conversationSettings`

```typescript
interface ConversationSettings {
  id: string;                    // conversationId_userId
  conversationId: string;
  userId: string;
  tonePreference: 'formal' | 'casual' | 'auto';
  languagePreference: string;    // User's target language
  autoTranslate: boolean;
  smartRepliesEnabled: boolean;
  updatedAt: number;
}
```

### Firestore Triggers

- **onMessageCreate**: Trigger smart reply regeneration
- **onConversationUpdate**: Regenerate if participants change
- **onConversationSettingsUpdate**: Regenerate smart replies when tone preference changes

### Architecture Hints

- **Conversation Settings Per User**: Each user has individual settings per conversation
- **Tone Integration**: Smart replies must respect conversation tone preference
- **Settings UI**: Replace real-time translation toggle with gear icon dropdown menu
- **Auto-Translate Integration**: Move auto-translate toggle to conversation settings dialog with standard toggle control
- **Auto-Translate Indicator**: Show spinning globe below conversation name when auto-translate is enabled
- **Tone Indicator**: Show tone name with small icon (e.g., "Formal 📝" or "Casual 😊")
- **Settings Persistence**: Conversation settings persist across app sessions
- **Auto-Detection**: Auto-detect tone from conversation history, emphasizing user's tone over other participants
- **Auto Tone Mode**: When 'auto' is selected, system automatically detects and applies appropriate tone from conversation context
- **No User Prompts**: Never prompt user to set tone preference
- **Immediate Regeneration**: Smart replies regenerate immediately when tone preference changes
- **Individual Preferences**: Each user has independent tone preferences (no conversation-wide settings)
- **AI Trust**: Let AI do its best without tone validation
- **Language Priority**: Use user's latest message language, fallback to other participant's message language if user hasn't written in 30 messages
- **Empty Conversation Fallback**: Generate general greeting smart replies when no conversation history exists

---

## 👤 User Stories

- **US-060**: As a user, I want smart replies that understand our conversation context so I can respond more naturally.
- **US-061**: As a user, I want smart replies to automatically update when new messages arrive so they stay relevant.
- **US-062**: As a user, I want smart replies in my preferred language so I can use them effectively.
- **US-063**: As a user, I want to see when smart replies are generating so I know the system is working.
- **US-064**: As a user, I want to manually regenerate smart replies if they fail so I'm not stuck without options.
- **US-065**: As a user, I want to set a tone preference for each conversation so smart replies match the conversation style.
- **US-074**: As a user, I want an 'Auto' tone option that automatically detects and applies the appropriate tone from the conversation context.
- **US-066**: As a user, I want to see the current tone preference in the conversation so I know what style replies will be generated.
- **US-067**: As a user, I want the system to automatically detect the conversation tone from my message history so I don't have to set it manually.
- **US-068**: As a user, I want my tone preferences to be independent from other participants in group chats.
- **US-069**: As a user, I want to access auto-translate settings through the conversation settings dialog so I can manage all conversation preferences in one place.
- **US-070**: As a user, I want to see a visual indicator when auto-translate is active so I know messages are being translated.
- **US-071**: As a user, I want smart replies in the language I typically use in this conversation so they feel natural to me.
- **US-072**: As a user, I want helpful greeting smart replies when starting a new conversation so I can begin the conversation easily.
- **US-073**: As a user, I want smart replies to generate quickly so I don't have to wait long for suggestions.

---

## ✅ Success Criteria

### Functional Requirements
- [ ] 8-step RAG pipeline implemented and working
- [ ] Smart replies auto-generate on new messages
- [ ] Proactive generation before conversation opens
- [ ] Context analysis stored with metadata
- [ ] Loading states and error handling
- [ ] Language preference integration
- [ ] Offline behavior (hide when offline)
- [ ] Tone preference setting per conversation (gear icon dropdown)
- [ ] Tone indicator in conversation header (tone name + icon)
- [ ] Smart replies respect conversation tone preference
- [ ] Conversation settings persistence
- [ ] Auto-detect tone from conversation history (emphasizing user's tone)
- [ ] Immediate smart reply regeneration on tone change
- [ ] Individual tone preferences per user (no conversation-wide settings)
- [ ] Auto-translate toggle moved to conversation settings dialog
- [ ] Spinning globe indicator below conversation name when auto-translate enabled
- [ ] Smart reply language detection (user's latest messages, fallback to other participant's messages)
- [ ] General greeting smart replies for empty conversations
- [ ] Parallel execution of RAG pipeline steps (Context Extraction, Relevance Scoring, Entity Recognition)
- [ ] Concurrent language and tone detection
- [ ] Parallel settings retrieval with message retrieval
- [ ] Auto tone mode that dynamically detects and applies appropriate tone from conversation context

### Performance Targets
| Metric | Target | Maximum |
|--------|--------|---------|
| Smart Reply Generation | < 15s | 30s |
| Context Analysis | < 5s | 10s |
| Cache Hit Rate | > 80% | 70% |
| UI Response | < 100ms | 200ms |
| Parallel Execution | 50% time reduction | 30% time reduction |

### Quality Requirements
- Smart replies are contextually relevant to conversation
- Replies respect user's language preferences
- System gracefully handles failures
- No impact on existing messaging performance

---

## 🎨 UI/UX Requirements

### Smart Replies Display
- Auto-appear below message input in compact carousel
- Show 1 reply at a time with swipe navigation
- Subtle "Smart Replies" label above
- Swipe indicators (dots) showing 3 total replies
- Loading spinner during generation
- Error state with retry button
- Minimal height to preserve input area space

### Loading States
- Spinner animation during generation
- "Generating smart replies..." text
- Disabled state for reply chips
- Timeout after 60 seconds

### Error Handling
- "Failed to generate smart replies" message
- "Retry" button for manual regeneration
- Fallback to empty state (no smart replies shown)

---

## 🚫 Out of Scope

- Cross-conversation context analysis
- User style learning (Phase 2)
- Vector database implementation
- Advanced personalization
- Smart reply editing by users
- Rate limiting implementation
- Global tone preferences (per-conversation only)

---

## 🧪 Testing Requirements

### RAG Pipeline Testing
- [ ] Context extraction accuracy
- [ ] Entity recognition quality
- [ ] Relevance scoring effectiveness
- [ ] Language preference integration
- [ ] Generation quality and diversity

### Performance Testing
- [ ] Generation time under 60 seconds
- [ ] Cache performance with 100+ conversations
- [ ] Memory usage during context analysis
- [ ] Network efficiency

### Integration Testing
- [ ] Auto-generation on new messages
- [ ] Proactive generation before conversation open
- [ ] Offline behavior
- [ ] Error handling and recovery
- [ ] Language preference respect

---

## 📊 Success Metrics

**Quantitative:**
- Smart reply usage: > 30% of users use smart replies
- Generation success rate: > 95%
- Average generation time: < 30 seconds
- Cache hit rate: > 80%

**Qualitative:**
- Smart replies feel contextually relevant
- Users prefer RAG-enhanced replies over basic ones
- System feels responsive and reliable

---

**Status:** Not Started  
**Assigned To:** TBD  
**Target Completion:** TBD
