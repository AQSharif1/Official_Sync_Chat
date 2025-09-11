import { useState, useEffect, useCallback } from 'react';
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

export const useAppData = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentGroup, setCurrentGroup] = useState<GroupData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!user?.id) return null;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setUserProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load profile');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchCurrentGroup = useCallback(async () => {
    if (!user?.id) return null;

    try {
      setIsLoading(true);
      setError(null);

      const { data: memberData, error: memberError } = await supabase
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

      if (memberError) throw memberError;

      const groupData = memberData?.groups as GroupData | null;
      setCurrentGroup(groupData);
      return groupData;
    } catch (error) {
      console.error('Error fetching current group:', error);
      setError('Failed to load group data');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user?.id || !userProfile) return false;

    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      setError('Failed to update profile');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, userProfile]);

  const clearData = useCallback(() => {
    setUserProfile(null);
    setCurrentGroup(null);
    setError(null);
  }, []);

  const refreshData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      await Promise.all([
        fetchUserProfile(),
        fetchCurrentGroup()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, fetchUserProfile, fetchCurrentGroup]);

  useEffect(() => {
    if (user?.id) {
      refreshData();
    } else {
      clearData();
    }
  }, [user?.id, refreshData, clearData]);

  useEffect(() => {
    const handleOnboardingComplete = () => {
      setTimeout(() => {
        refreshData();
      }, 2000);
    };

    window.addEventListener('onboarding:complete', handleOnboardingComplete);
    return () => window.removeEventListener('onboarding:complete', handleOnboardingComplete);
  }, [refreshData]);

  return {
    userProfile,
    currentGroup,
    isLoading,
    error,
    fetchUserProfile,
    fetchCurrentGroup,
    updateUserProfile,
    setCurrentGroup,
    clearData,
    refreshData,
  };
};