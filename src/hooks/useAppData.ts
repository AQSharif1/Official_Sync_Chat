import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  personality: string[];
  genres: string[];
  habits: string[];
  mood: number;
  daily_mood?: number;
  show_mood_emoji?: boolean;
  mood_emoji?: string;
  created_at: string;
  updated_at: string;
}

interface GroupData {
  id: string;
  name: string;
  vibe_label: string;
  current_members: number;
  max_members: number;
  lifecycle_stage: string;
  created_at: string;
}

interface AppData {
  userProfile: UserProfile | null;
  currentGroup: GroupData | null;
  isLoading: boolean;
  error: string | null;
  hasTimedOut: boolean;
}

const INITIAL_STATE: AppData = {
  userProfile: null,
  currentGroup: null,
  isLoading: false,
  error: null,
  hasTimedOut: false,
};

// Timeout wrapper to prevent infinite loading
const fetchWithTimeout = async <T>(
  promise: Promise<T>, 
  timeout: number = 10000
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeout)
  );
  return Promise.race([promise, timeoutPromise]);
};

/**
 * Centralized app data management hook with timeout protection
 * Prevents infinite loading states when database queries fail
 */
export const useAppData = () => {
  const { user } = useAuth();
  const [appData, setAppData] = useState<AppData>(INITIAL_STATE);
  const refreshDataRef = useRef<() => Promise<void>>();

  // Update loading state
  const setLoading = useCallback((loading: boolean) => {
    setAppData(prev => ({ ...prev, isLoading: loading }));
  }, []);

  // Update error state
  const setError = useCallback((error: string | null) => {
    setAppData(prev => ({ ...prev, error, hasTimedOut: false }));
  }, []);

  // Update timeout state
  const setTimeoutState = useCallback((hasTimedOut: boolean) => {
    setAppData(prev => ({ ...prev, hasTimedOut }));
  }, []);

  // Fetch user profile with timeout protection
  const fetchUserProfile = useCallback(async () => {
    if (!user?.id) return null;

    try {
      setLoading(true);
      setError(null);
      setTimeoutState(false);

      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data, error } = await fetchWithTimeout(profilePromise, 10000);

      if (error) throw error;

      setAppData(prev => ({ ...prev, userProfile: data }));
      return data;
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      
      if (error.message === 'Request timeout') {
        setError('Profile loading timed out. Please refresh the page.');
        setTimeoutState(true);
      } else {
        setError('Failed to load profile. Please try again.');
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, setLoading, setError, setTimeoutState]);

  // Fetch current group with timeout protection
  const fetchCurrentGroup = useCallback(async () => {
    if (!user?.id) return null;

    try {
      setLoading(true);
      setError(null);
      setTimeoutState(false);

      const groupPromise = supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            id,
            name,
            vibe_label,
            current_members,
            max_members,
            lifecycle_stage,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: memberData, error: memberError } = await fetchWithTimeout(groupPromise, 10000);

      if (memberError) throw memberError;

      const groupData = memberData?.groups as GroupData | null;
      setAppData(prev => ({ ...prev, currentGroup: groupData }));
      return groupData;
    } catch (error: any) {
      console.error('Error fetching current group:', error);
      
      if (error.message === 'Request timeout') {
        setError('Group data loading timed out. Please refresh the page.');
        setTimeoutState(true);
      } else {
        setError('Failed to load group data. Please try again.');
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, setLoading, setError, setTimeoutState]);

  // Update user profile
  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user?.id || !appData.userProfile) return false;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setAppData(prev => ({
        ...prev,
        userProfile: prev.userProfile ? { ...prev.userProfile, ...updates } : null
      }));

      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      setError('Failed to update profile');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, appData.userProfile, setLoading, setError]);

  // Set current group (for when user joins/switches groups)
  const setCurrentGroup = useCallback((group: GroupData | null) => {
    setAppData(prev => ({ ...prev, currentGroup: group }));
  }, []);

  // Clear all data (for logout)
  const clearData = useCallback(() => {
    setAppData(INITIAL_STATE);
  }, []);

  // Refresh all data with retry logic
  const refreshData = useCallback(async (retryCount = 0) => {
    if (!user?.id) return;

    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      setLoading(true);
      setError(null);
      setTimeoutState(false);

      await Promise.all([
        fetchUserProfile(),
        fetchCurrentGroup()
      ]);
    } catch (error) {
      console.error(`Data refresh attempt ${retryCount + 1} failed:`, error);
      
      if (retryCount < maxRetries) {
        // Exponential backoff retry
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        
        setTimeout(() => {
          refreshData(retryCount + 1);
        }, delay);
      } else {
        // Final failure - show error to user
        setError('Failed to load data after multiple attempts. Please refresh the page.');
        setTimeoutState(true);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchUserProfile, fetchCurrentGroup, setLoading, setError, setTimeoutState]);

  // Manual retry function for user-initiated retries
  const retryDataLoad = useCallback(() => {
    if (user?.id) {
      refreshData(0);
    }
  }, [user?.id, refreshData]);

  // Auto-fetch data when user changes
  useEffect(() => {
    if (user?.id) {
      // Store the current refreshData function in ref to prevent infinite loops
      refreshDataRef.current = refreshData;
      refreshData();
    } else {
      clearData();
    }
  }, [user?.id, clearData]); // Remove refreshData from dependencies

  // Listen for onboarding completion events
  useEffect(() => {
    const handleOnboardingComplete = () => {
      console.log('🔄 Onboarding completed, refreshing app data...');
      setTimeout(() => {
        // Use the ref to call the current refreshData function
        if (refreshDataRef.current) {
          refreshDataRef.current();
        }
      }, 2000); // Give database time to be consistent
    };

    window.addEventListener('onboarding:complete', handleOnboardingComplete);
    return () => window.removeEventListener('onboarding:complete', handleOnboardingComplete);
  }, []); // Remove refreshData from dependencies

  return {
    // Data
    userProfile: appData.userProfile,
    currentGroup: appData.currentGroup,
    isLoading: appData.isLoading,
    error: appData.error,
    hasTimedOut: appData.hasTimedOut,

    // Actions
    fetchUserProfile,
    fetchCurrentGroup,
    updateUserProfile,
    setCurrentGroup,
    clearData,
    refreshData,
    retryDataLoad,
  };
};