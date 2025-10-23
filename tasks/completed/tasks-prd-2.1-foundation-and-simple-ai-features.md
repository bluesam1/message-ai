# Task List: PRD 2.1 - Foundation & Simple AI Features

**Source:** `prd 2.1 - Foundation and Simple AI Features.md`  
**Status:** Not Started  
**Duration:** 6-8 hours

---

## Relevant Files

### Cloud Functions
- `functions/src/index.ts` - Main Cloud Functions exports (already exists, needs AI endpoints)
- `functions/src/ai/translateMessage.ts` - Translation endpoint implementation
- `functions/src/ai/explainContext.ts` - Cultural context explanation endpoint
- `functions/src/ai/defineSlang.ts` - Slang/idiom definition endpoint
- `functions/src/utils/openai.ts` - OpenAI client initialization and utilities
- `functions/src/utils/rateLimiter.ts` - Rate limiting middleware
- `functions/package.json` - Dependencies (needs openai SDK)

### Client Services
- `src/services/ai/translationService.ts` - Client-side translation logic and caching
- `src/services/ai/contextService.ts` - Client-side cultural context logic
- `src/services/ai/definitionService.ts` - Client-side slang definition logic
- `src/services/ai/aiService.ts` - Shared AI service utilities (API calls, error handling)

### UI Components
- `src/components/chat/MessageBubble.tsx` - Update to support translation toggle
- `src/components/chat/MessageActions.tsx` - Long-press menu with Translate/Explain/Define actions
- `src/components/chat/TranslationView.tsx` - Toggle between original and translated text
- `src/components/chat/ContextExplanation.tsx` - Modal/expandable for cultural context
- `src/components/chat/SlangDefinition.tsx` - Inline/tooltip for definitions

### Types & Schema
- `src/types/message.ts` - Update Message type with aiMeta field
- `src/config/firestoreSchema.ts` - Document aiMeta field structure
- `firestore.indexes.json` - Add indexes if needed for AI queries

### Testing
- `__tests__/services/ai/translationService.test.ts` - Unit tests for translation service
- `__tests__/services/ai/contextService.test.ts` - Unit tests for context service
- `__tests__/services/ai/definitionService.test.ts` - Unit tests for definition service
- `functions/src/ai/__tests__/translateMessage.test.ts` - Cloud Function tests

### Documentation
- `README.md` - Add AI features section
- `_docs/AI_SETUP.md` - Guide for OpenAI API key setup and Cloud Functions deployment
- `_docs/AI_FEATURES.md` - User guide for translation, explanation, and definition features

### Configuration
- `functions/.env` - OpenAI API key and model configuration (gitignored)
- `.firebaserc` - Firebase project configuration

### Notes

- **OpenAI Model Configuration:**
  - Default: `gpt-4o-mini` (cost-effective)
  - Override via environment variable: `OPENAI_MODEL=gpt-4-turbo`
  - Temperature: `0.3` for consistent results
  - Token limit: `500` tokens max per request
- Rate limiting: Track per user to prevent abuse
- All AI results cached in Firestore `aiMeta` field
- Error handling: Show original message if translation fails
- Response time target: < 3 seconds (95th percentile)

---

## Tasks

- [x] 1.0 Set up Cloud Functions infrastructure and OpenAI integration
  - [x] 1.1 Install OpenAI SDK in Cloud Functions project (`npm install openai` in functions/)
  - [x] 1.2 Create `functions/src/utils/openai.ts` to initialize OpenAI client with API key and model configuration from environment (default: gpt-4o-mini, override with OPENAI_MODEL env var)
  - [x] 1.3 Configure OpenAI environment variables: API key and optional model override (`OPENAI_API_KEY`, `OPENAI_MODEL`)
  - [x] 1.4 Create `functions/src/utils/rateLimiter.ts` for per-user rate limiting middleware
  - [x] 1.5 Set up cost monitoring configuration (token counting utility with model-specific pricing)
  - [x] 1.6 Add comprehensive error handling utilities for OpenAI API errors
  - [x] 1.7 Deploy initial Cloud Functions setup and verify deployment (`firebase deploy --only functions`)

- [x] 2.0 Implement inline translation feature
  - [x] 2.1 Create `functions/src/ai/translateMessage.ts` Cloud Function endpoint that accepts message text and target language
  - [x] 2.2 Implement OpenAI translation logic with prompt engineering (preserve tone, accuracy validation)
  - [x] 2.3 Update `src/types/message.ts` to include `aiMeta` field with translation structure
  - [x] 2.4 Create `src/services/ai/translationService.ts` with functions to call Cloud Function and cache results
  - [x] 2.5 Create `src/components/chat/MessageActions.tsx` component for long-press menu
  - [x] 2.6 Add "Translate" action to MessageActions that triggers translation service
  - [x] 2.7 Create `src/components/chat/TranslationView.tsx` to display translation inline with toggle
  - [x] 2.8 Update `src/components/chat/MessageBubble.tsx` to integrate TranslationView
  - [x] 2.9 Implement loading state UI (spinner) during translation API call
  - [x] 2.10 Implement Firestore caching logic (check aiMeta.translatedText before API call)
  - [x] 2.11 Add error handling UI (show original message with error toast if translation fails)
  - [x] 2.12 Deploy and test translation feature end-to-end

- [x] 3.0 Implement cultural context hint feature
  - [x] 3.1 Create `functions/src/ai/explainContext.ts` Cloud Function endpoint for cultural explanations
  - [x] 3.2 Implement OpenAI prompt for cultural context (100-150 words, focus on idioms/references/nuances)
  - [x] 3.3 Create `src/services/ai/contextService.ts` with functions to call Cloud Function and cache results
  - [x] 3.4 Create `src/components/chat/ContextExplanation.tsx` modal or expandable component
  - [x] 3.5 Add "Explain" button to MessageActions component
  - [x] 3.6 Wire up "Explain" button to contextService and display in ContextExplanation component
  - [x] 3.7 Implement Firestore caching logic (check aiMeta.explanation before API call)
  - [x] 3.8 Add loading state and error handling for explanation feature
  - [x] 3.9 Deploy and test cultural context feature end-to-end

- [x] 4.0 Implement slang/idiom explanation feature
  - [x] 4.1 Create `functions/src/ai/defineSlang.ts` Cloud Function endpoint for slang definitions
  - [x] 4.2 Implement OpenAI prompt for concise definitions (handle "Unable to explain" gracefully)
  - [x] 4.3 Create `src/services/ai/definitionService.ts` with functions to call Cloud Function and cache results
  - [x] 4.4 Create `src/components/chat/SlangDefinition.tsx` for inline or tooltip display
  - [x] 4.5 Add "Define" button to MessageActions component
  - [x] 4.6 Wire up "Define" button to definitionService and display in SlangDefinition component
  - [x] 4.7 Implement Firestore caching logic (check aiMeta.slangDefinition before API call)
  - [x] 4.8 Add loading state and error handling for definition feature
  - [x] 4.9 Deploy and test slang/idiom definition feature end-to-end

- [x] 5.0 Update data models, testing, and documentation
  - [x] 5.1 Update `src/config/firestoreSchema.ts` to document aiMeta field structure
  - [x] 5.2 Create Firestore indexes in `firestore.indexes.json` if needed for AI queries
  - [x] 5.3 Write unit tests for `translationService.ts` (cache hit, cache miss, error handling)
  - [x] 5.4 Write unit tests for `contextService.ts` (cache hit, cache miss, error handling)
  - [x] 5.5 Write unit tests for `definitionService.ts` (cache hit, cache miss, error handling)
  - [x] 5.6 Manual test all 3 AI features with messages in 5+ languages
  - [x] 5.7 Manual test error scenarios (network offline, API quota exceeded, invalid input)
  - [x] 5.8 Verify caching works (reload message, results appear instantly)
  - [x] 5.9 Create `_docs/AI_SETUP.md` with Cloud Functions setup, OpenAI API key configuration, and model override instructions
  - [x] 5.10 Create `_docs/AI_FEATURES.md` with user guide for translation, explanation, and definition
  - [x] 5.11 Update README.md with AI features overview section and environment variable configuration
  - [x] 5.12 Monitor and document OpenAI token usage and cost per request (include gpt-4o-mini pricing)

---

**Status:** ✅ COMPLETE - Deployed and Working  
**Completion Date:** October 23, 2025

## Implementation Summary

✅ **Completed:**
- All Cloud Functions implemented and compiled successfully
- All client-side services created with caching
- All UI components created (modals, actions, inline views)
- Custom hook for AI state management
- TypeScript types updated
- Firestore schema documented
- Comprehensive documentation created (setup, user guide, integration example)
- README updated with AI features section
- **✨ AI features integrated into chat screen (`app/chat/[id].tsx`)**

✅ **Deployment Complete:**
1. ✅ OpenAI API key configured in Firebase
2. ✅ Cloud Functions deployed successfully
3. ✅ Chat screen integrated with AI features
4. ✅ All 3 features tested and working

**For complete details, see:**
- Deployment: `_docs/AI_SETUP.md`
- Integration changes: `_docs/AI_INTEGRATION_COMPLETE.md`
- Testing checklist: `_docs/AI_IMPLEMENTATION_STATUS.md`

