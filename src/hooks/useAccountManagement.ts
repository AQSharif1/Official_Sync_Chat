import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface AccountManagementResult {
  success: boolean;
  error?: string;
  message?: string;
}

export const useAccountManagement = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Check if email is available for signup
  const checkEmailAvailability = useCallback(async (email: string): Promise<boolean> => {
    try {
      // Direct check against auth.users via profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', email.toLowerCase().trim())
        .single();

      if (error && error.code === 'PGRST116') {
        // No matching profile found - email is available
        return true;
      }

      if (error) {
        console.error('Error checking email availability:', error);
        // If we can't check, allow signup to proceed
        return true;
      }

      // If data exists, email is taken
      return false;
    } catch (error) {
      console.error('Error in checkEmailAvailability:', error);
      // If error, allow signup to proceed rather than block
      return true;
    }
  }, []);

  // Validate email before signup
  const validateEmailForSignup = useCallback(async (email: string): Promise<AccountManagementResult> => {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Please enter a valid email address.'
      };
    }

    // Let Supabase handle duplicate email checking during actual signup
    return { success: true };
  }, []);

  // Delete user account with all associated data
  const deleteAccount = useCallback(async (): Promise<AccountManagementResult> => {
    if (!user?.id) {
      return { success: false, error: 'No user logged in' };
    }

    setIsLoading(true);

    try {
      // Call the database function to delete account and cleanup data
      const { data, error } = await supabase.rpc('delete_user_account', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error deleting account:', error);
        toast({
          title: "Deletion Failed",
          description: `Failed to delete account: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }

      const result = data as any;
      if (!result?.success) {
        toast({
          title: "Deletion Failed", 
          description: result?.error || 'Failed to delete account',
          variant: "destructive"
        });
        return { success: false, error: result?.error || 'Failed to delete account' };
      }

      // Clear any local storage data (except theme and user preferences)
      localStorage.removeItem('clearedMessages');
      localStorage.removeItem('saved_username');
      localStorage.removeItem('incomplete_signup_time');
      localStorage.removeItem('onboarding_skipped');
      localStorage.removeItem('cleanup_warning_shown');
      // Note: Don't clear theme or app-settings as they're user-specific

      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
        variant: "default"
      });

      // Force sign out and redirect
      try {
        await supabase.auth.signOut();
        
        // Force page reload to clear all state
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } catch (signOutError) {
        console.error('Error signing out after deletion:', signOutError);
        // Force reload anyway
        window.location.href = '/';
      }

      return { 
        success: true, 
        message: 'Account successfully deleted' 
      };

    } catch (error: any) {
      console.error('Error in deleteAccount:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [user, signOut, toast]);

  // Enhanced signup with email validation
  const signUpWithEmailValidation = useCallback(async (
    email: string, 
    password: string
  ): Promise<AccountManagementResult> => {
    // First check if email is available
    const emailValidation = await validateEmailForSignup(email);
    if (!emailValidation.success) {
      return emailValidation;
    }

    setIsLoading(true);

    try {
      // Clear any cached auth state to ensure fresh signup
      await supabase.auth.signOut();
      
      console.log('📧 Starting fresh signup for:', email.toLowerCase().trim());
      
      // Ensure email confirmation is required - force new verification email
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: 'https://syncchatapp.com/auth/callback',
          data: {
            email_confirm: true, // Force email confirmation
            signup_timestamp: Date.now() // Ensure unique signup
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        
        // Enhanced handling for re-signup scenarios
        if (error.message?.includes('already registered') || 
            error.message?.includes('already exists') ||
            error.message?.includes('already in use')) {
          
          console.log('📧 RESIGNUP DETECTED: Email exists, checking status...');
          
          // First, try to check the signup status using our RPC function
          try {
            const { data: resignupCheck } = await supabase.rpc('handle_resignup_verification', {
              p_email: email.toLowerCase().trim()
            });
            
            if (resignupCheck?.action === 'resend_verification') {
              console.log('📧 Confirmed re-signup scenario, sending verification...');
            }
          } catch (rpcError) {
            console.log('📧 RPC check failed, proceeding with resend...');
          }
          
          // Try multiple resend approaches for maximum compatibility
          console.log('📧 Attempting verification email resend...');
          
          try {
            // Method 1: Standard resend
            const resendResult = await supabase.auth.resend({
              type: 'signup',
              email: email.toLowerCase().trim(),
              options: {
                emailRedirectTo: 'https://syncchatapp.com/auth/callback'
              }
            });
            
            if (!resendResult.error) {
              console.log('✅ Verification email sent via resend');
              return {
                success: true,
                message: 'Verification email sent! Please check your inbox and click the link to verify your account. (This may be a re-signup - check spam folder if needed)'
              };
            }
            
            // Method 2: If resend fails, try a fresh signup attempt after brief delay
            console.log('📧 Resend failed, attempting fresh signup...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: retryData, error: retryError } = await supabase.auth.signUp({
              email: email.toLowerCase().trim(),
              password,
              options: {
                emailRedirectTo: 'https://syncchatapp.com/auth/callback',
                data: {
                  retry_signup: true,
                  signup_timestamp: Date.now()
                }
              }
            });
            
            if (!retryError && retryData.user) {
              console.log('✅ Fresh signup successful');
              return {
                success: true,
                message: 'Account created! Please check your email for verification link.'
              };
            }
            
          } catch (resendError) {
            console.error('All resend methods failed:', resendError);
          }
          
          // Final fallback message
          return {
            success: true,
            message: 'If you previously deleted your account, please check your email for a new verification link. If you have an active account, please use the login page instead.'
          };
        }
        
        return { success: false, error: error.message };
      }

      // Always require email confirmation for new signups
      if (data.user) {
        console.log('📧 User created, email confirmation required:', {
          id: data.user.id,
          email: data.user.email,
          confirmed: !!data.user.email_confirmed_at,
          session: !!data.session
        });
        
        return {
          success: true,
          message: 'Please check your email to confirm your account before continuing. A verification link has been sent to your inbox.'
        };
      }

      return { success: true, message: 'Account created successfully' };

    } catch (error: any) {
      console.error('Error in signUpWithEmailValidation:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [validateEmailForSignup]);

  return {
    checkEmailAvailability,
    validateEmailForSignup,
    deleteAccount,
    signUpWithEmailValidation,
    isLoading
  };
};