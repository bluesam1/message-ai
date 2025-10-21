# Firebase Setup Guide for MessageAI

This guide walks you through setting up Firebase for the MessageAI mobile app.

## Prerequisites
- Google account
- About 15-20 minutes

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `MessageAI` (or your preferred name)
4. **Google Analytics:** Optional (you can disable for MVP)
5. Click **"Create project"** and wait for it to initialize

---

## Step 2: Add iOS App to Firebase

1. In your Firebase project, click the **iOS icon** (⚙️ next to Project Overview)
2. **iOS bundle ID:** Use `com.messageai.app` (or match what's in your `app.json`)
3. **App nickname:** `MessageAI iOS` (optional)
4. **App Store ID:** Leave blank for now
5. Click **"Register app"**
6. **Download `GoogleService-Info.plist`**
7. Place the downloaded file in your project root: `message-ai/GoogleService-Info.plist`
8. Click **"Next"** and **"Continue to console"** (skip SDK instructions)

---

## Step 3: Add Android App to Firebase

1. Click the **Android icon** (robot) to add Android app
2. **Android package name:** Use `com.messageai.app` (same as iOS for consistency)
3. **App nickname:** `MessageAI Android` (optional)
4. **Debug signing certificate SHA-1:** 
   - Open terminal/Git Bash in your project
   - Run this command:
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
   - Copy the **SHA-1** value and paste it into Firebase
5. Click **"Register app"**
6. **Download `google-services.json`**
7. Place the downloaded file in your project root: `message-ai/google-services.json`
8. Click **"Next"** and **"Continue to console"**

---

## Step 4: Get Firebase Web Config (for React Native)

1. In Firebase Console, click the **⚙️ Settings icon** > **Project settings**
2. Scroll down to **"Your apps"** section
3. You should see your iOS and Android apps listed
4. Click **"Add app"** > Select the **Web icon** `</>`
5. **App nickname:** `MessageAI Config` (just for getting credentials)
6. **Don't** check "Also set up Firebase Hosting"
7. Click **"Register app"**
8. **Copy the firebaseConfig object** - it looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "messageai-xxxxx.firebaseapp.com",
     projectId: "messageai-xxxxx",
     storageBucket: "messageai-xxxxx.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123456"
   };
   ```
9. Click **"Continue to console"**

---

## Step 5: Fill in .env File

1. Open the `.env` file in your project root
2. Copy values from the Firebase config object you just got:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=messageai-xxxxx.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=messageai-xxxxx
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=messageai-xxxxx.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
   EXPO_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
   ```
3. Save the file

---

## Step 6: Enable Authentication

1. In Firebase Console, go to **Build** > **Authentication**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle **Enable** to ON
   - Click **"Save"**
5. Enable **Google**:
   - Click on "Google"
   - Toggle **Enable** to ON
   - **Project support email:** Select your email
   - Click **"Save"**

---

## Step 7: Create Firestore Database

1. In Firebase Console, go to **Build** > **Firestore Database**
2. Click **"Create database"**
3. **Security rules:** Select **"Start in test mode"**
   - ⚠️ Warning will show - that's OK for development
   - We'll add proper security rules later
4. **Location:** Choose closest to your users (e.g., `us-central1`)
5. Click **"Enable"**
6. Wait for database to be created

---

## Step 8: Set Up Firebase Storage

1. In Firebase Console, go to **Build** > **Storage**
2. Click **"Get started"**
3. **Security rules:** Select **"Start in test mode"**
   - ⚠️ Warning will show - that's OK for development
4. **Storage location:** Use same region as Firestore
5. Click **"Done"**

---

## Step 9: Verify Setup

Run this command in your project directory:
```bash
npm start
```

If Firebase is configured correctly, you should see in the console:
```
✅ Firebase initialized successfully
📦 Project ID: messageai-xxxxx
```

If you see errors about missing environment variables, double-check your `.env` file.

---

## Files You Should Have Now

- ✅ `.env` (filled with your Firebase config)
- ✅ `google-services.json` (in project root)
- ✅ `GoogleService-Info.plist` (in project root)
- ✅ `src/config/firebase.ts` (already created)

## ⚠️ IMPORTANT: Do NOT Commit These Files!

These Firebase configuration files are **already in `.gitignore`** and should **NEVER be committed** to git:

- ❌ `.env` - Contains your actual Firebase credentials
- ❌ `google-services.json` - Android Firebase configuration
- ❌ `GoogleService-Info.plist` - iOS Firebase configuration

**Why?**
- While Firebase API keys aren't technically "secret" (they're in your compiled app), keeping them out of git:
  - Prevents exposing your project structure publicly
  - Avoids potential quota abuse
  - Follows security best practices
  - Protects OAuth client IDs

**What's Safe to Commit?**
- ✅ `.env.template` - Template with no actual keys
- ✅ `app.json` - App configuration (package names are public)
- ✅ `src/config/firebase.ts` - Code that reads from .env (no hardcoded keys)

**For Team Members:**
Each developer should:
1. Download their own copies of `google-services.json` and `GoogleService-Info.plist` from Firebase Console
2. Create their own `.env` file from `.env.template`
3. Place all three files in the project root
4. Verify they're listed in `.gitignore` and not staged for commit

---

## Troubleshooting

### "Missing environment variables" error
- Make sure `.env` file is in project root
- Restart Expo dev server after editing `.env`
- Check for typos in variable names (must start with `EXPO_PUBLIC_`)

### SHA-1 fingerprint not working
- Make sure you're using the debug keystore (not production)
- Try running the keytool command from Git Bash (not PowerShell)
- On Windows, keystore is usually in `C:\Users\YourName\.android\debug.keystore`

### Can't find .android folder
- Run `expo run:android` once to generate the folder
- Or manually create it: `mkdir ~/.android` then generate keystore

---

## Next Steps

Once Firebase is configured, you'll move on to:
- Task 3.0: Google OAuth setup
- Task 4.0: Testing infrastructure
- Task 5.0: Validation

For help with Google OAuth, see the PRD 01 task list.


