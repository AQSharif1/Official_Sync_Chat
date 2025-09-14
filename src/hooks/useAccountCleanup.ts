import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CleanupWarning {
  daysLeft: number;
  willBeDeleted: boolean;
  isAtRisk: boolean;
}

export const useAccountCleanup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cleanupWarning, setCleanupWarning] = useState<CleanupWarning | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkAccountStatus = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Check if user has completed profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, created_at')
        .eq('user_id', user.id)
        .single();

      const incompleteSignupTime = localStorage.getItem('incomplete_signup_time');
      const accountCreatedAt = user.created_at || incompleteSignupTime || new Date().toISOString();
      
      // Calculate days since account creation
      const daysSinceCreation = Math.floor(
        (new Date().getTime() - new Date(accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      const isProfileIncomplete = !profile || !profile.username || profile.username.trim() === '';
      const daysLeft = Math.max(0, 3 - daysSinceCreation);
      const willBeDeleted = isProfileIncomplete && daysSinceCreation >= 3;
      const isAtRisk = isProfileIncomplete && daysSinceCreation >= 2; // Warn when 1 day left

      setCleanupWarning({
        daysLeft,
        willBeDeleted,
        isAtRisk
      });

      // Show warnings
      if (willBeDeleted && isProfileIncomplete) {
        toast({
          title: "Account will be deleted!",
          description: "Your account is scheduled for deletion due to incomplete setup. Complete your profile now to keep your account.",
          variant: "destructive",
        });
      } else if (isAtRisk && isProfileIncomplete) {
        toast({
          title: `Account deletion warning`,
          description: `You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to complete your profile setup before your account is automatically deleted.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error checking account status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extendAccountByCompleting = async (profileData: {
    username: string;
    genres: string[];
    personality: string[];
    habits: string[];
  }) => {
    if (!user?.id) return { success: false, error: 'No user found' };

    try {
      const { data, error } = await supabase.rpc('extend_account_by_completing_onboarding', {
        p_user_id: user.id,
        p_username: profileData.username,
        p_genres: profileData.genres,
        p_personality: profileData.personality,
        p_bio: profileData.habits.join(', ') // Convert habits array to bio string
      });

      if (error) throw error;

      if (data?.success) {
        // Clear local storage markers
        localStorage.removeItem('incomplete_signup_time');
        localStorage.removeItem('onboarding_skipped');
        
        // Refresh account status
        await checkAccountStatus();
        
        toast({
          title: "Account secured!",
          description: "Your account is now complete and will not be automatically deleted.",
        });
        
        return { success: true };
      } else {
        return { success: false, error: data?.error || 'Failed to extend account' };
      }
    } catch (error: any) {
      console.error('Error extending account:', error);
      return { success: false, error: error.message };
    }
  };

  const dismissWarning = () => {
    // Store that user was warned (don't spam them)
    localStorage.setItem('cleanup_warning_shown', new Date().toISOString());
    setCleanupWarning(null);
  };

  // Check status on mount and when user changes
  useEffect(() => {
    if (user) {
      // Don't show warning too frequently
      const lastWarning = localStorage.getItem('cleanup_warning_shown');
      const hoursSinceLastWarning = lastWarning 
        ? (new Date().getTime() - new Date(lastWarning).getTime()) / (1000 * 60 * 60)
        : 25; // Default to show if never shown

      if (hoursSinceLastWarning >= 24) { // Show at most once per day
        checkAccountStatus();
      }
    }
  }, [user?.id]);

  return {
    cleanupWarning,
    isLoading,
    checkAccountStatus,
    extendAccountByCompleting,
    dismissWarning
  };
};