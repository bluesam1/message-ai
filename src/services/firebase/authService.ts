/**
 * Firebase Authentication Service
 * 
 * Handles user authentication operations including:
 * - Email/password registration and login
 * - Google Sign-In
 * - Sign out with status updates
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../../config/firebase';
import { AuthUser, toAuthUser } from '../../types/auth';
import { userService } from './userService';

// Required for expo-auth-session to work properly
WebBrowser.maybeCompleteAuthSession();

/**
 * Register a new user with email and password
 * Creates Firebase auth account and user profile in Firestore
 */
export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<AuthUser> => {
  try {
    // Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name in Firebase Auth
    await updateProfile(user, { displayName });

    // Create user profile in Firestore
    await userService.createUserProfile(user.uid, {
      email: user.email!,
      displayName,
      photoURL: user.photoURL || undefined,
    });

    // Set user as online
    await userService.updateOnlineStatus(user.uid, true);

    // Return AuthUser
    return toAuthUser(user)!;
  } catch (error: any) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Sign in with email and password
 * Updates online status on successful login
 */
export const loginWithEmail = async (
  email: string,
  password: string
): Promise<AuthUser> => {
  try {
    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update online status
    await userService.updateOnlineStatus(user.uid, true);

    // Return AuthUser
    return toAuthUser(user)!;
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Sign out current user
 * Updates last seen and online status before signing out
 */
export const signOut = async (userId: string): Promise<void> => {
  try {
    // Update last seen timestamp
    await userService.updateLastSeen(userId);

    // Set user as offline
    await userService.updateOnlineStatus(userId, false);

    // Sign out from Firebase
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Listen to Firebase auth state changes
 * Returns unsubscribe function
 */
export const onAuthStateChanged = (
  callback: (user: AuthUser | null) => void
): (() => void) => {
  return firebaseOnAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    const authUser = toAuthUser(firebaseUser);
    callback(authUser);
  });
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = (): AuthUser | null => {
  return toAuthUser(auth.currentUser);
};

/**
 * Sign in with Google OAuth
 * Uses expo-auth-session for OAuth flow
 * 
 * Note: Requires Google Web Client ID in environment variables
 * EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
 */
export const signInWithGoogle = async (): Promise<AuthUser> => {
  try {
    // Get the web client ID from environment
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    
    if (!webClientId) {
      throw new Error(
        'Google Web Client ID not configured. Please add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file.'
      );
    }

    // Note: This is a placeholder implementation
    // The actual OAuth flow requires setting up Google.useAuthRequest hook in a component
    // For now, we'll throw an error indicating this needs to be implemented at the component level
    throw new Error(
      'Google Sign-In must be initiated from a React component using the useGoogleAuth hook. ' +
      'See the login screen implementation for usage.'
    );
  } catch (error: any) {
    console.error('Google Sign-In error:', error);
    throw error;
  }
};

/**
 * Complete Google Sign-In with ID token
 * Called after successful OAuth flow
 */
export const signInWithGoogleCredential = async (idToken: string): Promise<AuthUser> => {
  try {
    // Create Google credential
    const credential = GoogleAuthProvider.credential(idToken);
    
    // Sign in with Firebase
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    // Check if this is a new user
    const existingProfile = await userService.getUserProfile(user.uid);
    
    if (!existingProfile) {
      // Create user profile in Firestore for new users
      await userService.createUserProfile(user.uid, {
        email: user.email!,
        displayName: user.displayName || 'Google User',
        photoURL: user.photoURL || undefined,
      });
    }

    // Set user as online
    await userService.updateOnlineStatus(user.uid, true);

    // Return AuthUser
    return toAuthUser(user)!;
  } catch (error: any) {
    console.error('Google credential sign-in error:', error);
    throw error;
  }
};

// Export as default object for easier importing
export const authService = {
  registerWithEmail,
  loginWithEmail,
  signOut,
  onAuthStateChanged,
  getCurrentUser,
  signInWithGoogle,
  signInWithGoogleCredential,
};

