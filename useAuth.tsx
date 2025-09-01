import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check email verification - block unconfirmed users
        if (!session.user.email_confirmed_at) {
          await supabase.auth.signOut();
          return;
        }
        
        setUser(session.user);
        setSession(session);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setLoading(false);
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
          // Check email verification - block unconfirmed users
          if (!session.user.email_confirmed_at) {
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          
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
    const redirectUrl = 'https://syncchatapp.com/auth/callback';
    
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

  // Add auth stability check function
  const ensureAuthStability = async (): Promise<boolean> => {
    try {
      // Check if we have a valid session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Auth stability check failed:', error);
        return false;
      }
      
      if (!session) {
        console.warn('No active session found');
        return false;
      }
      
      // Check if user has email confirmed
      if (!session.user.email_confirmed_at) {
        console.warn('User email not confirmed');
        return false;
      }
      
      // Verify the session is still valid by making a simple API call
      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError || !profile) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Auth stability check error:', error);
      return false;
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error?: any; success?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      // Check email verification - block unconfirmed users
      if (!data.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        return { success: false, error: 'Please verify your email before signing in.' };
      }

      // Check auth stability after sign in
      const isStable = await ensureAuthStability();
      if (!isStable) {
        await supabase.auth.signOut();
        return { success: false, error: 'Authentication failed. Please try again.' };
      }

      return { success: true };
    } catch (error) {
      return { error: 'An unexpected error occurred.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear any local state/memory on logout
    window.dispatchEvent(new CustomEvent('auth:logout'));
  };

  const resendVerification = async (email: string) => {
    const redirectUrl = 'https://syncchatapp.com/auth/callback';
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
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