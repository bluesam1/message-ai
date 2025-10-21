# Active Context

## Current Status
**Phase:** PRD 01 Complete ✅ - Ready for PRD 02 (Authentication)  
**Date:** October 21, 2025  
**Branch:** main  
**App Status:** Building and running on Android ✅

## What Just Happened

### ✅ Completed (PRD 01 - Project Setup)
1. **Firebase Project:** Configured with Auth, Firestore, Storage, and FCM
2. **Development Environment:** Expo project with TypeScript, all dependencies installed
3. **Testing Infrastructure:** Jest + React Native Testing Library configured (5/5 tests passing)
4. **Pre-commit Hooks:** Husky + lint-staged working (tests run before commits)
5. **Firebase Integration:** Config files set up with security best practices
6. **Android Build:** Development build successfully running on Pixel 7 emulator
7. **Documentation:** README.md and FIREBASE_SETUP.md created
8. **Windows Setup:** JAVA_HOME configured, Gradle issues resolved

### 📋 Feature PRDs Created
All PRDs are in `/tasks` directory:

1. **PRD 01 - Project Setup & Infrastructure** (Hours 0-2)
2. **PRD 02 - Authentication System** (Hours 2-5)
3. **PRD 03 - Core One-on-One Messaging** (Hours 5-10)
4. **PRD 04 - Offline Support & Sync** (Hours 10-14)
5. **PRD 05 - Group Chat** (Hours 14-17)
6. **PRD 06 - Read Receipts & Presence** (Hours 17-19)
7. **PRD 07 - Image Sharing** (Hours 19-21)
8. **PRD 08 - Push Notifications (Foreground)** (Hours 21-22)

## Current Focus

### Immediate Next Steps
**PRIORITY:** Begin PRD 02 - Authentication System

#### PRD 02 Goals
- Implement email/password authentication
- Implement Google Sign-In
- Create auth UI screens (SignIn, SignUp, Home)
- Set up auth state management
- Handle auth errors gracefully

#### Before Starting PRD 02
- [x] App launches successfully on Android
- [x] Firebase config is working
- [x] Project structure is set up
- [ ] Review PRD 02 requirements
- [ ] Plan component structure

## Active Decisions

### Technology Choices (Confirmed)
- **Frontend:** React Native with Expo SDK 50.x
- **Routing:** Expo Router v3.x
- **Backend:** Firebase (Auth, Firestore, Storage, FCM)
- **Local DB:** Expo SQLite v13.x
- **State:** Context API (keeping it simple, no Zustand unless needed)
- **Testing:** Jest + @testing-library/react-native
- **TypeScript:** v5.x

### Architecture Patterns (Confirmed)
- **Optimistic UI:** Show changes immediately, sync in background
- **Cache-First:** Load from SQLite, update from Firestore
- **Service Layer:** Separate business logic from UI
- **Component Structure:** Smart containers, dumb presentational components

### Performance Targets (Non-Negotiable)
| Action | Target | Maximum |
|--------|--------|---------|
| Message send (UI) | < 50ms | 100ms |
| Open conversation | < 100ms | 200ms |
| Screen navigation | < 200ms | 300ms |
| FPS (scrolling) | 60 FPS | 55 FPS |
| App launch | < 1.5s | 2.5s |

**Rule:** If we exceed maximum times, STOP and optimize before continuing.

## Known Challenges & Solutions

### 1. Google OAuth Setup ✅ SOLVED
**Challenge:** OAuth configuration is notoriously tricky  
**Solution:** Firebase auto-generates OAuth client IDs when you add iOS/Android apps
- No need to manually create client IDs in Google Cloud Console
- Just download `google-services.json` and `GoogleService-Info.plist`
- Add them to project root and configure `app.json`

### 2. iOS Build on Windows ✅ DOCUMENTED
**Challenge:** Can't build iOS locally on Windows machine  
**Solution:** Use EAS Build cloud service (documented in README)
- Deferred iOS testing until needed
- Will use `eas build --platform ios --profile development`

### 3. Windows-Specific Issues ✅ SOLVED
**Challenge:** JAVA_HOME not configured, Gradle issues, port conflicts  
**Solutions:**
- Set JAVA_HOME to Android Studio JBR: `C:\Program Files\Android\Android Studio\jbr`
- Kill Gradle processes: `./gradlew --stop` and `taskkill //F //IM java.exe`
- Handle port conflicts by accepting alternate ports or killing processes

### 4. 24-Hour Timeline
**Status:** On track! PRD 01 complete (98%)  
**Mitigation:** 
- Skip ALL optional features if behind schedule
- Decision points at hours 10, 16, 20, 22
- Focus on CRITICAL features only

## Dependencies & Blockers

### Current Blockers
**NONE** - Ready to start implementation

### Dependency Chain
```
PRD 01 (Setup) 
    ↓
PRD 02 (Auth) 
    ↓
PRD 03 (Core Messaging) ←─┐
    ↓                      │
PRD 04 (Offline) ──────────┤
    ↓                      │
PRD 05 (Groups) ───────────┤
    ↓                      │
PRD 06 (Read Receipts) ────┤  ← Can develop in parallel
PRD 07 (Images) ───────────┤  ← Can develop in parallel
PRD 08 (Notifications) ────┘  ← Can develop in parallel
```

## Recent Insights

### From PRD 01 Implementation
1. **Firebase OAuth Simplified:** Auto-generated client IDs eliminate manual setup
2. **Windows Dev Challenges:** JAVA_HOME, Gradle, and port issues are common
3. **Development Builds Required:** expo-dev-client needed for Firebase native modules
4. **Security Best Practices:** Keep `.env`, `google-services.json`, and `GoogleService-Info.plist` out of git
5. **First Build is Slow:** 5-6 minutes for initial Android build, subsequent builds much faster
6. **Testing Setup is Crucial:** Pre-commit hooks catch issues before they reach git

### From PRD Analysis
1. **Test Coverage Focus:** Focus tests on utils and business logic, skip UI/Firebase tests
2. **Performance Budget:** FlatList optimizations are critical for 60 FPS goal
3. **Scope Management:** Many "optional" features identified - defer aggressively
4. **Error Handling:** Every feature PRD includes detailed error scenarios

### From Planning Phase
1. **Feature Cohesion:** Features build naturally on each other
2. **Clear Boundaries:** Each PRD is self-contained with clear interfaces
3. **Testing Strategy:** Unit tests for logic, manual tests for integration
4. **Documentation Quality:** PRDs are detailed enough for junior developers

## Working Notes

### Firebase Setup Prep
Need to gather before starting:
- Google account for Firebase console
- Apple Developer account (for iOS OAuth client)
- Android SHA-1 certificate fingerprint
- Expo account (for EAS Build)

### Development Environment
Currently using:
- OS: Windows 10
- Shell: Git Bash
- IDE: Cursor (with AI assistance)
- Workspace: `C:\Users\SamExel\repos\message-ai`

### Git Status
- Initial commits made
- PRD 01 implementation committed
- Branch: main
- Clean working directory

## Questions Resolved

### PRD 01
- ✅ Firebase project created: "MessageAI"
- ✅ Bundle ID decided: `com.bluesam.messagai`
- ✅ OAuth setup simplified (auto-generated)
- ✅ Windows-specific issues documented and solved
- ✅ Emulator performance verified (Pixel 7, API 35)

### For PRD 02
- ❓ Which auth method to implement first? → Email/password or Google Sign-In?
- ❓ Do we need password reset flow in MVP? → Check PRD 02
- ❓ How to handle auth state persistence? → AsyncStorage or SecureStore?

## Next Session Prep

### When Returning to This Project
1. Read this file first (activeContext.md)
2. Check progress.md for what's completed
3. Review current PRD we're working on
4. Check git status for uncommitted changes
5. Read any "Working Notes" sections above

### Context for AI Assistant
- Project is in early stage (planning → implementation transition)
- All requirements are documented in PRDs
- Follow strict performance budgets
- Test coverage is mandatory (70%+)
- 24-hour timeline means ruthless scope management

---

**Next Action:** Start PRD 02 - Authentication System  
**Expected Duration:** 3 hours  
**Goal:** Users can sign up, sign in, and sign out with email/password and Google

**Key Files to Create:**
- `src/services/firebase/auth.ts` - Auth service
- `app/auth/signin.tsx` - Sign In screen
- `app/auth/signup.tsx` - Sign Up screen
- `app/index.tsx` - Home screen (protected)
- `src/contexts/AuthContext.tsx` - Auth state management



