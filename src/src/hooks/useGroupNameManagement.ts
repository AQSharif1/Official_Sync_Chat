import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface GroupNameProposal {
  id: string;
  group_id: string;
  proposed_name: string;
  proposer_id: string;
  created_at: string;
  vote_deadline: string;
  is_active: boolean;
}

interface GroupNameVote {
  id: string;
  group_id: string;
  proposed_name: string;
  user_id: string;
  vote_choice: 'yes' | 'no';
  voted_at: string;
}

interface VoteResult {
  total_members: number;
  yes_votes: number;
  no_votes: number;
  majority_needed: number;
  vote_passed: boolean;
  all_voted: boolean;
}

export const useGroupNameManagement = (groupId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentProposal, setCurrentProposal] = useState<GroupNameProposal | null>(null);
  const [userVote, setUserVote] = useState<GroupNameVote | null>(null);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [groupNameChanged, setGroupNameChanged] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch current proposal and vote status
  useEffect(() => {
    if (!groupId || !user) return;

    const fetchProposalData = async () => {
      try {
        // Get current active proposal
        const { data: proposal } = await supabase
          .from('group_name_proposals')
          .select('*')
          .eq('group_id', groupId)
          .eq('is_active', true)
          .single();

        setCurrentProposal(proposal);

        if (proposal) {
          // Get user's vote if exists
          const { data: vote } = await supabase
            .from('group_name_votes')
            .select('*')
            .eq('group_id', groupId)
            .eq('proposed_name', proposal.proposed_name)
            .eq('user_id', user.id)
            .single();

          setUserVote(vote as GroupNameVote);

          // Get vote results
          const { data: result } = await supabase
            .rpc('check_group_name_vote_result', {
              p_group_id: groupId,
              p_proposed_name: proposal.proposed_name
            });

          setVoteResult(result as unknown as VoteResult);
        }

        // Get group name changed status
        const { data: group } = await supabase
          .from('groups')
          .select('group_name_changed')
          .eq('id', groupId)
          .single();

        setGroupNameChanged(group?.group_name_changed || false);
      } catch (error) {
        console.error('Error fetching proposal data:', error);
      }
    };

    fetchProposalData();

    // Set up real-time subscription for proposals
    const proposalChannel = supabase
      .channel(`group_name_proposals:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_name_proposals',
          filter: `group_id=eq.${groupId}`
        },
        () => fetchProposalData()
      )
      .subscribe();

    // Set up real-time subscription for votes
    const voteChannel = supabase
      .channel(`group_name_votes:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_name_votes',
          filter: `group_id=eq.${groupId}`
        },
        () => fetchProposalData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(proposalChannel);
      supabase.removeChannel(voteChannel);
    };
  }, [groupId, user]);

  const generateUniqueGroupName = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('generate_unique_group_name');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating unique group name:', error);
      return null;
    }
  };

  const proposeNameChange = async (proposedName: string) => {
    if (!groupId || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('group_name_proposals')
        .insert({
          group_id: groupId,
          proposed_name: proposedName,
          proposer_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Name Change Proposed",
        description: `Proposed new group name: "${proposedName}". All members can now vote!`,
      });
    } catch (error) {
      console.error('Error proposing name change:', error);
      toast({
        title: "Error",
        description: "Failed to propose name change. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitVote = async (choice: 'yes' | 'no') => {
    if (!groupId || !user || !currentProposal) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('group_name_votes')
        .insert({
          group_id: groupId,
          proposed_name: currentProposal.proposed_name,
          proposer_id: currentProposal.proposer_id,
          user_id: user.id,
          vote_choice: choice,
          vote_deadline: currentProposal.vote_deadline
        });

      if (error) throw error;

      toast({
        title: "Vote Submitted",
        description: `You voted ${choice.toUpperCase()} on the name change.`,
      });

      // Check if vote passes immediately after submission
      setTimeout(async () => {
        const { data: result } = await supabase
          .rpc('check_group_name_vote_result', {
            p_group_id: groupId,
            p_proposed_name: currentProposal.proposed_name
          });

        if ((result as any)?.vote_passed) {
          await executeNameChange(currentProposal.proposed_name);
        }
      }, 1000);
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast({
        title: "Error",
        description: "Failed to submit vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const executeNameChange = async (newName: string) => {
    if (!groupId) return;

    try {
      // Update group name and mark as changed
      const { error: groupError } = await supabase
        .from('groups')
        .update({
          name: newName,
          group_name_changed: true
        })
        .eq('id', groupId);

      if (groupError) throw groupError;

      // Deactivate the proposal
      const { error: proposalError } = await supabase
        .from('group_name_proposals')
        .update({ is_active: false })
        .eq('group_id', groupId);

      if (proposalError) throw proposalError;

      toast({
        title: "Group Name Changed!",
        description: `Your group is now called "${newName}"`,
      });
    } catch (error) {
      console.error('Error executing name change:', error);
    }
  };

  const canProposeNameChange = !groupNameChanged && !currentProposal;
  const hasVoted = !!userVote;
  const isVoteActive = currentProposal && new Date(currentProposal.vote_deadline) > new Date();

  return {
    generateUniqueGroupName,
    proposeNameChange,
    submitVote,
    currentProposal,
    userVote,
    voteResult,
    groupNameChanged,
    canProposeNameChange,
    hasVoted,
    isVoteActive,
    loading
  };
};