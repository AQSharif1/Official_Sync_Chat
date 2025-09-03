import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authState: {
    isNewUser: boolean;
    hasCompletedProfile: boolean;
    shouldShowOnboarding: boolean;
    isLoading: boolean;
  };
  setAuthState: React.Dispatch<React.SetStateAction<{
    isNewUser: boolean;
    hasCompletedProfile: boolean;
    shouldShowOnboarding: boolean;
    isLoading: boolean;
  }>>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error?: any; success?: boolean }>;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<{ error: any }>;
  isEmailVerified: (user: User) => boolean;
  ensureAuthStability: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState({
    isNewUser: false,
    hasCompletedProfile: false,
    shouldShowOnboarding: false,
    isLoading: false,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Allow all authenticated users to proceed - don't block unverified users
        setUser(session.user);
        setSession(session);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setLoading(false);
        setAuthState({
          isNewUser: false,
          hasCompletedProfile: false,
          shouldShowOnboarding: false,
          isLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setLoading(false);
          return;
        }

        if (session) {
          // Allow all authenticated users to proceed - don't block unverified users
          setUser(session.user);
          setSession(session);
        }
        
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    checkInitialSession();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    // Don't auto-login - user must verify email first
    return { error };
  };

  // Simplified auth stability check - just verify session exists
  const ensureAuthStability = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return !error && !!session;
    } catch (error) {
      console.error('Auth stability check error:', error);
      return false;
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error?: any; success?: boolean }> => {
    console.log('🔍 DEBUG: useAuth.signIn called with:', { email, password: '***' });
    
    try {
      console.log('🔍 DEBUG: Calling supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('🔍 DEBUG: Supabase response:', { 
        data: data ? 'SUCCESS' : 'NO_DATA', 
        error: error ? error.message : 'NO_ERROR',
        user: data?.user ? 'USER_EXISTS' : 'NO_USER',
        session: data?.session ? 'SESSION_EXISTS' : 'NO_SESSION'
      });

      if (error) {
        console.log('🔍 DEBUG: Supabase error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          fullError: error
        });
        return { error: error.message };
      }

      console.log('🔍 DEBUG: Sign-in successful, returning success');
      // Allow all authenticated users to proceed - don't block unverified users
      // The UI will handle showing verification prompts if needed
      return { success: true };
    } catch (error) {
      console.log('🔍 DEBUG: Catch block in useAuth.signIn:', error);
      return { error: 'An unexpected error occurred.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear any local state/memory on logout
    window.dispatchEvent(new CustomEvent('auth:logout'));
  };

  const resendVerification = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
    // Check if user with this email is already confirmed using RPC function
    try {
      const { data: emailExists, error: checkError } = await supabase.rpc('email_exists', {
        check_email: email.toLowerCase().trim()
      });
      
      if (!checkError && emailExists === true) {
        // Email exists, now check if it's confirmed by trying to resend
        // If the user is already confirmed, Supabase will return an appropriate error
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email.toLowerCase().trim(),
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        
        // Check if the error indicates the user is already confirmed
        if (resendError && (
          resendError.message?.includes('already confirmed') ||
          resendError.message?.includes('already verified') ||
          resendError.message?.includes('email_confirmed_at')
        )) {
          return { 
            error: { 
              message: 'Your email is already verified. You can sign in normally.' 
            } 
          };
        }
        
        // If no specific "already confirmed" error, return the original error
        return { error: resendError };
      } else if (!checkError && emailExists === false) {
        // Email doesn't exist, proceed with normal resend
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.toLowerCase().trim(),
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        
        return { error };
      }
    } catch (error) {
      // If RPC function fails, fall back to direct resend
      console.log('RPC check failed, proceeding with direct resend');
    }
    
    // Fallback: direct resend without checking
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    return { error };
  };

  const isEmailVerified = (user: User): boolean => {
    return !!user.email_confirmed_at;
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    authState,
    setAuthState,
    signUp,
    signIn,
    signOut,
    resendVerification,
    isEmailVerified,
    ensureAuthStability,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};