# Tasks for PRD 2.3.1: Context-Aware Smart Replies with RAG

## Relevant Files

- `functions/src/ai/ragSmartRepliesService.ts` - Main RAG service implementing 8-step pipeline with parallelization
- `functions/src/ai/conversationSettingsService.ts` - Service for managing conversation settings per user
- `functions/src/ai/backgroundSmartReplies.ts` - Background Cloud Function triggered by Firestore events
- `functions/src/ai/contextAnalysisRAG.ts` - Cloud Function for parallel context analysis
- `functions/src/utils/ragUtils.ts` - Utility functions for RAG pipeline operations
- `functions/src/utils/languageDetection.ts` - Language detection utilities
- `functions/src/utils/toneDetection.ts` - Tone detection utilities
- `functions/src/types/rag.ts` - TypeScript types for RAG pipeline and smart replies
- `functions/src/types/conversationSettings.ts` - TypeScript types for conversation settings
- `src/hooks/useSmartReplies.ts` - React hook for displaying smart replies from Firestore
- `src/components/chat/SmartRepliesCarousel.tsx` - Carousel component for displaying smart replies
- `src/components/chat/ConversationSettingsModal.tsx` - Modal for conversation settings (tone, auto-translate)
- `src/components/chat/ToneIndicator.tsx` - Component for displaying current tone preference
- `src/services/ai/smartRepliesService.ts` - Client service for fetching smart replies from Firestore
- `src/services/ai/conversationSettingsService.ts` - Client service for conversation settings
- `app/chat/[id].tsx` - Update chat screen to integrate smart replies carousel
- `app/(tabs)/_layout.tsx` - Update to replace translation toggle with gear icon dropdown

### Notes

- All RAG logic lives in Cloud Functions (server-side)
- Background processing handles automatic smart reply regeneration
- Client components only fetch and display smart replies from Firestore
- Firestore triggers coordinate background regeneration
- Cloud Functions require deployment to Firebase
- RAG pipeline requires parallel execution for performance optimization
- Smart replies should be cached per conversation per user
- Tone detection should emphasize user's messages over other participants

## Tasks

- [x] 1.0 Create Server-Side RAG Pipeline Infrastructure
  - [x] 1.1 Create TypeScript types for RAG pipeline (`functions/src/types/rag.ts`)
  - [x] 1.2 Create TypeScript types for conversation settings (`functions/src/types/conversationSettings.ts`)
  - [x] 1.3 Implement RAG utilities (`functions/src/utils/ragUtils.ts`)
  - [x] 1.4 Implement language detection utilities (`functions/src/utils/languageDetection.ts`)
  - [x] 1.5 Implement tone detection utilities (`functions/src/utils/toneDetection.ts`)
  - [x] 1.6 Create main RAG service with 8-step pipeline (`functions/src/ai/ragSmartRepliesService.ts`)
  - [x] 1.7 Create context analysis service (`functions/src/ai/contextAnalysisRAG.ts`)
  - [x] 1.8 Create conversation settings service (`functions/src/ai/conversationSettingsService.ts`)
- [x] 2.0 Implement Background Processing and Firestore Triggers
  - [x] 2.1 Create background smart replies Cloud Function (`functions/src/ai/backgroundSmartReplies.ts`)
  - [x] 2.2 Implement Firestore triggers for message creation events
  - [x] 2.3 Implement Firestore triggers for conversation settings changes
  - [x] 2.4 Add error handling and retry logic for background processing
  - [x] 2.5 Implement caching strategy for smart replies per conversation per user
  - [x] 2.6 Add performance monitoring and cost tracking
- [x] 3.0 Build Client-Side Smart Replies Display
  - [x] 3.1 Create smart replies service for Firestore integration (`src/services/ai/smartRepliesService.ts`)
  - [x] 3.2 Create conversation settings service for client (`src/services/ai/conversationSettingsService.ts`)
  - [x] 3.3 Create React hook for smart replies state management (`src/hooks/useSmartReplies.ts`)
  - [x] 3.4 Build smart replies carousel component (`src/components/chat/SmartRepliesCarousel.tsx`)
  - [x] 3.5 Implement swipe navigation and carousel indicators
  - [x] 3.6 Add loading states and error handling for smart replies
- [x] 4.0 Create Conversation Settings System
  - [x] 4.1 Create conversation settings modal (`src/components/chat/ConversationSettingsModal.tsx`)
  - [x] 4.2 Implement tone preference selector (Formal, Casual, Auto)
  - [x] 4.3 Move auto-translate toggle to settings modal with standard toggle control
  - [x] 4.4 Create tone indicator component (`src/components/chat/ToneIndicator.tsx`)
  - [x] 4.5 Implement gear icon dropdown to replace translation toggle
  - [x] 4.6 Add spinning globe indicator below conversation name when auto-translate enabled
- [x] 5.0 Add Performance Optimizations and Testing
  - [x] 5.1 Implement parallel execution for RAG pipeline steps (Context Extraction, Relevance Scoring, Entity Recognition)
  - [x] 5.2 Add concurrent language and tone detection
  - [x] 5.3 Implement parallel settings retrieval with message retrieval
  - [x] 5.4 Add performance monitoring and metrics collection
  - [x] 5.5 Implement error recovery and fallback mechanisms
