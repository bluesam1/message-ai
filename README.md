# MessageAI

A real-time messaging application built with React Native (Expo) and Firebase. Features include one-on-one and group messaging, offline support, read receipts, presence indicators, image sharing, push notifications, and **AI-powered auto-translation, cultural context, and slang definitions**.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **Android Studio** (for Android development)
- **Git**
- **Firebase account**

### Windows-Specific Requirements

1. **Java Development Kit (JDK)**
   - Android Studio includes a JDK at: `C:\Program Files\Android\Android Studio\jbr`
   - Set `JAVA_HOME` environment variable:
     ```bash
     setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
     ```
   - Restart your terminal after setting

2. **Android Emulator**
   - Install and configure via Android Studio
   - Create a virtual device (e.g., Pixel 7, API 35)
   - Start the emulator before running the app

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd message-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   
   Follow the detailed guide in [**_docs/FIREBASE_SETUP.md**](_docs/FIREBASE_SETUP.md), or quick steps:
   
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Add iOS and Android apps to your Firebase project
   - Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
   - Place both files in the project root
   - Copy `.env.template` to `.env` and fill in your Firebase credentials:
     ```bash
     cp .env.template .env
     ```
   - Edit `.env` with your Firebase config values

4. **Verify Firebase files are in place**
   ```bash
   ls google-services.json GoogleService-Info.plist .env
   ```
   ⚠️ **These files should NEVER be committed to git!**

### Running the App

#### Android (Development Build)

1. **Start the Android emulator** in Android Studio

2. **Run the app**
   ```bash
   npx expo run:android
   ```
   
   First build takes 3-5 minutes. Subsequent builds are faster.

3. **If you encounter "JAVA_HOME not set" error:**
   ```bash
   export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
   export PATH="$JAVA_HOME/bin:$PATH"
   npx expo run:android
   ```

#### iOS (Cloud Build Required on Windows)

Windows cannot build iOS locally. Use EAS Build:

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile development
```

## 📱 Development

### Project Structure

```
message-ai/
├── app/                    # Expo Router screens (to be implemented)
├── src/                    # Source code
│   ├── config/
│   │   └── firebase.ts     # Firebase initialization
│   ├── components/         # Reusable UI components
│   ├── services/           # Business logic
│   │   ├── firebase/       # Firebase services
│   │   ├── sqlite/         # Local database
│   │   ├── messaging/      # Messaging logic
│   │   └── network/        # Network utilities
│   ├── utils/              # Helper functions
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript definitions
│   └── store/              # State management
├── assets/                 # Images, fonts, etc.
└── android/                # Native Android project (generated)
```

### Pre-commit Hooks

TypeScript compilation check runs automatically before each commit. If there are TypeScript errors, the commit is blocked.

To skip (not recommended):
```bash
git commit --no-verify
```

### Starting Metro Bundler

```bash
npm start
```

## ☁️ Cloud Functions

MessageAI uses Firebase Cloud Functions for server-side operations that can't be reliably handled on the client. The following functions are deployed:

### 1. Presence Tracking (onPresenceChange)

**What it does:**
- Automatically mirrors user online/offline status from Realtime Database to Firestore
- Ensures presence indicators work even when the app crashes or loses connection
- Runs completely server-side (no client code needed)

**How it works:**
- Listens to changes in `/status/{uid}` in RTDB
- When RTDB detects a disconnect (via `onDisconnect()` handlers), the function updates Firestore
- Result: UI always shows accurate presence status

### 2. AI-Powered Features (translateMessage, explainContext, defineSlang)

**What they do:**
- **translateMessage**: Translates messages to a target language using OpenAI
- **explainContext**: Provides cultural context and explanations for messages
- **defineSlang**: Defines slang terms and idioms in messages

**How they work:**
- Client calls Cloud Function with message text
- Function sends request to OpenAI API (gpt-4o-mini by default)
- Result is cached in Firestore `aiMeta` field for instant reloads
- Rate limiting prevents abuse (10 requests/min per user)

**Configuration:**
- See [_docs/AI_SETUP.md](_docs/AI_SETUP.md) for setup instructions
- Requires OpenAI API key in Firebase environment config
- Model can be overridden via environment variable

**User Guide:**
- See [_docs/AI_FEATURES.md](_docs/AI_FEATURES.md) for usage instructions
- Long-press any message to access AI features
- Translations appear inline, explanations/definitions in modals

### 3. Push Notifications (sendPushNotification)

**What it does:**
- Sends push notifications when users receive new messages
- Uses Expo Push API for reliable delivery across platforms
- Automatically cleans up invalid/expired tokens

**Features:**
- Supports both direct and group conversations
- Special formatting for image messages ("📷 Sent an image")
- Filters out sender (you don't get notifications for your own messages)
- Notification collapsing by conversation (prevents spam)
- Deep linking (tap notification → open conversation)

### Deployment

Cloud Functions are already deployed to production. If you need to redeploy:

```bash
# From project root
firebase deploy --only functions
```

**Requirements:**
- Firebase Blaze (pay-as-you-go) plan
- Expected cost: **$0/month** (well within free tier)

For detailed setup instructions, testing procedures, and troubleshooting, see **[CLOUD_FUNCTIONS_SETUP.md](_docs/CLOUD_FUNCTIONS_SETUP.md)**.

## 🔧 Troubleshooting

### Gradle File Locking Error

If you see "The process cannot access the file because it is being used by another process":

```bash
cd android
./gradlew --stop
cd ..
taskkill //F //IM java.exe
npx expo run:android
```

### Port 8081 Already in Use

```bash
# Find and kill the process
netstat -ano | grep ":8081"
taskkill //F //PID <process-id>
```

### App Won't Install

1. Clean build directories:
   ```bash
   rm -rf android/build android/app/build
   ```

2. Rebuild:
   ```bash
   npx expo run:android
   ```

### Firebase Configuration Errors

Check that your `.env` file has all required variables:
```bash
cat .env
```

Verify Firebase SDK initializes:
- Look for "✅ Firebase initialized successfully" in Metro bundler output

## 🔐 Security

### Sensitive Files (Never Commit!)

The following files contain secrets and are in `.gitignore`:
- `.env` - Firebase credentials
- `google-services.json` - Android Firebase config
- `GoogleService-Info.plist` - iOS Firebase config

**For team members:** Download these files from Firebase Console individually.

## 📚 Documentation

### Setup Guides
- [**_docs/FIREBASE_SETUP.md**](_docs/FIREBASE_SETUP.md) - Complete Firebase project configuration
- [**_docs/CLOUD_FUNCTIONS_SETUP.md**](_docs/CLOUD_FUNCTIONS_SETUP.md) - Cloud Functions deployment, testing, and troubleshooting
  - Presence tracking setup
  - Push notifications configuration
  - Cost monitoring and optimization
- [**_docs/EMULATOR_TESTING.md**](_docs/EMULATOR_TESTING.md) - Local Firebase emulator testing

### Project Documentation
- [**memory-bank/**](memory-bank/) - Project context, decisions, and architecture
  - [projectbrief.md](memory-bank/projectbrief.md) - Project overview and goals
  - [activeContext.md](memory-bank/activeContext.md) - Current status and next steps
  - [systemPatterns.md](memory-bank/systemPatterns.md) - Architecture and design patterns
  - [techContext.md](memory-bank/techContext.md) - Technology stack details
  - [progress.md](memory-bank/progress.md) - Implementation progress tracker
  - [productContext.md](memory-bank/productContext.md) - Product requirements and UX
- [**planning/**](planning/) - Product Requirements Documents (PRDs)
- [**tasks/**](tasks/) - Feature-specific task lists and completion status

## 🛠️ Tech Stack

- **Framework:** React Native with Expo SDK 54.x
- **Language:** TypeScript 5.x
- **Backend:** Firebase (Auth, Firestore, Realtime Database, Storage, FCM)
- **Local Database:** Expo SQLite 16.x
- **Navigation:** Expo Router 6.x
- **State Management:** React Context API

## 📦 Key Dependencies

- `expo` - Expo SDK
- `firebase` - Firebase JavaScript SDK
- `expo-router` - File-based navigation
- `expo-sqlite` - Local persistence
- `expo-notifications` - Push notifications
- `expo-image-picker` - Image selection
- `expo-dev-client` - Development builds with native modules
- `@react-native-community/netinfo` - Network status

## 🎯 Features

### Phase 1 (MVP) - Complete ✅

- ✅ Project setup and infrastructure
- ✅ Email/Password + Google authentication
- ✅ One-on-one messaging
- ✅ Offline support with sync
- ✅ Group chat
- ✅ Read receipts and presence (RTDB-based)
- ✅ Image sharing
- ✅ Foreground push notifications (Expo Push API)

### Phase 2.1 (AI Foundation) - Complete ✅

- ✅ **AI-Powered Translation**: Translate messages to your language (long-press message)
- ✅ **Cultural Context**: Understand cultural nuances and idioms (long-press message)
- ✅ **Slang Definitions**: Get explanations of unfamiliar terms (long-press message)
- ✅ **Smart Caching**: Instant results for previously translated messages
- ✅ **Cost Monitoring**: Track OpenAI token usage and costs
- ✅ **Rate Limiting**: 10 requests/min per user to prevent abuse

**Status:** Deployed and working! All three Cloud Functions are live. Long-press any message to access AI features.

### Phase 2.2 (Auto-Translation) - Complete ✅

- ✅ **Auto-Translation**: Real-time automatic translation of incoming messages
- ✅ **Language Detection**: Automatic detection of message languages using OpenAI
- ✅ **User Preferences**: Per-user preferred language with profile integration
- ✅ **Per-Conversation Settings**: Toggle auto-translate per conversation
- ✅ **Translation UI**: Globe icon toggle with animation and visual feedback
- ✅ **Offline Support**: SQLite storage for translations with offline access
- ✅ **Push Notification Translation**: Real-time translation for push notifications
- ✅ **Cultural Context Enhancement**: Language-aware cultural explanations
- ✅ **Cloud Functions Refactoring**: Centralized utility functions for maintainability
- ✅ **UI/UX Improvements**: Enhanced user experience with simplified interfaces

**Status:** Deployed and working! Auto-translation is live with comprehensive UI/UX enhancements.

## 📝 Git Workflow

1. Make changes
2. Stage changes: `git add .`
3. Commit (TypeScript check runs automatically): `git commit -m "feat: your message"`
4. If TypeScript errors exist, fix them and try again
5. Push: `git push`

## 🤝 Contributing

1. Follow conventional commit format: `feat:`, `fix:`, `chore:`, etc.
2. Ensure TypeScript compilation passes before committing
3. Keep code type-safe

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details

## 🤖 AI Features (Phase 2.1 & 2.2) - DEPLOYED ✅

MessageAI now includes powerful AI-powered features:
- **Auto-Translation** 🌐 - Automatically translate incoming messages in real-time (NEW!)
- **Manual Translation** - Translate specific messages to your preferred language
- **Explain Context** 💡 - Get cultural understanding and context
- **Define Slang** 📖 - Understand unfamiliar terms and idioms

### Auto-Translation (Phase 2.2)

**What is it?**  
Auto-translation automatically translates incoming messages based on your preferences. Enable it once, and all future messages in other languages are automatically translated!

**How to use:**
1. Open any conversation
2. Tap the 🌐 globe icon in the header
3. Toggle "Auto-Translate Messages" ON
4. Select your target language (e.g., English)
5. Tap "Save"

**Features:**
- ✅ Automatic language detection (< 1s)
- ✅ Smart translation (only translates if needed)
- ✅ Toggle to view original text
- ✅ Rate translations with 👍/👎
- ✅ Per-conversation settings
- ✅ Real-time sync across devices
- ✅ Visual indicator in header

**Supported Languages:**  
English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, Arabic, Russian, Hindi, and more!

For detailed documentation, see [**_docs/AI_FEATURES.md**](_docs/AI_FEATURES.md)

### Manual Translation and Other Features

Long-press any message in a conversation to:
- **Translate** to your preferred language
- **Explain Context** for cultural understanding
- **Define Slang** for unfamiliar terms

### For New Deployments

If you're deploying to a new Firebase project, you'll need to configure the OpenAI API key:

1. **Get OpenAI API Key**
   - Sign up at [platform.openai.com](https://platform.openai.com/)
   - Create an API key

2. **Configure Cloud Functions**
   ```bash
   cd functions
   firebase functions:config:set openai.key="your_api_key_here"
   firebase functions:config:set openai.model="gpt-4o-mini"  # optional, this is the default
   ```

3. **Deploy AI Functions**
   ```bash
   firebase deploy --only functions:translateMessage,functions:explainContext,functions:defineSlang,functions:detectLanguage,functions:autoTranslateOrchestrator
   ```

### Documentation

- **Setup Guide**: [_docs/AI_SETUP.md](_docs/AI_SETUP.md)
- **User Guide**: [_docs/AI_FEATURES.md](_docs/AI_FEATURES.md)
- **Implementation Status**: [_docs/AI_IMPLEMENTATION_STATUS.md](_docs/AI_IMPLEMENTATION_STATUS.md)

### Environment Variables

```env
# In functions/.env or Firebase config
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini  # Optional: default is gpt-4o-mini
```

### Cost Estimates (gpt-4o-mini)

- **Manual Translation**: ~$0.00001 per message
- **Auto-Translation**: ~$0.01-0.02 per message (includes detection + translation)
- **Explanation**: ~$0.00002 per message
- **Definition**: ~$0.00001 per message
- **Caching**: Subsequent views are free (auto-translated results cached)

## 🆘 Getting Help

- Check [_docs/FIREBASE_SETUP.md](_docs/FIREBASE_SETUP.md) for Firebase issues
- Check [_docs/AI_SETUP.md](_docs/AI_SETUP.md) for AI features setup
- Check [memory-bank/techContext.md](memory-bank/techContext.md) for technical details
- Review [tasks/](tasks/) for feature requirements

## 🎉 Current Status

**Phase:** PRD 2.2 Complete (Auto-Translation & Language Detection)
**Phase 1:** ✅ Complete (Full MVP with messaging, groups, presence, images, notifications)
**Phase 2:** PRD 2.2 Complete - Auto-translation, language detection, cultural context, and enhanced UI/UX
**Android:** ✅ Building and running with full functionality + AI features + auto-translation
**iOS:** ✅ Working in Expo Go

### Latest Completed Features

**PRD 2.2: Auto-Translation & Language Detection**
- ✅ Automatic language detection using OpenAI
- ✅ Real-time auto-translation orchestration with Firestore triggers
- ✅ User preferred language integration with profile
- ✅ Per-conversation auto-translate settings
- ✅ Translation UI with globe icon toggle and animation
- ✅ SQLite offline storage for translations
- ✅ Real-time translation for push notifications
- ✅ Language-aware cultural context explanations
- ✅ Cloud Functions refactoring for maintainability
- ✅ Enhanced UI/UX with pull-to-refresh, modal fixes, and performance optimizations

**PRD 2.1: AI Foundation Features**
- ✅ OpenAI integration with gpt-4o-mini
- ✅ On-demand message translation (long-press → Translate)
- ✅ Cultural context explanations (long-press → Explain Context)
- ✅ Slang and idiom definitions (long-press → Define Slang)
- ✅ Firestore caching to reduce API costs
- ✅ Rate limiting (10 requests/min per user)
- ✅ Cost monitoring and token usage tracking
- ✅ Three Cloud Functions deployed and tested
- ✅ Complete UI/UX integration in chat screen

**Previous Phase (PRD 08): Push Notifications**
- ✅ Expo Push Notifications with Cloud Functions
- ✅ Deep linking and notification grouping
- ✅ Authentication persistence

Ready for PRD 2.3: Smart Composition & AI Replies!

