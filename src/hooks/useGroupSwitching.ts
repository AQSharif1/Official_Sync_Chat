import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface GroupSwitchData {
  canSwitch: boolean;
  remainingSwitches: number;
  switchLimit: number;
  loading: boolean;
}

export const useGroupSwitching = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [switchData, setSwitchData] = useState<GroupSwitchData>({
    canSwitch: false,
    remainingSwitches: 0,
    switchLimit: 1,
    loading: true
  });

  useEffect(() => {
    if (user) {
      fetchSwitchData();
    }
  }, [user]);

  const fetchSwitchData = async () => {
    if (!user) return;

    try {
      setSwitchData(prev => ({ ...prev, loading: true }));

      // Get remaining switches
      const { data: remainingData, error: remainingError } = await supabase
        .rpc('get_remaining_switches', { p_user_id: user.id });

      if (remainingError) throw remainingError;

      // Get switch limit
      const { data: limitData, error: limitError } = await supabase
        .rpc('get_user_switch_limit', { p_user_id: user.id });

      if (limitError) throw limitError;

      // Check if can switch
      const { data: canSwitchData, error: canSwitchError } = await supabase
        .rpc('can_user_switch_groups', { p_user_id: user.id });

      if (canSwitchError) throw canSwitchError;

      setSwitchData({
        canSwitch: canSwitchData,
        remainingSwitches: remainingData,
        switchLimit: limitData,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching switch data:', error);
      setSwitchData(prev => ({ ...prev, loading: false }));
    }
  };

  const findSimilarGroup = async (currentGroupId: string) => {
    if (!user) return null;

    try {
      // Get user's preferences
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('genres, personality')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Find available groups that match user preferences
      const { data: availableGroups, error: groupsError } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          vibe_label,
          current_members,
          max_members,
          group_personalities!inner(
            dominant_traits,
            favorite_activities
          )
        `)
        .eq('lifecycle_stage', 'active')
        .neq('id', currentGroupId)
        .lt('current_members', 'max_members');

      if (groupsError) throw groupsError;

      if (!availableGroups || availableGroups.length === 0) {
        // If no matching groups, find any available group
        const { data: anyGroup, error: anyGroupError } = await supabase
          .from('groups')
          .select('id, name, vibe_label')
          .eq('lifecycle_stage', 'active')
          .neq('id', currentGroupId)
          .lt('current_members', 'max_members')
          .limit(1);

        if (anyGroupError) throw anyGroupError;
        return anyGroup?.[0] || null;
      }

      // Score groups based on preference similarity
      const scoredGroups = availableGroups.map(group => {
        let score = 0;
        const groupPersonality = group.group_personalities as any;
        
        // Check genre/activity overlap
        if (profile.genres && groupPersonality?.favorite_activities) {
          const genreOverlap = profile.genres.filter((genre: string) =>
            groupPersonality.favorite_activities.includes(genre)
          ).length;
          score += genreOverlap * 2;
        }

        // Check personality trait overlap
        if (profile.personality && groupPersonality?.dominant_traits) {
          const personalityOverlap = profile.personality.filter((trait: string) =>
            groupPersonality.dominant_traits.includes(trait)
          ).length;
          score += personalityOverlap;
        }

        return { ...group, score };
      });

      // Sort by score and return the best match
      scoredGroups.sort((a, b) => b.score - a.score);
      return scoredGroups[0] || null;
    } catch (error) {
      console.error('Error finding similar group:', error);
      return null;
    }
  };

  const switchToGroup = async (newGroupId: string, currentGroupId: string) => {
    if (!user) return false;

    try {
      // First, use a group switch
      const { data: switchUsed, error: switchError } = await supabase
        .rpc('use_group_switch', { p_user_id: user.id });

      if (switchError) throw switchError;
      if (!switchUsed) {
        toast({
          title: "Switch Limit Reached",
          description: "You've used all your group switches for this month.",
          variant: "destructive",
        });
        return false;
      }

      // Remove user from current group
      const { error: removeError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', currentGroupId)
        .eq('user_id', user.id);

      if (removeError) throw removeError;

      // Add user to new group
      const { error: addError } = await supabase
        .from('group_members')
        .insert({
          group_id: newGroupId,
          user_id: user.id
        });

      if (addError) throw addError;

      // Update group member counts using simple approach
      // We'll let the database functions handle this if needed, or just skip for now
      // The real counts will be updated when groups are fetched

      // Refresh switch data
      await fetchSwitchData();

      toast({
        title: "Successfully Switched Groups!",
        description: "Welcome to your new group chat!",
      });

      return true;
    } catch (error) {
      console.error('Error switching groups:', error);
      toast({
        title: "Switch Failed",
        description: "Failed to switch groups. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const performGroupSwitch = async (currentGroupId: string) => {
    if (!switchData.canSwitch) {
      toast({
        title: "No Switches Available",
        description: "You've used all your group switches for this month.",
        variant: "destructive",
      });
      return { success: false, newGroupId: null };
    }

    const targetGroup = await findSimilarGroup(currentGroupId);
    
    if (!targetGroup) {
      toast({
        title: "No Available Groups",
        description: "No suitable groups are currently available. Please try again later.",
        variant: "destructive",
      });
      return { success: false, newGroupId: null };
    }

    const success = await switchToGroup(targetGroup.id, currentGroupId);
    return { success, newGroupId: success ? targetGroup.id : null, newGroupData: targetGroup };
  };

  return {
    ...switchData,
    performGroupSwitch,
    refreshSwitchData: fetchSwitchData
  };
};