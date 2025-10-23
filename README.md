# MessageAI

A real-time messaging application built with React Native (Expo) and Firebase. Features include one-on-one and group messaging, offline support, read receipts, presence indicators, image sharing, and push notifications.

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
   
   Follow the detailed guide in `FIREBASE_SETUP.md`, or quick steps:
   
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
├── __tests__/              # Unit tests
├── assets/                 # Images, fonts, etc.
└── android/                # Native Android project (generated)
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Coverage Requirements:** 70%+ overall
- Utilities: 80%+
- Business Logic: 70%+
- Services: 60%+

### Pre-commit Hooks

Tests run automatically before each commit. If tests fail, the commit is blocked.

To skip (not recommended):
```bash
git commit --no-verify
```

### Starting Metro Bundler

```bash
npm start
```

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

- `FIREBASE_SETUP.md` - Detailed Firebase setup guide
- `CLOUD_FUNCTIONS_SETUP.md` - Cloud Functions deployment guide
- `EMULATOR_TESTING.md` - Firebase emulators setup
- `memory-bank/` - Project context and decisions
- `planning/` - Product requirements documents
- `tasks/` - Feature-specific PRDs and task lists

## 🛠️ Tech Stack

- **Framework:** React Native with Expo SDK 54.x
- **Language:** TypeScript 5.x
- **Backend:** Firebase (Auth, Firestore, Realtime Database, Storage, FCM)
- **Local Database:** Expo SQLite 16.x
- **Navigation:** Expo Router 6.x
- **Testing:** Jest + React Native Testing Library
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

## 🎯 MVP Features (Phase 1)

- ✅ Project setup and infrastructure
- ✅ Email/Password + Google authentication
- ✅ One-on-one messaging
- ✅ Offline support with sync
- ✅ Group chat
- ✅ Read receipts and presence (RTDB-based)
- ✅ Image sharing
- ✅ Foreground push notifications (Expo Push API)

## 🧪 Testing

Tests must pass before commits are allowed (enforced by pre-commit hook).

```bash
# Run all tests
npm test

# Expected output:
# Test Suites: 1 passed
# Tests:       5 passed
# Time:        < 3 seconds
```

## 📝 Git Workflow

1. Make changes
2. Stage changes: `git add .`
3. Commit (tests run automatically): `git commit -m "feat: your message"`
4. If tests fail, fix issues and try again
5. Push: `git push`

## 🤝 Contributing

1. Follow conventional commit format: `feat:`, `fix:`, `chore:`, etc.
2. Write tests for new features
3. Ensure all tests pass before committing
4. Keep coverage above 70%

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details

## 🆘 Getting Help

- Check `FIREBASE_SETUP.md` for Firebase issues
- Check `memory-bank/techContext.md` for technical details
- Review `tasks/` for feature requirements

## 🎉 Current Status

**Phase:** PRD 08 Complete (Push Notifications)
**Progress:** ~95% (Core messaging, offline support, groups, presence, image sharing, and push notifications complete)
**Android:** ✅ Building and running with full functionality
**iOS:** ✅ Working in Expo Go (foreground notifications only without APNs certificate)

### Latest Completed Features

**PRD 08: Push Notifications (Foreground)**
- ✅ Expo Push Notifications integration
- ✅ Cloud Function with Expo Server SDK
- ✅ Rich notification payloads (sender name, message type, conversation context)
- ✅ Notification collapsing and grouping by conversation
- ✅ Deep linking to conversations on notification tap
- ✅ Automatic invalid token cleanup
- ✅ Authentication persistence across app restarts

Ready for production deployment!

