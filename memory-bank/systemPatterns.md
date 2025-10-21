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
│  - SQLite services                   │
│  - Business logic                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Data Layer                     │
│  - Firestore (remote)                │
│  - SQLite (local)                    │
│  - Firebase Storage                  │
└─────────────────────────────────────┘
```

## Core Patterns

### 1. Optimistic UI Updates

**Pattern:** Show results immediately, sync in background

**Implementation:**
```typescript
// User sends message
const sendMessage = async (text: string) => {
  const tempMessage = createPendingMessage(text);
  
  // 1. Update UI immediately
  setMessages(prev => [...prev, tempMessage]);
  
  // 2. Save to local SQLite
  await sqliteService.saveMessage(tempMessage);
  
  // 3. Upload to Firestore (background)
  try {
    await firestoreService.uploadMessage(tempMessage);
    updateMessageStatus(tempMessage.id, 'sent');
  } catch (error) {
    updateMessageStatus(tempMessage.id, 'failed');
  }
};
```

**Why:** Users perceive the app as instant (< 50ms response)

**Where Used:**
- Sending messages
- Creating conversations
- Adding group members
- Updating read receipts

### 2. Cache-First Data Loading

**Pattern:** Load from local cache immediately, sync fresh data in background

**Implementation:**
```typescript
const loadConversation = async (conversationId: string) => {
  // 1. Load cached messages immediately (< 100ms)
  const cached = await sqliteService.getMessages(conversationId);
  setMessages(cached);
  
  // 2. Set up real-time listener (background)
  const unsubscribe = firestoreService.listenToMessages(
    conversationId,
    (liveMessages) => {
      // 3. Merge and update UI
      const merged = mergeMessages(cached, liveMessages);
      setMessages(merged);
    }
  );
  
  return unsubscribe;
};
```

**Why:** Fast perceived load times, always shows something useful

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
│   ├── firestoreService.ts  # Firestore CRUD operations
│   └── storageService.ts    # File upload/download
├── sqlite/
│   ├── sqliteService.ts     # Local database operations
│   └── migrations/          # Schema migrations
├── messaging/
│   ├── messageService.ts    # Message business logic
│   ├── conversationService.ts
│   └── syncService.ts       # Offline sync logic
└── network/
    └── networkService.ts    # Connectivity monitoring
```

**Why:** 
- Testable business logic
- Swap implementations easily
- Clear separation of concerns

### 4. Offline Queue Pattern

**Pattern:** Queue operations when offline, replay when online

**Implementation:**
```typescript
// Offline queue workflow
const queueService = {
  // Add to queue
  enqueue: async (operation: Operation) => {
    await sqliteService.saveToPendingQueue(operation);
  },
  
  // Process queue when online
  processQueue: async () => {
    const pending = await sqliteService.getPendingOperations();
    
    for (const op of pending) {
      try {
        await executeOperation(op);
        await sqliteService.removeFromQueue(op.id);
      } catch (error) {
        await sqliteService.incrementRetryCount(op.id);
        if (op.retryCount >= 3) {
          await markAsFailed(op.id);
        }
      }
    }
  },
};
```

**Why:** Seamless offline experience, no data loss

**Where Used:**
- Sending messages
- Creating conversations
- Updating user profiles
- Uploading images (future)

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

### SQLite Schema

```sql
-- Mirrors Firestore but optimized for local queries
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  participants TEXT,      -- JSON stringified array
  type TEXT,
  groupName TEXT,
  lastMessage TEXT,
  lastMessageTime INTEGER,
  updatedAt INTEGER
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT,
  senderId TEXT,
  text TEXT,
  imageUrl TEXT,
  timestamp INTEGER,
  status TEXT,
  readBy TEXT,            -- JSON stringified array
  createdAt INTEGER,
  FOREIGN KEY (conversationId) REFERENCES conversations(id)
);

CREATE INDEX idx_messages_conversation 
ON messages(conversationId, timestamp DESC);

-- Offline queue
CREATE TABLE pendingMessages (
  id TEXT PRIMARY KEY,
  conversationId TEXT,
  senderId TEXT,
  text TEXT,
  timestamp INTEGER,
  retryCount INTEGER DEFAULT 0,
  createdAt INTEGER
);
```

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
    // Load cached
    sqliteService.getMessages(conversationId).then(setMessages);
    
    // Listen for updates
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
  // Try online operation
  await firestoreService.sendMessage(message);
} catch (error) {
  if (isNetworkError(error)) {
    // Fall back to offline queue
    await queueService.enqueue(message);
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

---

**Key Principle:** These patterns prioritize performance and user experience while maintaining code clarity and testability.



