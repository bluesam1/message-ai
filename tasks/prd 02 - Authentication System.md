# PRD 02: Authentication System

## Overview
Implement user authentication with email/password and Google Sign-In, including user profile creation and secure session management. This feature gates access to all messaging functionality.

**Timeline:** Hours 2-5 of 24-hour MVP development  
**Priority:** CRITICAL (Blocks all messaging features)

---

## Goals
1. Enable users to register and log in with email/password
2. Enable users to sign in with Google accounts
3. Create user profiles with display names and photos
4. Implement secure session management
5. Set up Expo Router navigation for authenticated and unauthenticated states

---

## User Stories
- **US-001:** As a new user, I want to register with email/password so I can create an account
- **US-002:** As a returning user, I want to log in with email/password so I can access my messages
- **US-003:** As a user, I want to sign in with Google so I don't need to remember another password
- **US-AUTH-001:** As a user, I want to set my display name and photo so others can identify me
- **US-AUTH-002:** As a user, I want to stay logged in after closing the app so I don't have to sign in repeatedly

---

## Functional Requirements

### Email/Password Authentication
1. Create registration screen with fields:
   - Email address (validated format)
   - Password (minimum 6 characters)
   - Display name
2. Show appropriate error messages:
   - Invalid email format
   - Weak password (< 6 chars)
   - Email already in use
   - Network errors
3. Create login screen with fields:
   - Email address
   - Password
4. Show login error messages:
   - Invalid credentials
   - User not found
   - Network errors
5. Implement "Forgot Password" flow (optional for MVP, can defer)

### Google Sign-In
6. Add "Sign in with Google" button on login screen
7. Trigger Google OAuth flow using expo-auth-session
8. Handle OAuth callback with Firebase authentication
9. Extract user profile data (email, name, photo) from Google
10. Show error if Google Sign-In fails or is cancelled

### User Profile Creation
11. On first registration, create user document in Firestore:
    ```
    users/{userId}
      - email: string
      - displayName: string
      - photoURL: string (optional)
      - online: boolean (default: true)
      - lastSeen: timestamp
      - createdAt: timestamp
    ```
12. For Google Sign-In, auto-populate profile from Google account
13. For email/password, allow user to set display name during registration
14. Allow optional profile photo upload during setup (can defer to later)

### Session Management
15. Listen to Firebase Auth state changes (`onAuthStateChanged`)
16. Persist auth session across app restarts (Firebase handles this)
17. Redirect authenticated users to main app
18. Redirect unauthenticated users to login screen
19. Implement sign-out functionality
20. Update user's `online` status to `true` on login
21. Update user's `lastSeen` timestamp on logout

### Navigation Structure
22. Set up Expo Router with auth state handling:
    ```
    app/
    ├── (auth)/
    │   ├── login.tsx
    │   ├── register.tsx
    │   └── _layout.tsx
    ├── (tabs)/
    │   ├── index.tsx (conversations list)
    │   └── profile.tsx
    └── _layout.tsx (root - handles auth redirect)
    ```
23. Root layout checks auth state and redirects accordingly
24. Use `<Slot />` or `<Stack />` for navigation groups

### User Profile Service
25. Create `src/services/firebase/userService.ts`:
    - `createUserProfile(userId, userData)` - creates Firestore user doc
    - `getUserProfile(userId)` - fetches user profile
    - `updateUserProfile(userId, updates)` - updates profile fields
    - `updateOnlineStatus(userId, online)` - sets online/offline
    - `updateLastSeen(userId)` - updates timestamp

---

## Non-Goals (Out of Scope)
- ❌ Phone number authentication
- ❌ Biometric authentication (Face ID, fingerprint)
- ❌ Profile editing after registration (post-MVP)
- ❌ Password reset email templates (use Firebase defaults)
- ❌ Account deletion
- ❌ Multi-factor authentication (MFA)
- ❌ Social logins beyond Google (Facebook, Apple, etc.)

---

## Design Considerations

### UI Screens
**Login Screen:**
- Email input field
- Password input field (masked)
- "Log In" button
- "Sign in with Google" button
- "Don't have an account? Register" link

**Registration Screen:**
- Email input field
- Password input field (masked)
- Display name input field
- "Create Account" button
- "Already have an account? Log In" link

**Profile Setup (if needed):**
- Display name field (pre-filled for Google users)
- Optional photo upload
- "Complete Setup" button

### UX Considerations
- Show loading indicators during auth operations
- Disable buttons while processing to prevent double-submission
- Clear, user-friendly error messages (avoid technical jargon)
- Auto-focus first input field on screen load

---

## Technical Considerations

### Firebase Auth Configuration
```typescript
// src/config/firebase.ts
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
```

### Auth Service Structure
```typescript
// src/services/firebase/authService.ts
export const authService = {
  registerWithEmail: async (email: string, password: string, displayName: string) => {
    // Create user with createUserWithEmailAndPassword
    // Update profile with updateProfile
    // Create Firestore user document
  },
  
  loginWithEmail: async (email: string, password: string) => {
    // Sign in with signInWithEmailAndPassword
    // Update online status
  },
  
  signInWithGoogle: async () => {
    // Use expo-auth-session to get Google token
    // Sign in with signInWithCredential
    // Create/update Firestore user document
  },
  
  signOut: async (userId: string) => {
    // Update lastSeen and online status
    // Call Firebase signOut
  }
};
```

### Auth Context (State Management)
```typescript
// src/store/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}
```

### Error Handling
Map Firebase error codes to user-friendly messages:
- `auth/email-already-in-use` → "This email is already registered"
- `auth/weak-password` → "Password must be at least 6 characters"
- `auth/user-not-found` → "No account found with this email"
- `auth/wrong-password` → "Incorrect password"
- `auth/network-request-failed` → "Network error. Please check your connection"

---

## Success Metrics
- ✅ Users can register with email/password
- ✅ Users can log in with email/password
- ✅ Users can sign in with Google (OAuth flow completes)
- ✅ User profile created in Firestore on registration
- ✅ Auth state persists across app restarts
- ✅ Sign out works and redirects to login
- ✅ Online status updates correctly

---

## Acceptance Criteria
- [ ] Registration screen implemented and functional
- [ ] Login screen implemented and functional
- [ ] Email/password registration works
- [ ] Email/password login works
- [ ] Google Sign-In button triggers OAuth flow
- [ ] Google Sign-In completes and creates user profile
- [ ] User document created in Firestore with all required fields
- [ ] Auth state persists after app restart
- [ ] Authenticated users see main app
- [ ] Unauthenticated users see login screen
- [ ] Sign out logs user out and redirects to login
- [ ] Error messages display for invalid inputs
- [ ] Loading states show during async operations
- [ ] No console errors or warnings

---

## Testing Requirements

### Unit Tests
```typescript
// __tests__/services/authService.test.ts
describe('authService', () => {
  it('should validate email format', () => {});
  it('should validate password length', () => {});
  it('should handle registration errors gracefully', () => {});
});
```

### Manual Testing Checklist
- [ ] Test registration with valid email/password
- [ ] Test registration with invalid email
- [ ] Test registration with weak password
- [ ] Test registration with existing email
- [ ] Test login with correct credentials
- [ ] Test login with incorrect password
- [ ] Test Google Sign-In flow (requires real device/OAuth setup)
- [ ] Test sign out
- [ ] Close and reopen app - verify still logged in
- [ ] Test on both Android and iOS

---

## Open Questions
- Should we implement "Forgot Password" flow in MVP? (Recommended: Yes, Firebase makes it easy)
- Do we need profile photo upload during registration? (Recommended: Defer to post-MVP)

---

## Dependencies
- **Depends on:** PRD 01 (Project Setup & Infrastructure) - Firebase must be configured
- **Blocks:** PRD 03 (Core Messaging), PRD 04 (Offline Support), PRD 05 (Group Chat)

---

## Resources
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth/web/start)
- [Expo Google Sign-In Guide](https://docs.expo.dev/guides/google-authentication/)
- [Expo Router Auth Flow](https://docs.expo.dev/router/reference/authentication/)


