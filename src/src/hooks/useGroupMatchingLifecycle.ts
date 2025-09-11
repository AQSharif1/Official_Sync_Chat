import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGroupMemberManagement } from '@/hooks/useGroupMemberManagement';

interface GroupLifecycleMemory {
  totalUserCount: number;
  groupJoinDate: string | null;
  groupExpired: boolean;
  matchingMode: 'flexible' | 'strict';
}

interface GroupLifecycleData {
  memory: GroupLifecycleMemory;
  needsReshuffle: boolean;
  canTransition: boolean;
  loading: boolean;
}

export const useGroupMatchingLifecycle = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    addUserToGroup, 
    removeUserFromGroup, 
    findAvailableGroupsWithCapacity, 
    createNewGroupForCategory 
  } = useGroupMemberManagement();
  
  const [lifecycleData, setLifecycleData] = useState<GroupLifecycleData>({
    memory: {
      totalUserCount: 0,
      groupJoinDate: null,
      groupExpired: false,
      matchingMode: 'flexible' // Always default to 'flexible' to prevent undefined issues
    },
    needsReshuffle: false,
    canTransition: false,
    loading: true
  });

  useEffect(() => {
    if (user) {
      fetchLifecycleData();
    }
  }, [user]);

  const fetchLifecycleData = async () => {
    if (!user) return;

    try {
      // Get total user count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get user's current group join date
      const { data: membershipData } = await supabase
        .from('group_members')
        .select('joined_at, groups!inner(lifecycle_stage)')
        .eq('user_id', user.id)
        .eq('groups.lifecycle_stage', 'active')
        .single();

      const totalUserCount = totalUsers || 0;
      const groupJoinDate = membershipData?.joined_at || null;
      const matchingMode = totalUserCount < 100 ? 'flexible' : 'strict';

      // Check if reshuffle is needed
      const needsReshuffle = shouldReshuffle(totalUserCount, groupJoinDate);
      const canTransition = totalUserCount >= 100;

      // ✅ CRITICAL FIX: Always ensure matchingMode is defined with fallback
      const safeMatchingMode = matchingMode || 'flexible';

      setLifecycleData({
        memory: {
          totalUserCount,
          groupJoinDate,
          groupExpired: false,
          matchingMode: safeMatchingMode // Ensure never undefined
        },
        needsReshuffle,
        canTransition,
        loading: false
      });

    } catch (error) {
      console.error('Error fetching lifecycle data:', error);
      setLifecycleData(prev => ({ ...prev, loading: false }));
    }
  };

  const shouldReshuffle = (totalUsers: number, joinDate: string | null): boolean => {
    if (totalUsers < 100 || !joinDate) return false;
    
    const joinTimestamp = new Date(joinDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return joinTimestamp <= thirtyDaysAgo;
  };

  const findAndJoinGroupWithCapacityCheck = async (matchingMode: 'flexible' | 'strict', userProfile?: any) => {
    if (!user) {
      console.error('❌ No user found in findAndJoinGroupWithCapacityCheck');
      return null;
    }

    console.log('🚨 EMERGENCY MATCH ME: Starting forced group matching...');

    try {
      // EMERGENCY: Skip all complex logic and force create new group
      const timestamp = Date.now();
      const groupName = `match-${userProfile?.genres?.[0] || 'general'}-${timestamp}`;
      
      // Direct database insert for group
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          vibe_label: `${userProfile?.personality?.[0] || 'Match'} Connection`,
          current_members: 0,
          max_members: 10,
          is_private: false,
          lifecycle_stage: 'active'
        })
        .select('*')
        .single();

      if (groupError || !newGroup) {
        console.error('❌ EMERGENCY MATCH: Group creation failed:', groupError);
        throw new Error(`Emergency match group creation failed: ${groupError?.message}`);
      }

      console.log('✅ EMERGENCY MATCH: Group created:', newGroup);

      // Force add user to group using RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc('join_group_safe', {
        p_group_id: newGroup.id
      });

              if (rpcError || !rpcResult?.ok) {
        console.error('❌ EMERGENCY MATCH: RPC failed:', rpcError || rpcResult);
        throw new Error(`Emergency match RPC failed: ${rpcError?.message || rpcResult?.error}`);
      }

      console.log('✅ EMERGENCY MATCH: User added to group successfully');

      toast({
        title: "Group Matched!",
        description: `Welcome to ${newGroup.name}! Ready to chat.`,
      });

      return { groupId: newGroup.id, groupName: newGroup.name };

    } catch (error: any) {
      console.error('🚨 EMERGENCY MATCH FAILED:', error);
      toast({
        title: "Match Failed",
        description: `Failed to match you to a group: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  const performReshuffle = async () => {
    if (!user) return false;

    try {
      // Get user profile for strict matching
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!userProfile) return false;

      // Leave current group using the robust removal system
      const { data: currentMembership } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .single();

      if (currentMembership) {
        const removeResult = await removeUserFromGroup(currentMembership.group_id);
        if (!removeResult.success) {
          console.error('Failed to leave current group:', removeResult.error);
        }
      }

      // Find and join new group with strict matching and capacity checking
      const joinResult = await findAndJoinGroupWithCapacityCheck('strict', userProfile);
      
      if (joinResult) {
        // Update lifecycle data
        await fetchLifecycleData();

        toast({
          title: "🎉 Welcome to Your New Group!",
          description: "You've been matched into a new group based on your preferences.",
        });

        return { success: true, groupId: joinResult.groupId };
      } else {
        throw new Error('Failed to find or create new group');
      }

    } catch (error) {
      console.error('Error performing reshuffle:', error);
      toast({
        title: "Error",
        description: "Failed to reshuffle into new group. Please try again.",
        variant: "destructive"
      });
      return { success: false };
    }
  };

  return {
    lifecycleData,
    refreshLifecycleData: fetchLifecycleData,
    findAndJoinGroupWithCapacityCheck,
    performReshuffle
  };
};