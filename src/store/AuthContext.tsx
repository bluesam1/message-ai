/**
 * Authentication Context Provider
 * 
 * Manages global auth state and provides auth methods to the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/firebase/authService';
import { AuthContextType, AuthUser } from '../types/auth';

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
    try {
      setError(null);
      if (user) {
        await authService.signOut(user.uid);
      }
      // User state will be updated by onAuthStateChanged listener
    } catch (err: any) {
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

