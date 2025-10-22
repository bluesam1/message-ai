/**
 * Authentication Context Provider
 * 
 * Manages global auth state and provides auth methods to the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/firebase/authService';
import { AuthContextType, AuthUser } from '../types/auth';
import { rtdbPresenceService } from '../services/user/rtdbPresenceService';

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

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  // Initialize RTDB presence when user is authenticated
  useEffect(() => {
    if (user?.uid) {
      console.log('[AuthContext] Initializing RTDB presence for user:', user.uid);
      rtdbPresenceService.initialize(user.uid);
    }
  }, [user?.uid]);

  // Auth methods
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);
      await authService.loginWithEmail(email, password);
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
      await authService.registerWithEmail(email, password, displayName);
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
        
        // 1. FIRST: Stop listening to connection changes
        //    This prevents the connection listener from overwriting our offline status
        console.log('[AuthContext] Step 1: Cleaning up listeners');
        rtdbPresenceService.cleanup();
        
        // 2. SECOND: Explicitly set user offline in RTDB (triggers Cloud Function)
        //    Now safe to write offline - no listener will overwrite it
        console.log('[AuthContext] Step 2: Setting user offline in RTDB');
        await rtdbPresenceService.setOffline(user.uid);
        console.log('[AuthContext] Step 2 complete: User offline status written');
        
        // 3. THIRD: Sign out from Firebase Auth
        console.log('[AuthContext] Step 3: Signing out from Firebase Auth');
        await authService.signOut(user.uid);
        console.log('[AuthContext] Logout sequence complete');
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

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

