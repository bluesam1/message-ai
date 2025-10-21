# Technical Context

## Technology Stack

### Frontend

**React Native + Expo**
- **Version:** Expo SDK ~50.x
- **Why:** Cross-platform (iOS + Android) from single codebase, managed workflow simplifies setup
- **Key Features Used:**
  - Expo Router (file-based navigation)
  - Expo SQLite (local persistence)
  - Expo Notifications (push notifications)
  - Expo ImagePicker (image selection)
  - Expo ImageManipulator (image compression)

**TypeScript**
- **Version:** ~5.x
- **Why:** Type safety catches bugs early, better IDE support, self-documenting code
- **Configuration:** Strict mode enabled

**State Management**
- **Primary:** React Context API
- **Why:** Sufficient for MVP scope, no need for Redux/Zustand complexity
- **Future:** May migrate to Zustand if state management becomes complex

### Backend (Firebase)

**Firebase Authentication**
- Email/Password authentication
- Google Sign-In (OAuth 2.0)
- Session management
- User profile storage

**Cloud Firestore**
- Real-time database with live listeners
- Collections: `users`, `conversations`, `messages`
- Optimistic local cache
- Offline persistence

**Firebase Storage**
- Image uploads
- Path structure: `messages/{userId}/{filename}`
- Public download URLs

**Firebase Cloud Messaging (FCM)**
- Push notification delivery
- Device token management
- Foreground notification handling

### Local Persistence

**Expo SQLite**
- **Version:** ~13.x
- **Why:** Fast local queries, offline-first architecture, full SQL support
- **Usage:**
  - Cache conversations and messages
  - Offline message queue
  - Deduplication and sync

### Testing

**Jest**
- **Version:** ~29.x
- **Coverage Goal:** 70%+ overall
- **What We Test:**
  - Utility functions (80%+ coverage)
  - Business logic (70%+ coverage)
  - Services (60%+ coverage)

**@testing-library/react-native**
- **Version:** ~12.x
- **Why:** Component testing (minimal in MVP, focus on logic)

**Husky + lint-staged**
- Pre-commit hooks
- Auto-run tests before commit
- Prevent broken code from entering repo

### Development Tools

**Expo Dev Tools**
- Live reload / Hot Module Replacement
- Device debugging
- Network request inspection

**EAS Build**
- Cloud-based iOS builds (Windows can't build iOS locally)
- Android builds
- Development builds for device testing

### Dependencies (Key Packages)

```json
{
  "dependencies": {
    "expo": "~50.x",
    "expo-router": "~3.x",
    "expo-sqlite": "~13.x",
    "expo-notifications": "~0.27.x",
    "expo-image-picker": "~14.x",
    "expo-image-manipulator": "~11.x",
    "firebase": "^10.x",
    "react-native": "0.73.x",
    "react": "18.x",
    "@react-native-async-storage/async-storage": "^1.x",
    "@react-native-community/netinfo": "^11.x"
  },
  "devDependencies": {
    "@types/jest": "^29.x",
    "@types/react": "^18.x",
    "@testing-library/react-native": "^12.x",
    "husky": "^8.x",
    "jest": "^29.x",
    "lint-staged": "^15.x",
    "typescript": "^5.x"
  }
}
```

## Development Environment

### Required Setup

**Node.js**
- **Version:** 18.x or higher
- **Package Manager:** npm (comes with Node)

**Expo CLI**
- Install globally: `npm install -g expo-cli`
- Or use npx: `npx expo start`

**Android Development**
- Android Studio (for emulator)
- Android SDK 33+
- Emulator configured and running

**iOS Development (If on Mac)**
- Xcode 15+
- iOS Simulator
- CocoaPods

**Windows Limitations**
- Cannot build iOS locally
- Use EAS Build for iOS: `eas build --platform ios`
- Can test on iOS simulator via EAS or Mac

### Firebase Setup Requirements

**Firebase Project**
1. Create project at console.firebase.google.com
2. Add iOS and Android apps to project (mobile only - no web)
3. Enable Authentication providers
4. Create Firestore database
5. Set up Firebase Storage
6. Configure Cloud Messaging

**Configuration Files Needed**
- `google-services.json` (Android) - Place in project root
- `GoogleService-Info.plist` (iOS) - Place in project root
- `.env` file with Firebase config:
  ```
  EXPO_PUBLIC_FIREBASE_API_KEY=
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
  EXPO_PUBLIC_FIREBASE_PROJECT_ID=
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
  EXPO_PUBLIC_FIREBASE_APP_ID=
  ```

**Google OAuth Setup**
1. Go to Google Cloud Console
2. Create OAuth 2.0 Client IDs:
   - iOS: Use bundle ID (e.g., com.messageai.app)
   - Android: Use SHA-1 certificate fingerprint
3. Add URL scheme to app.json
4. Enable Google Sign-In in Firebase console

### Project Structure

```
message-ai/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Authentication group
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Conversations list
│   │   ├── profile.tsx
│   │   └── _layout.tsx
│   ├── chat/
│   │   └── [id].tsx              # Dynamic chat screen
│   └── _layout.tsx               # Root layout
│
├── src/                          # Application code
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # Generic UI (buttons, inputs)
│   │   └── chat/                 # Chat-specific components
│   ├── services/                 # Business logic
│   │   ├── firebase/
│   │   │   ├── authService.ts
│   │   │   ├── firestoreService.ts
│   │   │   └── storageService.ts
│   │   ├── sqlite/
│   │   │   └── sqliteService.ts
│   │   ├── messaging/
│   │   │   ├── messageService.ts
│   │   │   ├── conversationService.ts
│   │   │   └── syncService.ts
│   │   └── network/
│   │       └── networkService.ts
│   ├── utils/                    # Helper functions
│   │   ├── messageUtils.ts
│   │   ├── dateUtils.ts
│   │   └── validation.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useMessages.ts
│   │   └── useNetworkStatus.ts
│   ├── types/                    # TypeScript definitions
│   │   ├── User.ts
│   │   ├── Message.ts
│   │   └── Conversation.ts
│   ├── store/                    # Context providers
│   │   └── AuthContext.tsx
│   └── config/                   # Configuration
│       └── firebase.ts           # Firebase initialization
│
├── __tests__/                    # Unit tests (mirrors src/)
│   ├── utils/
│   ├── services/
│   └── ...
│
├── assets/                       # Static assets
│   ├── images/
│   └── fonts/
│
├── planning/                     # Documentation
│   ├── Phase 1 PRD.md
│   └── supporting/
│
├── tasks/                        # Feature PRDs
│   ├── prd 01 - Project Setup & Infrastructure.md
│   └── ...
│
├── memory-bank/                  # Project memory
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── activeContext.md
│   ├── systemPatterns.md
│   ├── techContext.md (this file)
│   └── progress.md
│
├── .cursor/                      # Cursor IDE config
│   └── rules/                    # Project rules
│
├── .env                          # Environment variables (gitignored)
├── .gitignore
├── app.json                      # Expo configuration
├── package.json
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest configuration
└── README.md
```

## Technical Constraints

### Performance Budgets

**UI Response Times**
- Message send: < 100ms perceived latency
- Screen navigation: < 300ms
- Scroll performance: 60 FPS (no dropped frames)
- App cold start: < 2.5 seconds

**Network**
- Message sync: < 500ms (with good connection)
- Image upload: < 10s for 5MB image
- Offline queue process: < 20s for 100 messages

**Storage**
- SQLite database: < 50MB (for MVP)
- Image cache: < 200MB
- Total app size: < 100MB

### Platform Considerations

**iOS Specifics**
- HEIC images automatically converted to JPEG
- Photo library permission required
- Push notification permission required
- Different OAuth client ID than Android

**Android Specifics**
- Various gallery apps (need to handle different pickers)
- Storage permissions (varies by Android version)
- SHA-1 fingerprint for OAuth
- Notification channels required

**Both Platforms**
- Test on real devices (emulators don't show all issues)
- Handle different screen sizes
- Support dark mode (if time permits)

## Build & Deploy

### Development Build

```bash
# Start dev server
npm start

# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Production Build (EAS)

```bash
# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Environment Variables

**Required in .env:**
```bash
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Optional
EXPO_PUBLIC_SENTRY_DSN=        # Error tracking (post-MVP)
EXPO_PUBLIC_ANALYTICS_ID=      # Analytics (post-MVP)
```

**Access in code:**
```typescript
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  // ...
};
```

## Known Issues & Workarounds

### iOS on Windows
**Issue:** Cannot build iOS locally on Windows  
**Workaround:** Use EAS Build cloud service

### HEIC Images
**Issue:** iOS uses HEIC format by default  
**Workaround:** expo-image-manipulator automatically converts to JPEG

### Android Permissions
**Issue:** Different permission models across Android versions  
**Workaround:** expo-image-picker handles this internally

### Firebase Limits (Free Tier)
**Issue:** Limited Firestore reads/writes, storage  
**Workaround:** 
- Use local cache aggressively
- Batch operations
- Monitor usage in Firebase console

## Future Technical Considerations

### Scalability Prep
- Message pagination (limit initial load to 100)
- Image thumbnail generation (post-MVP)
- Cloud Functions for server-side logic (post-MVP)

### AI Integration Points
- Message metadata storage (prepared in schema)
- Cloud Functions for AI processing (future)
- Streaming API responses (future)

### Production Hardening
- Firestore security rules (currently test mode)
- Rate limiting
- Error monitoring (Sentry or similar)
- Analytics (Firebase Analytics or similar)
- App version checking / forced updates

---

**Philosophy:** Use battle-tested technologies, avoid bleeding edge. Simplicity and reliability over novelty.

