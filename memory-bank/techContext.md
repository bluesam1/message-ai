# Technical Context

## Technology Stack

### Frontend

**React Native + Expo**
- **Version:** Expo SDK ~54.0 (specifically 54.0.13)
- **React Native Version:** 0.81.4
- **React Version:** 19.1.0 (exact - required by RN 0.81.4)
- **Why:** Cross-platform (iOS + Android) from single codebase, managed workflow simplifies setup
- **Key Features Used:**
  - Expo Router (file-based navigation)
  - Expo SQLite (local persistence)
  - Expo Notifications (push notifications)
  - Expo ImagePicker (image selection)
  - Expo ImageManipulator (image compression)
  - Expo Auth Session (Google OAuth)
  - Expo Web Browser (OAuth flow support)

**TypeScript**
- **Version:** ~5.9.2
- **Why:** Type safety catches bugs early, better IDE support, self-documenting code
- **Configuration:** Strict mode enabled

**State Management**
- **Primary:** React Context API
- **Why:** Sufficient for MVP scope, no need for Redux/Zustand complexity
- **Implementation:** AuthContext for global auth state
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
    "expo": "~54.0.0",
    "expo-auth-session": "~7.0.0",
    "expo-dev-client": "~6.0.0",
    "expo-image": "~3.0.0",
    "expo-image-picker": "~17.0.0",
    "expo-notifications": "~0.32.0",
    "expo-router": "~6.0.0",
    "expo-sqlite": "~16.0.0",
    "expo-status-bar": "~3.0.0",
    "expo-web-browser": "~15.0.0",
    "firebase": "^12.4.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.4",
    "@react-native-community/netinfo": "^11.4.1"
  },
  "devDependencies": {
    "@types/jest": "^30.0.0",
    "@types/react": "~19.1.0",
    "dotenv": "^17.2.3",
    "husky": "^9.1.7",
    "jest": "^29.7.0",
    "jest-expo": "^54.0.12",
    "lint-staged": "^16.2.5",
    "typescript": "~5.9.2"
  }
}
```

**Important Version Notes:**
- **React 19.1.0 is required** - React Native 0.81.4 will not work with React 19.2.0
- **All Expo packages use `~` versioning** - Ensures SDK 54 compatibility
- **Testing libraries temporarily removed** - `@testing-library/react-native` requires React 19.2.0
- **Use `npx expo install`** for any new Expo packages to maintain compatibility

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
  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=  # Optional: for Analytics
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
# Firebase (Required)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Firebase (Optional)
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=  # For Firebase Analytics

# Post-MVP
EXPO_PUBLIC_SENTRY_DSN=        # Error tracking (post-MVP)
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

## Windows Development Setup

### Required Environment Variables

**JAVA_HOME:**
Windows requires `JAVA_HOME` to be set for Android builds. Android Studio includes a JDK at:
```
C:\Program Files\Android\Android Studio\jbr
```

Set permanently:
```bash
setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
```

Add to PATH (restart terminal after):
```bash
setx PATH "%PATH%;%JAVA_HOME%\bin"
```

**Verify:**
```bash
echo $JAVA_HOME
java -version
```

### Common Windows Issues

**Gradle File Locking:**
```bash
cd android
./gradlew --stop
cd ..
taskkill //F //IM java.exe
```

**Port Already in Use:**
```bash
# Find process on port 8081
netstat -ano | grep ":8081"

# Kill process
taskkill //F //PID <process-id>
```

**Git Bash Path Issues:**
Use forward slashes in Git Bash:
```bash
# Good
cd /c/Users/SamExel/repos/message-ai

# Bad
cd C:\Users\SamExel\repos\message-ai
```

### Development Build Requirements

**Must use development build (not Expo Go) because:**
- Firebase requires native modules
- Google Sign-In requires native configuration
- expo-dev-client provides development build with native modules

**First build takes 5-6 minutes, subsequent builds are faster**

```bash
# Build and run on Android
npx expo run:android

# This:
# 1. Generates native Android project
# 2. Installs expo-dev-client
# 3. Compiles native modules
# 4. Installs on emulator
# 5. Starts Metro bundler
```

## Known Issues & Workarounds

### iOS on Windows ✅ SOLVED
**Issue:** Cannot build iOS locally on Windows  
**Workaround:** Use EAS Build cloud service
```bash
eas build --platform ios --profile development
```

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

### Gradle Build Failures
**Issue:** "The process cannot access the file" errors  
**Root Cause:** Multiple Gradle daemons or locked files  
**Solution:** Stop all Gradle processes before rebuilding (see Windows Development Setup above)

### React Version Incompatibility ✅ SOLVED
**Issue:** `Incompatible React versions: react 19.2.0 and react-native-renderer 19.1.0`  
**Root Cause:** React Native 0.81.4 requires React 19.1.0 exactly, but npm installed 19.2.0  
**Solution:**
```bash
# 1. Update package.json to lock React version
"react": "19.1.0",
"react-dom": "19.1.0",
"@types/react": "~19.1.0"

# 2. Clean install
rm -rf node_modules package-lock.json
npm install

# 3. Verify versions match
npm list react react-native
```
**Prevention:** Always check React Native release notes for exact React version requirements

### Environment Variables Not Loading ✅ SOLVED
**Issue:** Firebase config errors even with correct `.env` file  
**Root Cause:** Metro bundler caches environment variables and doesn't auto-reload on `.env` changes  
**Solution:**
```bash
# Always clear cache after changing .env
npm start -- --clear --reset-cache
```
**Prevention:** Document that Metro restart with `--clear` is required after `.env` changes

### Testing Library Conflicts
**Issue:** `@testing-library/react-native` requires React 19.2.0, conflicts with RN 0.81.4  
**Root Cause:** Testing libraries update faster than React Native stable releases  
**Solution:** 
- Removed testing libraries temporarily
- Focus on Jest unit tests for utilities and business logic
- Will re-add when compatible versions available or when upgrading React Native
**Prevention:** Check peer dependency compatibility before adding testing libraries

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

