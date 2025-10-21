# Task List: PRD 01 - Project Setup & Infrastructure

**Source:** `prd 01 - Project Setup & Infrastructure.md`  
**Timeline:** Hours 0-2  
**Priority:** CRITICAL

---

## Relevant Files

- `.env` - Firebase credentials and environment variables (gitignored) ✅ CREATED
- `.env.template` - Template showing required environment variables ✅ CREATED
- `src/config/firebase.ts` - Firebase SDK initialization ✅ CREATED
- `FIREBASE_SETUP.md` - Step-by-step Firebase setup guide ✅ CREATED
- `jest.config.js` - Jest testing configuration
- `__tests__/sample.test.ts` - Sample test to verify Jest setup
- `.husky/pre-commit` - Pre-commit hook script
- `app/_layout.tsx` - Root layout for Expo Router
- `app/(auth)/_layout.tsx` - Auth group layout
- `app/(tabs)/_layout.tsx` - Tabs group layout
- `src/components/.gitkeep` - Placeholder for components directory
- `src/services/.gitkeep` - Placeholder for services directory
- `src/utils/.gitkeep` - Placeholder for utils directory
- `src/hooks/.gitkeep` - Placeholder for hooks directory
- `src/types/.gitkeep` - Placeholder for types directory
- `src/store/.gitkeep` - Placeholder for store directory
- `__tests__/.gitkeep` - Placeholder for tests directory
- `google-services.json` - Android Firebase config (gitignored)
- `GoogleService-Info.plist` - iOS Firebase config (gitignored)

### Notes

- Unit tests should be placed in the `__tests__/` directory, mirroring the `src/` structure
- Run tests with `npm test` or `npx jest`
- Pre-commit hooks will automatically run tests before allowing commits
- Firebase config files should never be committed to git (add to .gitignore)

---

## Tasks

- [x] 1.0 Initialize Expo Project & Dependencies
  - [x] 1.1 Create Expo project with TypeScript template
  - [x] 1.2 Install core dependencies (expo, expo-router, firebase, expo-sqlite, expo-notifications, expo-image-picker)
  - [x] 1.3 Install testing dependencies (@testing-library/react-native, jest, @types/jest)
  - [x] 1.4 Install pre-commit hook dependencies (husky, lint-staged)
  - [x] 1.5 Install network utilities (@react-native-community/netinfo for offline detection)
  - [x] 1.6 Create project folder structure (src/, app/, __tests__/)
  - [x] 1.7 Add .gitkeep files to preserve empty directories

- [x] 2.0 Configure Firebase Services
  - [x] 2.1 Create Firebase project at console.firebase.google.com
  - [x] 2.2 Add iOS and Android apps to Firebase project (no web app needed)
  - [x] 2.3 Enable Email/Password authentication in Firebase console
  - [x] 2.4 Enable Google Sign-In authentication in Firebase console
  - [x] 2.5 Create Firestore database in test mode
  - [x] 2.6 Set up Firebase Storage bucket in test mode
  - [x] 2.7 Download google-services.json for Android (FCM enabled automatically)
  - [x] 2.8 Download GoogleService-Info.plist for iOS (FCM enabled automatically)
  - [x] 2.9 Create .env file with Firebase credentials (API key, auth domain, project ID, etc.)
  - [x] 2.10 Add .env to .gitignore (also added Firebase config files)
  - [x] 2.11 Create src/config/firebase.ts with Firebase initialization code
  - [x] 2.12 Verify Firebase SDK initializes without errors

- [x] 3.0 Set Up Google OAuth Authentication
  - [x] 3.1 Firebase auto-generated OAuth client IDs when Google Sign-In was enabled
  - [x] 3.2 Android SHA-1 certificate fingerprint generated for debug keystore
  - [x] 3.3 Package name and bundle ID added to app.json (com.bluesam.messagai)
  - [x] 3.4 URL scheme configured in app.json for OAuth redirects
  - [x] 3.5 Firebase config files linked in app.json (googleServicesFile)
  - [ ] 3.6 Test OAuth configuration when authentication is implemented (PRD 02)

- [ ] 4.0 Configure Testing Infrastructure
  - [ ] 4.1 Create jest.config.js with React Native preset
  - [ ] 4.2 Configure Jest to ignore node_modules and find test files
  - [ ] 4.3 Add test scripts to package.json (test, test:watch, test:coverage)
  - [ ] 4.4 Create sample test file (__tests__/sample.test.ts) to verify Jest works
  - [ ] 4.5 Run tests and verify they pass
  - [ ] 4.6 Initialize husky with `npx husky install`
  - [ ] 4.7 Create .husky/pre-commit hook
  - [ ] 4.8 Configure pre-commit hook to run `npm test`
  - [ ] 4.9 Test pre-commit hook by making a commit
  - [ ] 4.10 Verify tests complete in < 30 seconds

- [ ] 5.0 Validate Development Environment
  - [ ] 5.1 Start Expo dev server with `npm start`
  - [ ] 5.2 Test app launches on Android emulator or device
  - [ ] 5.3 Test app launches on iOS simulator (or configure EAS Build if on Windows)
  - [ ] 5.4 Verify no build errors or warnings
  - [ ] 5.5 Verify Firebase SDK initializes without console errors
  - [ ] 5.6 Run full test suite and verify all tests pass
  - [ ] 5.7 Make test commit to verify pre-commit hook blocks broken code
  - [ ] 5.8 Document any platform-specific issues or workarounds

---

**Status:** Task list complete with sub-tasks. Ready for implementation.  
**Completed:** 27/41 tasks (Project initialized, Firebase configured, OAuth ready) 
**Progress:** Task 1.0 ✅ COMPLETE | Task 2.0 ✅ COMPLETE | Task 3.0 ✅ COMPLETE | Starting Task 4.0 (Testing Infrastructure)

