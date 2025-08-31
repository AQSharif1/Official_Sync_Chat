import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthFlowState {
  isNewUser: boolean;
  hasCompletedProfile: boolean;
  shouldShowOnboarding: boolean;
  isLoading: boolean;
}

export const useAuthFlow = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [authState, setAuthState] = useState<AuthFlowState>({
    isNewUser: false,
    hasCompletedProfile: false,
    shouldShowOnboarding: false,
    isLoading: true
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setAuthState({
        isNewUser: false,
        hasCompletedProfile: false,
        shouldShowOnboarding: false,
        isLoading: false
      });
      return;
    }

    checkUserStatus();
  }, [user, authLoading]);

  const checkUserStatus = async () => {
    if (!user?.id) return;

    try {
      // CRITICAL: Check email confirmation FIRST - block everything until confirmed
      if (!user.email_confirmed_at) {
        console.log('User email not confirmed, showing email verification required state');
        setAuthState({
          isNewUser: false,
          hasCompletedProfile: false,
          shouldShowOnboarding: false,
          isLoading: false
        });
        return;
      }

      console.log('User email confirmed at:', user.email_confirmed_at);

      // Check if user has a profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking profile:', error);
        return;
      }

      const hasProfile = profile && profile.username && (
        profile.genres?.length > 0 || 
        profile.personality?.length > 0 || 
        profile.habits?.length > 0
      );
      
      // Check if this is a new signup (user created very recently)
      const userCreatedAt = new Date(user.created_at);
      const now = new Date();
      const timeDiff = now.getTime() - userCreatedAt.getTime();
      const isRecentSignup = timeDiff < 60000; // Less than 1 minute ago

      if (hasProfile) {
        // Existing user with complete profile - go straight to home
        setAuthState({
          isNewUser: false,
          hasCompletedProfile: true,
          shouldShowOnboarding: false,
          isLoading: false
        });
      } else if (isRecentSignup) {
        // New user - needs onboarding (but email MUST be confirmed)
        setAuthState({
          isNewUser: true,
          hasCompletedProfile: false,
          shouldShowOnboarding: true,
          isLoading: false
        });
      } else {
        // Existing user without profile (edge case) - treat as new user
        setAuthState({
          isNewUser: false,
          hasCompletedProfile: false,
          shouldShowOnboarding: true,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error in checkUserStatus:', error);
      setAuthState({
        isNewUser: false,
        hasCompletedProfile: false,
        shouldShowOnboarding: false,
        isLoading: false
      });
    }
  };

  const handleAuthError = (message: string) => {
    toast({
      title: "Authentication Error",
      description: message,
      variant: "destructive"
    });
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      // Try to sign in with a dummy password to check if email exists
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy-password-to-check-email'
      });
      
      // If error is about invalid password, email exists
      // If error is about user not found, email doesn't exist
      return error?.message?.includes('Invalid') && !error.message.includes('user not found');
    } catch {
      return false;
    }
  };

  return {
    authState,
    checkEmailExists,
    handleAuthError,
    refreshUserStatus: checkUserStatus
  };
};
