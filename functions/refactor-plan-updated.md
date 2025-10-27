# Refactor Cloud Functions Structure - Updated Plan

## Current Problems

- All function definitions mixed in `index.ts` and scattered across `ai/` folder
- Organization by "AI" vs "non-AI" doesn't reflect actual domains
- Duplicated logic (message retrieval, Firestore operations, error handling)
- Hard to test due to tight coupling
- Utils doing service-level work (e.g., `translation.ts` making API calls)

## Proposed Structure (Simplified)

```
functions/src/
├── functions/              # HTTP/Firestore triggered functions (thin wrappers)
│   ├── translateMessage.ts
│   ├── batchTranslateMessages.ts
│   ├── autoTranslateOrchestrator.ts
│   ├── explainContext.ts
│   ├── defineSlang.ts
│   ├── generateSmartReplies.ts
│   ├── refreshSmartReplies.ts
│   ├── backgroundSmartReplies.ts
│   ├── rephraseMessage.ts
│   ├── detectLanguage.ts
│   ├── sendPushNotification.ts
│   └── onPresenceChange.ts
├── services/               # Business logic (reusable, singleton pattern)
│   ├── translationService.ts
│   ├── messageService.ts
│   ├── conversationService.ts
│   ├── smartRepliesService.ts (RAG pipeline)
│   ├── contextAnalysisService.ts (RAG)
│   ├── conversationSettingsService.ts
│   ├── notificationService.ts
│   └── presenceService.ts
├── utils/                  # Pure utilities (no external calls)
│   ├── errorHandling.ts
│   ├── rateLimiter.ts
│   ├── languageDetection.ts (pattern matching only)
│   ├── toneDetection.ts
│   └── ragUtils.ts
├── types/
│   ├── conversationSettings.ts
│   ├── rag.ts
│   └── index.ts (export all types)
└── index.ts               # Clean exports only
```

## Migration Strategy

### Phase 1: Create Service Layer (Singleton Pattern) ✅ COMPLETED

**Naming Convention:**
- Files: `camelCase.ts` (e.g., `translationService.ts`)
- Classes: `PascalCase` (e.g., `TranslationService`)
- Exports: Singleton instance with `camelCase` (e.g., `export const translationService = new TranslationService()`)

**Services Created:**
1. ✅ `services/translationService.ts` - OpenAI translation logic
2. ✅ `services/messageService.ts` - Message retrieval and operations
3. ✅ `services/conversationService.ts` - Conversation operations
4. ✅ `services/smartRepliesService.ts` - RAG pipeline logic
5. ✅ `services/contextAnalysisService.ts` - AI context analysis
6. ✅ `services/conversationSettingsService.ts` - Settings management
7. ✅ `services/notificationService.ts` - Push notifications
8. ✅ `services/presenceService.ts` - User presence management

### Phase 2: Reorganize Functions (IN PROGRESS)

**Create `functions/` folder and move all functions there:**

1. **Move translation functions:**
   - `ai/translateMessage.ts` → `functions/translateMessage.ts`
   - `ai/batchTranslateMessages.ts` → `functions/batchTranslateMessages.ts`
   - `ai/autoTranslateOrchestrator.ts` → `functions/autoTranslateOrchestrator.ts`

2. **Move contextual functions:**
   - `ai/explainContext.ts` → `functions/explainContext.ts`
   - `ai/defineSlang.ts` → `functions/defineSlang.ts`

3. **Move smart replies functions:**
   - `ai/generateSmartReplies.ts` → `functions/generateSmartReplies.ts`
   - `refreshSmartReplies.ts` → `functions/refreshSmartReplies.ts`
   - `ai/backgroundSmartReplies.ts` → `functions/backgroundSmartReplies.ts`

4. **Move messaging functions:**
   - `ai/rephraseMessage.ts` → `functions/rephraseMessage.ts`
   - `ai/detectLanguage.ts` → `functions/detectLanguage.ts`

5. **Move notification functions:**
   - Extract from `index.ts` → `functions/sendPushNotification.ts`

6. **Move presence functions:**
   - Extract from `index.ts` → `functions/onPresenceChange.ts`

**Update each function to:**
- Import services instead of utils
- Keep minimal logic (validation, calling service, return)
- Use consistent error handling patterns

### Phase 3: Clean Up Utils

1. **Keep as utils (pure functions):**
   - `errorHandling.ts` - validation helpers, error formatting
   - `rateLimiter.ts` - rate limiting logic
   - `languageDetection.ts` - pattern matching only (remove OpenAI calls)
   - `toneDetection.ts` - pattern matching
   - `ragUtils.ts` - RAG helper functions

2. **Remove from utils (moved to services):**
   - `translation.ts` → `TranslationService.ts`
   - `openai.ts` → Used by services directly
   - `costMonitoring.ts` → Integrated into services

### Phase 4: Update Index & Types

1. **Clean up `index.ts`:**
   - Remove all function definitions
   - Only export from functions folder
   ```typescript
   // Translation Functions
   export { translateMessage } from './functions/translateMessage';
   export { batchTranslateMessages } from './functions/batchTranslateMessages';
   // ... etc
   ```

2. **Create `types/index.ts`:**
   - Export all types from one place
   - Make imports cleaner

## Key Benefits

- **No duplication**: Message retrieval, Firestore queries centralized
- **Better testing**: Services can be unit tested independently
- **Clear separation**: Functions are thin wrappers, services have logic
- **Feature-based organization**: Easier to find related code
- **Reusable services**: Can be used by multiple functions
- **Type safety**: Centralized type exports

## Files to Create/Modify

**Create:**
- `functions/` folder with all function files
- `types/index.ts`

**Modify:**
- `index.ts` - clean exports only
- All existing function files - update imports and logic
- Utils - remove service-level logic

**Delete:**
- `ai/` folder (contents moved to appropriate locations)
- `utils/translation.ts` (moved to service)
- `utils/openai.ts` (integrated into services)
- `utils/costMonitoring.ts` (integrated into services)
