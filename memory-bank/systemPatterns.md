# System Patterns

## Architecture Overview

MessageAI follows a **layered architecture** with clear separation between UI, business logic, and data persistence.

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

### 3. Service Layer Abstraction

**Pattern:** Isolate business logic from UI and data sources

**Structure:**
```
services/
├── firebase/
│   ├── authService.ts       # Authentication operations
│   └── storageService.ts    # File upload/download
├── messaging/
│   ├── messageService.ts    # Message business logic
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

**Why:** 
- Testable business logic
- Clear separation of concerns
- Easy to maintain and extend

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



