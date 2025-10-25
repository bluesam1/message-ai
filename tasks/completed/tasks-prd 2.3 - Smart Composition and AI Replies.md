## Relevant Files

- `functions/src/ai/rephraseMessage.ts` - Cloud Function for formality adjustment with OpenAI integration.
- `functions/src/ai/generateSmartReplies.ts` - Cloud Function for context-aware smart replies generation.
- `src/hooks/useSmartReplies.ts` - React hook for managing smart replies state and API calls.
- `src/hooks/useToneAdjustment.ts` - React hook for real-time tone adjustment functionality.
- `src/components/chat/SmartReplyChips.tsx` - UI component for displaying smart reply chips.
- `src/components/chat/ToneSuggestionChip.tsx` - UI component for real-time tone suggestions.
- `src/components/chat/RephraseModal.tsx` - Modal component for formality adjustment.
- `src/components/chat/MessageComposer.tsx` - Enhanced message composer with AI features integration.
- `src/components/chat/AISettingsToggle.tsx` - Settings toggle component for AI features.
- `src/services/ai/smartRepliesService.ts` - Service for smart replies API calls and caching.
- `src/services/ai/toneAdjustmentService.ts` - Service for tone adjustment API calls.
- `src/config/firestoreSchema.ts` - Updated schema definitions for new data models.
- `src/types/ai.ts` - TypeScript interfaces for AI features.
- `src/utils/debounce.ts` - Utility function for debouncing API calls.

### Notes

- All AI features include proper error handling and fallback messages.
- Cloud Functions are deployed and working with rate limiting and cost monitoring.
- Smart replies feature includes intelligent caching and real-time regeneration.
- Tone adjustment provides manual formality controls with professional UI.

## Tasks

- [x] 1.0 Cloud Functions Implementation
  - [x] 1.1 Create `functions/src/ai/rephraseMessage.ts` with OpenAI integration for formality adjustment
  - [x] 1.2 Create `functions/src/ai/generateSmartReplies.ts` with context-aware reply generation
  - [x] 1.3 Add rate limiting and error handling to both Cloud Functions
  - [x] 1.4 Implement caching logic for smart replies in conversation documents
  - [x] 1.5 Add cost monitoring and token usage tracking for new AI features
- [x] 2.0 Data Model Updates
  - [x] 2.1 Update `src/config/firestoreSchema.ts` with new aiPrefs fields (defaultTone, realTimeToneAdjustment)
  - [x] 2.2 Add smartRepliesCache schema to conversations collection
  - [x] 2.3 Update message aiMeta schema to remove smartReplies field (moved to conversation level)
  - [x] 2.4 Create TypeScript interfaces in `src/types/ai.ts` for new AI features
- [x] 3.0 Client-Side Services
  - [x] 3.1 Create `src/services/ai/smartRepliesService.ts` for API calls and caching
  - [x] 3.2 Create `src/services/ai/toneAdjustmentService.ts` for rephrase functionality
  - [x] 3.3 Implement debounce utility in `src/utils/debounce.ts` with 2-second timing
  - [x] 3.4 Add error handling and fallback message logic to services
- [x] 4.0 React Hooks
  - [x] 4.1 Create `src/hooks/useSmartReplies.ts` for smart replies state management
  - [x] 4.2 Create `src/hooks/useToneAdjustment.ts` for real-time tone adjustment
  - [x] 4.3 Implement debouncing logic in hooks to prevent excessive API calls
  - [x] 4.4 Add loading states and error handling to hooks
- [x] 5.0 UI Components
  - [x] 5.1 Create `src/components/chat/SmartReplyChips.tsx` for displaying reply suggestions
  - [x] 5.2 Create `src/components/chat/ToneSuggestionChip.tsx` for real-time tone suggestions
  - [x] 5.3 Create `src/components/chat/RephraseModal.tsx` for formality adjustment modal
  - [x] 5.4 Update `src/components/chat/MessageComposer.tsx` to integrate new features
  - [x] 5.5 Add settings toggle for real-time tone adjustment mode
- [x] 6.0 Integration and Testing
  - [x] 6.1 Integrate smart replies into message composer UI
  - [x] 6.2 Integrate tone adjustment features into message composer
  - [x] 6.3 Test real-time tone adjustment with 2-second debounce
  - [x] 6.4 Test smart replies generation and caching
  - [x] 6.5 Test API failure scenarios with fallback messages
- [x] 7.0 Performance and Error Handling
  - [x] 7.1 Test performance benchmarks (response times < 2.5s)
  - [x] 7.2 Verify 2-second debounce works correctly for both features
  - [x] 7.3 Test cache effectiveness and invalidation logic
  - [x] 7.4 Test API failure handling with fallback messages
  - [x] 7.5 Verify cost monitoring and token usage tracking
- [x] 8.0 Documentation and Deployment
  - [x] 8.1 Update README with smart composition features
  - [x] 8.2 Document tone preference system and real-time adjustment
  - [x] 8.3 Create user guide for formality adjustment features
  - [x] 8.4 Document smart replies generation workflow
  - [x] 8.5 Add troubleshooting guide for common issues
  - [x] 8.6 Deploy Cloud Functions to Firebase
  - [x] 8.7 Update Firestore security rules for new data models