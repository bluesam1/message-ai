# System Patterns

## Architecture Overview

**International Communicator** (formerly MessageAI) follows a **layered architecture** with clear separation between UI, business logic, and data persistence. The app now features comprehensive AI-powered communication assistance including smart replies with RAG pipeline, tone adjustment, real-time translation, and a robust service layer architecture.

```
┌─────────────────────────────────────┐
│         UI Layer (React)             │
│  - Screens (Expo Router)             │
│  - Components                        │
│  - Hooks (custom)                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      State Management Layer          │
│  - Context API                       │
│  - Local state                       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Service Layer                  │
│  - Firebase services                 │
│  - AI services                       │
│  - Business logic                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Data Layer                     │
│  - Firestore (with offline cache)   │
│  - Firebase Storage                  │
│  - Firebase Realtime Database        │
└─────────────────────────────────────┘
```

## Core Patterns

### 1. Optimistic UI Updates with Firestore Offline Persistence

**Pattern:** Show results immediately, Firestore handles sync automatically

**Implementation:**
```typescript
// User sends message
const sendMessage = async (text: string) => {
  const tempMessage = createPendingMessage(text);
  
  // 1. Update UI immediately
  setMessages(prev => [...prev, tempMessage]);
  
  // 2. Write to Firestore (queued automatically if offline)
  try {
    const messageRef = doc(db, 'messages', tempMessage.id);
    await setDoc(messageRef, tempMessage);
    // Firestore's offline persistence:
    // - Queues write automatically if offline
    // - Syncs automatically when back online
    // - hasPendingWrites metadata tracks sync status
  } catch (error) {
    updateMessageStatus(tempMessage.id, 'failed');
  }
};
```

**Why:** Users perceive the app as instant (< 50ms response), automatic offline support

**Where Used:**
- Sending messages
- Creating conversations
- Adding group members
- Updating read receipts

### 2. Firestore Offline-First Data Loading

**Pattern:** Firestore serves from cache first, syncs in background automatically

**Implementation:**
```typescript
const loadConversation = async (conversationId: string) => {
  // Set up real-time listener
  // Firestore automatically:
  // - Serves from cache first (< 100ms)
  // - Syncs in background
  // - Updates UI when fresh data arrives
  const unsubscribe = onSnapshot(
    query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(100)
    ),
    { includeMetadataChanges: false }, // Only emit when data changes
    (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        // Check if this write is still pending (optimistic)
        isPending: doc.metadata.hasPendingWrites
      }));
      setMessages(messages);
    }
  );
  
  return unsubscribe;
};
```

**Why:** Fast perceived load times (< 100ms), always up-to-date, automatic offline support

**Where Used:**
- Opening conversations
- Loading conversation list
- User profiles
- Message history

### 3. Service Layer Abstraction (Enhanced)

**Pattern:** Isolate business logic from UI and data sources using singleton pattern

**Structure:**
```
functions/src/services/
├── translationService.ts        # OpenAI translation with caching
├── messageService.ts           # Message retrieval and management
├── conversationService.ts      # Conversation operations and settings
├── smartRepliesService.ts      # RAG pipeline for smart replies
├── contextAnalysisService.ts   # AI-powered context analysis
├── conversationSettingsService.ts # Conversation settings management
├── presenceService.ts          # RTDB presence mirroring
└── notificationService.ts      # Push notification management

src/services/
├── firebase/
│   ├── authService.ts          # Authentication operations
│   └── storageService.ts       # File upload/download
├── messaging/
│   ├── messageService.ts       # Message business logic
│   ├── conversationService.ts
│   └── readReceiptService.ts
├── ai/
│   ├── translationService.ts
│   ├── contextService.ts
│   └── definitionService.ts
├── auth/
│   └── authPersistenceService.ts
└── user/
    └── userService.ts
```

**Singleton Pattern Implementation:**
```typescript
export class TranslationService {
  private static instance: TranslationService;
  
  private constructor() {
    // Initialize once
  }
  
  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }
}

// Usage
const translationService = TranslationService.getInstance();
```

**Why:** 
- Testable business logic
- Clear separation of concerns
- Easy to maintain and extend
- Singleton pattern ensures single instance per service
- Consistent API across client and server

### 4. Firestore Automatic Offline Queue

**Pattern:** Firestore queues writes automatically, no custom queue needed

**How It Works:**
```typescript
// Enable offline persistence once in firebase.ts
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

// Now all writes are automatically queued when offline
// No custom queue service needed!
const sendMessage = async (message: Message) => {
  await setDoc(doc(db, 'messages', message.id), message);
  // If offline: queued automatically
  // When online: syncs automatically
  // No manual sync logic required
};
```

**Why:** Native implementation is more reliable, less code to maintain

**Benefits:**
- Automatic queuing of writes when offline
- Automatic sync when back online
- No manual retry logic needed
- Metadata tracking (hasPendingWrites)
- Cross-platform consistency

### 5. Firestore Real-Time Listeners

**Pattern:** Subscribe to data changes, update UI automatically

**Implementation:**
```typescript
// Set up listener
const listenToConversation = (conversationId: string, callback: Function) => {
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('timestamp', 'desc'),
    limit(100)
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => doc.data());
    callback(messages);
  });
};

// Cleanup on unmount
useEffect(() => {
  const unsubscribe = listenToConversation(id, handleNewMessages);
  return () => unsubscribe();
}, [id]);
```

**Why:** Real-time updates without polling

**Where Used:**
- Message delivery
- Presence updates
- Read receipt updates
- Group member changes

### 6. RTDB Presence Tracking

**Pattern:** Use Firebase Realtime Database for reliable disconnect detection, mirror to Firestore for UI compatibility

**Why RTDB over Firestore for Presence:**
- RTDB provides `.info/connected` - special path that reflects connection status
- `onDisconnect()` handlers run SERVER-SIDE when Firebase detects disconnect
- Handles app crashes, force-quits, and network loss automatically
- Firestore requires client-side app state listeners (less reliable)

**Architecture:**
```
┌─────────────────────────────────────┐
│   RTDB (Source of Truth)            │
│   /status/{userId}                  │
│   - state: "online" | "offline"     │
│   - lastSeenAt: timestamp           │
│   - Uses .info/connected            │
│   - Uses onDisconnect() handlers    │
└──────────────┬──────────────────────┘
               │
               │ Client-side mirroring
               │ (rtdbPresenceService)
               ▼
┌──────────────────────────────────────┐
│   Firestore (Mirrored)               │
│   users/{userId}                     │
│   - online: boolean                  │
│   - lastSeen: number                 │
│   - Read by UI components            │
└──────────────────────────────────────┘
```

**Implementation:**
```typescript
// Initialize presence on login (AuthContext)
import { rtdbPresenceService } from '../services/user/rtdbPresenceService';

useEffect(() => {
  if (user?.uid) {
    rtdbPresenceService.initialize(user.uid);
  }
}, [user?.uid]);

// Cleanup on logout
const signOut = async () => {
  rtdbPresenceService.cleanup();
  await authService.signOut();
};

// rtdbPresenceService internals:
// 1. Listen to .info/connected
// 2. When connected → write { state: "online", lastSeenAt: serverTimestamp() }
// 3. Register onDisconnect() → { state: "offline", lastSeenAt: serverTimestamp() }
// 4. Listen to /status/{userId} and mirror to Firestore users/{userId}
```

**UI reads from Firestore (no changes needed):**
```typescript
// usePresence hook reads from Firestore
const userRef = doc(db, 'users', userId);
onSnapshot(userRef, (snapshot) => {
  const online = snapshot.data()?.online || false;
  const lastSeen = snapshot.data()?.lastSeen || Date.now();
  // Update UI
});
```

**Why:** 
- Reliable disconnect detection (RTDB's core strength)
- No UI changes needed (existing Firestore listeners work)
- Client-side mirroring avoids Cloud Functions complexity for MVP
- Minimal writes (only on actual state changes)

**Where Used:**
- User online/offline indicators
- "Last seen" timestamps
- Presence in conversation lists
- Presence in chat headers

## Data Models

### Firestore Schema

```typescript
// users collection
interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  online: boolean;
  lastSeen: number;
  fcmTokens: string[];
  createdAt: number;
}

// conversations collection
interface Conversation {
  id: string;
  participants: string[];  // Array of user IDs
  type: 'direct' | 'group';
  groupName?: string;      // Only for groups
  lastMessage: string;
  lastMessageTime: number;
  createdAt: number;
  updatedAt: number;
}

// messages collection
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string | null;
  imageUrl: string | null;
  timestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  readBy: string[];        // Array of user IDs
  createdAt: number;
}
```

### Firestore Offline Cache

**Pattern:** Firestore automatically caches data locally

**How It Works:**
```typescript
// Enable once in src/config/firebase.ts
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

// Now all queries are automatically cached:
// - First load: serves from cache (instant)
// - Background: syncs with server
// - Updates: automatically cached
// - Offline: serves from cache only
```

**Benefits:**
- **No Schema Management:** Firestore handles schema automatically
- **No Migrations:** Schema evolves naturally with your data model
- **Automatic Indexing:** Firestore creates indexes as needed
- **Cross-User Security:** Cache automatically cleared when users switch
- **Platform Native:** Optimized for each platform (iOS, Android, Web)

## Component Patterns

### Smart vs Presentational Components

**Smart Components (Containers):**
- Located in `app/` directory (screens)
- Manage state and business logic
- Call services
- Pass data down to presentational components

**Presentational Components:**
- Located in `src/components/`
- Receive data via props
- No direct service calls
- Reusable across screens

**Example:**
```typescript
// Smart: app/chat/[id].tsx
export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    messageService.loadMessages(id).then(setMessages);
  }, [id]);
  
  const handleSend = async (text: string) => {
    await messageService.sendMessage(id, text);
  };
  
  return <MessageList messages={messages} onSend={handleSend} />;
}

// Presentational: src/components/chat/MessageList.tsx
export function MessageList({ messages, onSend }: Props) {
  return (
    <FlatList
      data={messages}
      renderItem={({ item }) => <MessageBubble message={item} />}
    />
  );
}
```

### Custom Hooks Pattern

**Pattern:** Encapsulate reusable stateful logic

**Examples:**
```typescript
// useAuth.ts - Authentication state
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    return authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);
  
  return { user, loading };
}

// useMessages.ts - Message loading and sync
export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    // Set up Firestore listener
    // Automatically serves from cache first, then syncs
    return messageService.listenToMessages(conversationId, setMessages);
  }, [conversationId]);
  
  return { messages };
}
```

## Performance Patterns

### 1. FlatList Optimization

```typescript
<FlatList
  data={messages}
  renderItem={renderMessage}
  keyExtractor={(item) => item.id}
  // Performance optimizations
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
  initialNumToRender={20}
  updateCellsBatchingPeriod={50}
  getItemLayout={getItemLayout}  // If item heights are consistent
/>
```

### 2. React.memo for Message Components

```typescript
export const MessageBubble = React.memo(({ message }: Props) => {
  return (
    <View>
      <Text>{message.text}</Text>
      <Text>{formatTime(message.timestamp)}</Text>
    </View>
  );
}, (prev, next) => {
  // Only re-render if message content or status changed
  return prev.message.id === next.message.id 
      && prev.message.status === next.message.status;
});
```

### 3. Debounced Updates

```typescript
import { debounce } from 'lodash';

// Debounce presence updates (reduce Firestore writes)
const updatePresence = debounce((userId: string) => {
  presenceService.setOnline(userId);
}, 300);

// Debounce typing indicators
const sendTypingIndicator = debounce(() => {
  typingService.updateTyping(conversationId, true);
}, 300);
```

## Error Handling Patterns

### Graceful Degradation

```typescript
try {
  // Write to Firestore
  // If offline, Firestore queues automatically
  await setDoc(doc(db, 'messages', message.id), message);
  showToast('Message sent');
} catch (error) {
  if (isNetworkError(error)) {
    // Firestore will queue and retry automatically
    showToast('Message will send when connected');
  } else {
    // Unrecoverable error
    showError('Failed to send message');
    markMessageAsFailed(message.id);
  }
}
```

### Retry with Exponential Backoff

```typescript
async function retryOperation(
  operation: () => Promise<void>,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await operation();
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      await sleep(delay);
    }
  }
}
```

## Configuration Patterns

### Firebase Configuration (Environment Variables)

**Pattern:** Store Firebase config in environment variables, validate on initialization

**Implementation:**
```typescript
// src/config/firebase.ts
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate before initializing
const validateConfig = () => {
  const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missing = required.filter((key) => !firebaseConfig[key]);
  if (missing.length > 0) {
    throw new Error('Firebase configuration incomplete. Check .env file.');
  }
};
```

**Security:**
- `.env` file is in `.gitignore` (never commit!)
- `google-services.json` and `GoogleService-Info.plist` also in `.gitignore`
- Use `.env.template` to document required variables
- Team members download config files from Firebase Console individually

**Why:**
- Keeps secrets out of version control
- Easy to switch between environments (dev/staging/prod)
- Clear validation of required configuration

### Native Configuration Files

**Pattern:** Use Firebase auto-generated config files for native modules

**Files:**
- `google-services.json` (Android) - Place in project root
- `GoogleService-Info.plist` (iOS) - Place in project root

**app.json Configuration:**
```json
{
  "expo": {
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "@react-native-google-signin/google-signin"
    ]
  }
}
```

**Why:**
- OAuth client IDs are auto-generated when you add iOS/Android apps
- No need to manually create OAuth credentials in Google Cloud Console
- Simpler setup, fewer moving parts

## Security Patterns

### Firestore Security Rules (Coming Soon)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Conversations: only participants can access
    match /conversations/{conversationId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow write: if request.auth.uid in resource.data.participants;
    }
    
    // Messages: only conversation participants
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == request.resource.data.senderId;
    }
  }
}
```

**Note:** For MVP, starting in test mode. Will implement proper rules after core features working.

## AI Features Pattern (Phase 2.1)

### Cloud Functions for AI

**Pattern:** Server-side AI processing with client-side caching

**Architecture:**
```
┌─────────────────────────────────────┐
│      Client (React Native)          │
│  - MessageBubble (long-press)       │
│  - MessageActions menu              │
│  - useAIFeatures hook               │
└──────────────┬──────────────────────┘
               │ HTTPS Request
┌──────────────▼──────────────────────┐
│    Client Services Layer             │
│  - translationService.ts             │
│  - contextService.ts                 │
│  - definitionService.ts              │
│  (Cache Check → Firestore)           │
└──────────────┬──────────────────────┘
               │ If not cached
┌──────────────▼──────────────────────┐
│    Cloud Functions (Node.js)         │
│  - translateMessage                  │
│  - explainContext                    │
│  - defineSlang                       │
│  (Rate Limit → OpenAI → Cache)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         OpenAI API                   │
│  - gpt-4o-mini                       │
│  - Translation, Context, Definition  │
└─────────────────────────────────────┘
```

**Implementation:**
```typescript
// 1. Client Service (with Firestore caching)
export async function translateMessage(
  messageId: string,
  text: string,
  targetLanguage: string
): Promise<string> {
  // Check cache first
  const cached = await checkCache('translations', messageId, targetLanguage);
  if (cached) return cached;
  
  // Call Cloud Function
  const translateFn = httpsCallable(functions, 'translateMessage');
  const result = await translateFn({ messageId, text, targetLanguage });
  
  // Cache result
  await cacheResult('translations', messageId, targetLanguage, result.data);
  
  return result.data.translatedText;
}

// 2. Cloud Function (with rate limiting + cost monitoring)
export const translateMessage = onCall(async (request) => {
  // Authenticate
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
  
  // Rate limit (10 req/min per user)
  await checkRateLimit(request.auth.uid, 'translate');
  
  // Call OpenAI
  const { text, tokensUsed } = await callOpenAI(
    'You are a translation assistant...',
    `Translate to ${targetLanguage}: ${text}`
  );
  
  // Log cost monitoring
  await logTokenUsage(request.auth.uid, 'translate', tokensUsed);
  
  return { translatedText: text };
});
```

**Why This Pattern:**
- **Server-side AI**: Keeps API keys secure, enables rate limiting
- **Firestore Caching**: Reduces latency and costs for repeated queries
- **Rate Limiting**: Prevents abuse (10 requests/min per user)
- **Cost Monitoring**: Tracks token usage per user in Firestore
- **Error Handling**: User-friendly errors for quota limits, invalid requests

**Key Features:**
1. **Three AI Functions:**
   - `translateMessage`: Translate to target language
   - `explainContext`: Cultural context and nuances
   - `defineSlang`: Explain slang, idioms, abbreviations

2. **UI Integration:**
   - Long-press message → MessageActions menu
   - Inline TranslationView with show/hide toggle
   - Modal displays for Context and Slang
   - `useAIFeatures` hook manages all state

3. **Cost Optimization:**
   - Cache AI results in Firestore (`aiResults/{messageId}/translations/{lang}`)
   - Default to `gpt-4o-mini` (~$0.15-0.60 per 1M tokens)
   - Override model via `OPENAI_MODEL` environment variable

4. **Firebase Configuration:**
   ```bash
   # Set in Cloud Functions
   firebase functions:config:set openai.key="sk-..."
   firebase functions:config:set openai.model="gpt-4o-mini"  # optional
   
   # Or in local .env
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   ```

**Where Used:**
- `functions/src/ai/` - Cloud Functions
- `functions/src/utils/` - OpenAI client, rate limiter, cost monitoring
- `src/services/ai/` - Client services
- `src/components/chat/` - UI components
- `src/hooks/useAIFeatures.ts` - State management

---

**Key Principle:** These patterns prioritize performance and user experience while maintaining code clarity and testability.

## AI-Powered Smart Communication Features

### RAG Pipeline Pattern (PRD 2.3.1)

**Pattern:** 8-step Retrieval-Augmented Generation pipeline for context-aware smart replies

**Implementation:**
```typescript
// 8-Step RAG Pipeline
async generateSmartReplies(conversationId: string, userId: string): Promise<RAGPipelineResult> {
  // Step 1: Retrieval - Extract last 30 messages
  const recentMessages = this.retrieveRecentMessages(messages);
  
  // Step 2-4: Parallel Analysis
  const parallelResults = await this.executeParallelAnalysis(recentMessages, settings);
  
  // Step 5: Augmentation - Build enriched prompt
  const enrichedPrompt = this.buildEnrichedPrompt(messages, contextAnalysis, settings);
  
  // Step 6: Generation - Generate smart replies
  const generationResult = await this.generateSmartRepliesWithAI(enrichedPrompt);
  
  // Step 7: Post-Processing - Rank and filter replies
  const processedReplies = this.postProcessReplies(generationResult.replies, contextAnalysis);
  
  // Step 8: Caching - Store results
  const smartReplies = this.createSmartRepliesDocument(conversationId, userId, processedReplies);
  
  return { success: true, smartReplies, pipelineSteps, totalDuration };
}
```

**Key Features:**
1. **Context Analysis**: AI analyzes conversation topics, sentiment, entities, language, tone
2. **User Language Preferences**: Respects each user's target language setting
3. **Intelligent Caching**: 5-minute cache per conversation per user
4. **Fallback Handling**: Graceful degradation with user-friendly error messages
5. **Performance Optimization**: Rate limiting, cost monitoring, and offline support

### Smart Replies System
**Pattern:** Context-aware reply suggestions with user language preferences

**Implementation:**
```typescript
// Cloud Function: generateSmartReplies
export const generateSmartReplies = https.onCall(async (request) => {
  const { conversationId, userId } = request.data;
  
  // Get user's preferred language from conversation aiPrefs
  const userPrefs = conversationData.aiPrefs?.[userId];
  const userLanguage = userPrefs?.targetLang || 'en';
  
  // Generate context-aware replies in user's language
  const systemPrompt = `Generate 3 diverse, relevant reply suggestions 
  for a specific user based on the conversation context.
  
  REQUIREMENTS:
  - Write ALL replies in the target user's preferred language: ${userLanguage}
  - Be contextually relevant to the recent messages
  - Be diverse (different approaches/angles)
  - Sound like the target user would naturally respond
  - Make replies sound like clickable suggestions (not full sentences)`;
  
  // Cache replies in conversation document
  await conversationRef.update({
    smartRepliesCache: {
      replies,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      userId,
    },
  });
});
```

**Key Features:**
1. **User Language Preferences**: Respects each user's `targetLang` setting
2. **Real-time Regeneration**: Listens for new messages and regenerates replies
3. **Debounced API Calls**: 2-second debounce prevents excessive requests
4. **Caching Strategy**: 5-minute cache per conversation per user
5. **Fallback Handling**: Graceful degradation with user-friendly error messages

### Tone Adjustment System
**Pattern:** Real-time message rephrasing for formality/casualness

**Implementation:**
```typescript
// Cloud Function: rephraseMessage
export const rephraseMessage = https.onCall(async (request) => {
  const { text, tone } = request.data;
  
  const systemPrompt = `You are a helpful assistant that rephrases messages. 
  Rewrite the following message to be more ${tone}. 
  Preserve the original meaning but adjust the tone. 
  Respond ONLY with the rephrased text, no explanations.`;
  
  // Store rephrase history in message aiMeta
  await messageRef.update({
    'aiMeta.rephraseHistory': {
      original: text,
      [tone]: rephrasedText,
    }
  });
});
```

**UI Components:**
- **SmartReplyChips**: Gray background with dashed border for clickable appearance
- **RephraseModal**: Manual tone adjustment with formal/casual options
- **ToneSuggestionChip**: Real-time suggestions (currently disabled)

### Language Localization
**Pattern:** Native language names for authentic user experience

**Implementation:**
```typescript
// Language names in their native scripts
const languageNames = {
  'en': 'English',
  'es': 'Español',
  'fr': 'Français', 
  'de': 'Deutsch',
  'ja': '日本語',
  'ko': '한국어',
  'zh': '中文',
  'ar': 'العربية',
  'ru': 'Русский',
  'hi': 'हिन्दी',
  // ... more languages
};
```

### App Branding & Identity
**Pattern:** Consistent "International Communicator" branding

**Implementation:**
- **App Name**: "Message AI: International Communicator" in app.json
- **Profile Header**: Large "International Communicator" title on Profile screen
- **Native Language Support**: All language selectors show native names
- **Professional UI**: Clean, modern interface with proper spacing and typography

### Language-Aware AI Features
**Pattern:** All AI features respect user's preferred language for personalized responses

**Implementation:**
```typescript
// Consistent pattern across all AI functions
interface AIRequest {
  text: string;
  messageId?: string;
  userLanguage?: string; // User's preferred language
}

// Cloud Function: defineSlang (updated)
export const defineSlang = https.onCall(async (request) => {
  const userLanguage = request.data.userLanguage || 'en';
  
  const systemPrompt = `You are a helpful language assistant. 
  Define slang terms, idioms, or colloquial phrases in simple, clear language.

  IMPORTANT INSTRUCTIONS:
  - Provide your definition in ${userLanguage} language
  - When referencing the original text, preserve the exact words/phrases in quotes
  - Focus on explaining the meaning and usage context
  - If the phrase has cultural or regional variations, mention them`;
  
  const userPrompt = `Define this slang or idiom in ${userLanguage}: "${text}"`;
});
```

**Key Features:**
1. **User Language Preferences**: All AI functions (translate, explain, define) respect user's `targetLang`
2. **Consistent Interface**: Same pattern across all AI services and hooks
3. **Language-Aware Prompts**: AI receives clear instructions about target language
4. **Cultural Context**: Preserves original text while explaining in user's language
5. **Fallback Handling**: Defaults to English if user language not specified

### Performance Optimizations
1. **Debounced API Calls**: Prevents excessive requests during typing
2. **Intelligent Caching**: 5-minute cache for smart replies, permanent cache for translations
3. **Rate Limiting**: 10 requests/minute per user for AI features
4. **Cost Monitoring**: Token usage tracking per user and feature
5. **Offline Support**: Firestore offline persistence for all data



