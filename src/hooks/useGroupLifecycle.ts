import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface GroupLifecycleData {
  groupId: string;
  createdAt: Date;
  nextVoteDate: Date | null;
  isExtended: boolean;
  voteActive: boolean;
  lifecycleStage: string;
  voteDeadline: Date | null;
  userVote: string | null;
  voteResults: {
    yes: number;
    no: number;
    total: number;
    required: number;
  } | null;
  daysRemaining: number;
  hasExitWindow: boolean;
  exitWindowExpires: Date | null;
}

export const useGroupLifecycle = (groupId: string | null) => {
  const { user } = useAuth();
  const [lifecycleData, setLifecycleData] = useState<GroupLifecycleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && groupId) {
      fetchLifecycleData();
      
      // Set up real-time subscription for vote updates
      const channel = supabase
        .channel('group-lifecycle')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'groups',
          filter: `id=eq.${groupId}`
        }, () => {
          fetchLifecycleData();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'group_votes',
          filter: `group_id=eq.${groupId}`
        }, () => {
          fetchLifecycleData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, groupId]);

  const fetchLifecycleData = async () => {
    if (!user || !groupId) return;

    try {
      // Get group data
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // Get user's vote if voting is active
      let userVote = null;
      if (group.vote_active) {
        const { data: vote } = await supabase
          .from('group_votes')
          .select('vote_choice')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .single();
        
        userVote = vote?.vote_choice || null;
      }

      // Get vote results if voting
      let voteResults = null;
      if (group.vote_active || group.lifecycle_stage === 'voting_period') {
        const { data: votes } = await supabase
          .from('group_votes')
          .select('vote_choice')
          .eq('group_id', groupId);

        const yesVotes = votes?.filter(v => v.vote_choice === 'yes').length || 0;
        const noVotes = votes?.filter(v => v.vote_choice === 'no').length || 0;
        const totalVotes = votes?.length || 0;
        const required = Math.ceil(group.current_members * 0.51);

        voteResults = {
          yes: yesVotes,
          no: noVotes,
          total: totalVotes,
          required
        };
      }

      // Check for leave opportunity (new system)
      const { data: hasLeaveOpportunity, error: opportunityError } = await supabase
        .rpc('user_has_leave_opportunity', {
          p_user_id: user.id,
          p_group_id: groupId
        });

      if (opportunityError) {
        console.error('Error checking leave opportunity:', opportunityError);
      }

      // Get exit request details for display
      let hasExitWindow = false;
      let exitWindowExpires = null;
      const { data: exitRequest } = await supabase
        .from('user_exit_requests')
        .select('exit_window_expires, opportunity_type, exit_reason')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('is_processed', false)
        .single();

      if (exitRequest && hasLeaveOpportunity) {
        hasExitWindow = true;
        exitWindowExpires = new Date(exitRequest.exit_window_expires);
      }

      // Calculate days remaining
      const createdAt = new Date(group.created_at);
      const thirtyDaysFromCreation = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const daysRemaining = Math.max(0, Math.ceil((thirtyDaysFromCreation.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

      setLifecycleData({
        groupId,
        createdAt,
        nextVoteDate: group.next_vote_date ? new Date(group.next_vote_date) : null,
        isExtended: group.is_extended,
        voteActive: group.vote_active,
        lifecycleStage: group.lifecycle_stage,
        voteDeadline: group.vote_deadline ? new Date(group.vote_deadline) : null,
        userVote,
        voteResults,
        daysRemaining,
        hasExitWindow,
        exitWindowExpires
      });

    } catch (error) {
      console.error('Error fetching lifecycle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitVote = async (choice: 'yes' | 'no') => {
    if (!user || !groupId) return false;

    try {
      const { error } = await supabase
        .from('group_votes')
        .insert({
          group_id: groupId,
          user_id: user.id,
          vote_choice: choice
        });

      if (error) throw error;

      await fetchLifecycleData();
      return true;
    } catch (error) {
      console.error('Error submitting vote:', error);
      return false;
    }
  };

  const requestExit = async () => {
    if (!user || !groupId) return false;

    try {
      // Check if user has leave opportunity
      const { data: hasOpportunity, error: checkError } = await supabase
        .rpc('user_has_leave_opportunity', {
          p_user_id: user.id,
          p_group_id: groupId
        });

      if (checkError) {
        console.error('Error checking leave opportunity:', checkError);
        return false;
      }

      if (!hasOpportunity) {
        console.error('User does not have leave opportunity');
        return false;
      }

      // Use the leave opportunity
      const { data: opportunityUsed, error: useError } = await supabase
        .rpc('use_leave_opportunity', {
          p_user_id: user.id,
          p_group_id: groupId
        });

      if (useError || !opportunityUsed) {
        console.error('Error using leave opportunity:', useError);
        return false;
      }

      // Remove user from group
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      // Update group member count
      const { data: currentGroup } = await supabase
        .from('groups')
        .select('current_members')
        .eq('id', groupId)
        .single();

      if (currentGroup) {
        await supabase
          .from('groups')
          .update({ 
            current_members: Math.max(0, currentGroup.current_members - 1)
          })
          .eq('id', groupId);
      }

      // Mark exit request as processed
      await supabase
        .from('user_exit_requests')
        .update({ is_processed: true })
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      return true;
    } catch (error) {
      console.error('Error requesting exit:', error);
      return false;
    }
  };

  return {
    lifecycleData,
    loading,
    submitVote,
    requestExit,
    refresh: fetchLifecycleData
  };
};