/**
 * Authentication Context Provider
 * 
 * Manages global auth state and provides auth methods to the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/firebase/authService';
import { AuthContextType, AuthUser } from '../types/auth';
import { rtdbPresenceService } from '../services/user/rtdbPresenceService';
import { notificationService } from '../services/notifications/notificationService';
import { authPersistenceService } from '../services/auth/authPersistenceService';

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * 
 * Wraps the app and provides auth state and methods
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication state with persistence
  useEffect(() => {
    console.log('[AuthContext] Initializing authentication state');
    
    const initializeAuth = async () => {
      try {
        // First, check if Firebase Auth has a current user
        const currentUser = authService.getCurrentUser();
        
        if (currentUser) {
          console.log('[AuthContext] Firebase Auth has current user:', currentUser.uid);
          setUser(currentUser);
          setLoading(false);
          // Store the user data for persistence
          await authPersistenceService.storeAuthData(currentUser);
        } else {
          // Firebase doesn't have a user, check AsyncStorage
          console.log('[AuthContext] No Firebase user, checking stored auth data');
          const storedUser = await authPersistenceService.validateStoredAuth();
          
          if (storedUser) {
            console.log('[AuthContext] Found valid stored user:', storedUser.uid);
            setUser(storedUser);
          } else {
            console.log('[AuthContext] No valid stored user found');
            setUser(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
        setUser(null);
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    // Set up Firebase auth state listener
    const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
      console.log('[AuthContext] Firebase auth state changed:', authUser ? `User ${authUser.uid}` : 'No user');
      
      // Check if this is a different user than currently logged in
      const currentUserId = user?.uid;
      const newUserId = authUser?.uid;
      const isDifferentUser = currentUserId && newUserId && currentUserId !== newUserId;
      
      if (isDifferentUser) {
        console.log('[AuthContext] Different user detected');
        // Firestore offline persistence handles cache automatically per user
      }
      
      if (authUser) {
        // User is authenticated, store in AsyncStorage
        await authPersistenceService.storeAuthData(authUser);
      } else {
        // User is not authenticated, clear stored data
        await authPersistenceService.clearAuthData();
        
        if (currentUserId) {
          console.log('[AuthContext] User logged out');
          // Firestore offline persistence handles cache automatically
        }
      }
      
      setUser(authUser);
      setLoading(false);
    });

    // Cleanup subscription
    return () => {
      console.log('[AuthContext] Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  // Initialize RTDB presence and notifications when user is authenticated
  useEffect(() => {
    console.log('[AuthContext] useEffect triggered, user?.uid:', user?.uid);
    if (user?.uid) {
      console.log('[AuthContext] Initializing RTDB presence for user:', user.uid);
      rtdbPresenceService.initialize(user.uid);
      
      console.log('[AuthContext] ⚠️ STARTING NOTIFICATION INITIALIZATION for user:', user.uid);
      notificationService.initialize().then(async () => {
        console.log('[AuthContext] ✅ Notification service initialized successfully');
        const token = await notificationService.getToken();
        console.log('[AuthContext] Token retrieved:', token ? 'SUCCESS' : 'FAILED');
        if (token) {
          console.log('[AuthContext] Saving token to Firestore...');
          await notificationService.saveExpoPushToken(token, user.uid);
          console.log('[AuthContext] ✅ Token saved to Firestore');
        } else {
          console.warn('[AuthContext] ⚠️ No token retrieved, cannot save to Firestore');
        }
      }).catch((error) => {
        console.error('[AuthContext] ❌ Failed to initialize notifications:', error);
      });
    }
  }, [user?.uid]);

  // Auth methods
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      const user = await authService.loginWithEmail(email, password);
      // Store authentication data for persistence
      await authPersistenceService.storeAuthData(user);
      // User state will be updated by onAuthStateChanged listener
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      const user = await authService.registerWithEmail(email, password, displayName);
      // Store authentication data for persistence
      await authPersistenceService.storeAuthData(user);
      // User state will be updated by onAuthStateChanged listener
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    // Note: Google Sign-In is handled via useGoogleAuth hook in components
    // This method is here for API consistency but shouldn't be called directly
    // Use the useGoogleAuth hook in your login screen instead
    try {
      setError(null);
      await authService.signInWithGoogle();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const signOut = async (): Promise<void> => {
    console.log('[AuthContext] signOut called, user:', user?.uid);
    try {
      setError(null);
      if (user) {
        console.log('[AuthContext] Starting logout sequence for user:', user.uid);
        
        // CRITICAL: Order matters to prevent race condition!
        
        // 1. FIRST: Remove Expo push token before signing out
        console.log('[AuthContext] Step 1: Removing Expo push token');
        try {
          const token = await notificationService.getToken();
          if (token) {
            await notificationService.removeExpoPushToken(token, user.uid);
          }
        } catch (error) {
          console.error('[AuthContext] Failed to remove Expo push token during sign out:', error);
          // Don't block sign out if token removal fails
        }
        
        // 2. SECOND: Stop listening to connection changes
        //    This prevents the connection listener from overwriting our offline status
        console.log('[AuthContext] Step 2: Cleaning up listeners');
        rtdbPresenceService.cleanup();
        
        // 3. THIRD: Explicitly set user offline in RTDB (triggers Cloud Function)
        //    Now safe to write offline - no listener will overwrite it
        console.log('[AuthContext] Step 3: Setting user offline in RTDB');
        await rtdbPresenceService.setOffline(user.uid);
        console.log('[AuthContext] Step 3 complete: User offline status written');
        
        // 4. FOURTH: Clear stored authentication data
        console.log('[AuthContext] Step 4: Clearing stored auth data');
        await authPersistenceService.clearAuthData();
        
        // 5. FIFTH: Sign out from Firebase Auth
        console.log('[AuthContext] Step 5: Signing out from Firebase Auth');
        await authService.signOut(user.uid);
        console.log('[AuthContext] Logout sequence complete');
        // Firestore offline persistence handles cache automatically
      } else {
        console.log('[AuthContext] No user to sign out');
      }
      // User state will be updated by onAuthStateChanged listener
    } catch (err: any) {
      console.error('[AuthContext] Error during signOut:', err);
      setError(err.message);
      throw err;
    }
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      console.log('[AuthContext] Refreshing authentication state');
      
      // Try to refresh from Firebase first
      const currentUser = authService.getCurrentUser();
      
      if (currentUser) {
        console.log('[AuthContext] Firebase user found on refresh:', currentUser.uid);
        setUser(currentUser);
        // Update stored data
        await authPersistenceService.storeAuthData(currentUser);
      } else {
        // No Firebase user, try to refresh from stored data
        console.log('[AuthContext] No Firebase user, checking stored data');
        const refreshedUser = await authPersistenceService.refreshStoredAuth();
        
        if (refreshedUser) {
          console.log('[AuthContext] Stored user refreshed:', refreshedUser.uid);
          setUser(refreshedUser);
        } else {
          console.log('[AuthContext] No valid stored user found');
          setUser(null);
        }
      }
    } catch (err: any) {
      console.error('[AuthContext] Error refreshing auth:', err);
      setError(err.message);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshAuth,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

