# PRD 01: Project Setup & Infrastructure

## Overview
Establish the foundational infrastructure for MessageAI, including project initialization, Firebase configuration, testing framework, and development tooling. This is a prerequisite for all feature development.

**Timeline:** Hours 0-2 of 24-hour MVP development  
**Priority:** CRITICAL (Blocks all other features)

---

## Goals
1. Create a working Expo + TypeScript React Native project
2. Configure Firebase services (Auth, Firestore, Storage, FCM)
3. Enable Google Sign-In authentication infrastructure
4. Set up automated testing with pre-commit hooks
5. Validate the development environment works on both platforms

---

## User Stories
- **US-INFRA-001:** As a developer, I need a TypeScript Expo project so I can build type-safe React Native code
- **US-INFRA-002:** As a developer, I need Firebase configured so I can use backend services
- **US-INFRA-003:** As a developer, I need Google OAuth set up so users can sign in with Google
- **US-INFRA-004:** As a developer, I need unit tests running automatically so broken code doesn't get committed

---

## Functional Requirements

### Project Initialization
1. Create Expo project with TypeScript template
2. Install all required dependencies:
   - Firebase SDK (Auth, Firestore, Storage)
   - expo-sqlite for local persistence
   - expo-notifications for push notifications
   - expo-image-picker for media
   - Jest and @testing-library/react-native
3. Configure Expo Router for navigation
4. Set up project folder structure per `Initial Folder Structure.md`:
   - `src/` for components, services, utils, hooks
   - `app/` for Expo Router screens
   - `__tests__/` mirroring src structure

### Firebase Configuration
5. Create Firebase project at console.firebase.google.com
6. Enable Authentication providers:
   - Email/Password
   - Google Sign-In
7. Create Firestore database (start in test mode)
8. Set up Firebase Storage (start in test mode)
9. Download configuration files (FCM is automatically enabled):
    - `google-services.json` (Android)
    - `GoogleService-Info.plist` (iOS)
11. Create `.env` file with Firebase credentials:
    ```
    EXPO_PUBLIC_FIREBASE_API_KEY=
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
    EXPO_PUBLIC_FIREBASE_PROJECT_ID=
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
    EXPO_PUBLIC_FIREBASE_APP_ID=
    ```
12. Create `src/config/firebase.ts` to initialize Firebase SDK

### Google Sign-In Setup
13. Go to Google Cloud Console → APIs & Services → Credentials
14. Create OAuth 2.0 Client IDs:
    - iOS client (using bundle ID)
    - Android client (using SHA-1 certificate fingerprint)
15. Add URL scheme to `app.json`: `"scheme": "com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID"`
16. Test OAuth redirect flow works

### Testing Infrastructure
17. Configure Jest with React Native preset
18. Create `jest.config.js` with appropriate test patterns
19. Add test scripts to `package.json`:
    - `npm test` - run all tests
    - `npm run test:watch` - watch mode
    - `npm run test:coverage` - coverage report
20. Install husky and lint-staged
21. Run `npx husky install`
22. Create `.husky/pre-commit` hook that runs `npm test`
23. Ensure tests pass in < 30 seconds

### Validation
24. Verify Android emulator launches app
25. Verify iOS simulator launches app (or use EAS Build if on Windows)
26. Confirm Firebase connection works (can initialize SDK)
27. Verify test suite runs successfully

---

## Non-Goals (Out of Scope)
- ❌ Any UI components or feature screens
- ❌ Backend deployment (Cloud Functions come later)
- ❌ Production Firebase security rules (use test mode for MVP)
- ❌ CI/CD pipelines (manual testing for MVP)
- ❌ App store deployment configuration

---

## Technical Considerations

### Dependencies
```json
{
  "dependencies": {
    "expo": "~50.x",
    "expo-router": "~3.x",
    "firebase": "^10.x",
    "expo-sqlite": "~13.x",
    "expo-notifications": "~0.27.x",
    "expo-image-picker": "~14.x",
    "react-native": "0.73.x"
  },
  "devDependencies": {
    "@testing-library/react-native": "^12.x",
    "@types/jest": "^29.x",
    "husky": "^8.x",
    "jest": "^29.x",
    "lint-staged": "^15.x",
    "typescript": "^5.x"
  }
}
```

### File Structure
```
messageai/
├── app/                    # Expo Router screens (create structure only)
│   ├── (auth)/
│   ├── (tabs)/
│   └── _layout.tsx
├── src/
│   ├── config/
│   │   └── firebase.ts    # Firebase initialization
│   ├── components/
│   ├── services/
│   ├── utils/
│   └── hooks/
├── __tests__/             # Mirror src structure
├── .env                   # Firebase credentials (gitignored)
├── jest.config.js
├── .husky/
│   └── pre-commit
└── app.json               # Include OAuth scheme
```

### Firebase Test Mode Rules
```javascript
// Firestore rules (temporary - secure in production)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

---

## Success Metrics
- ✅ `npm start` launches Expo dev server
- ✅ App loads on Android emulator/iOS simulator
- ✅ Firebase SDK initializes without errors
- ✅ `npm test` runs and passes in < 30s
- ✅ Pre-commit hook blocks commits when tests fail
- ✅ Google OAuth client IDs configured correctly

---

## Acceptance Criteria
- [ ] Expo project created with TypeScript
- [ ] All dependencies installed successfully
- [ ] Firebase project created and configured
- [ ] Email/Password and Google auth enabled in Firebase
- [ ] Firestore and Storage set up in test mode
- [ ] `.env` file contains all Firebase credentials
- [ ] `src/config/firebase.ts` initializes Firebase
- [ ] Google OAuth client IDs created for iOS and Android
- [ ] Jest configured and sample test passes
- [ ] Pre-commit hook installed and working
- [ ] App launches on both Android and iOS
- [ ] No build errors or warnings

---

## Open Questions
- None (all requirements are well-defined)

---

## Dependencies
- **Blocks:** All other features (this is the foundation)
- **Blocked by:** None

---

## Resources
- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Setup Guide](https://firebase.google.com/docs/web/setup)
- [Google Sign-In OAuth Setup](https://docs.expo.dev/guides/google-authentication/)
- [Jest Configuration for React Native](https://jestjs.io/docs/tutorial-react-native)

