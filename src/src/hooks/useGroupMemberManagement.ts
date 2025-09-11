import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GroupMemberManagementResult {
  success: boolean;
  error?: string;
  groupId?: string;
  groupName?: string;
  newMemberCount?: number;
  currentMembers?: number;
  maxMembers?: number;
}

export const useGroupMemberManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const addUserToGroup = async (groupId: string, userId?: string): Promise<GroupMemberManagementResult> => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      console.error('❌ No user ID provided for group assignment');
      return { success: false, error: 'No user ID provided' };
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(groupId) || !uuidRegex.test(targetUserId)) {
      console.error('❌ Invalid UUID format:', { groupId, targetUserId });
      return { success: false, error: 'Invalid ID format provided' };
    }

    try {
      console.log('🔄 Calling join_group_safe RPC with:', {
        p_group_id: groupId
      });

      // Retry mechanism for network issues
      let lastError: any = null;
      let result: any = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { data, error } = await supabase.rpc('join_group_safe', {
            p_group_id: groupId
          });

          console.log(`💡 join_group_safe RPC response (attempt ${attempt}):`, { data, error });

          if (error) {
            lastError = error;
            console.error(`❌ RPC error adding user to group (attempt ${attempt}):`, {
              error,
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
              groupId,
              userId: targetUserId
            });
            
            // If it's a database constraint error, don't retry
            if (error.code === '23505' || error.code === '23503' || error.code === '42P01') {
              break;
            }
            
            // Wait before retry
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
          } else {
            result = data;
            break;
          }
        } catch (networkError: any) {
          lastError = networkError;
          console.error(`❌ Network error (attempt ${attempt}):`, networkError);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
        }
      }

      if (lastError && !result) {
        return { success: false, error: `Failed after 3 attempts: ${lastError.message}` };
      }

      if (!result?.ok) {
        console.error('❌ addUserToGroup RPC returned failure:', {
          ok: result?.ok,
          error: result?.error,
          members: result?.members,
          groupId,
          userId: targetUserId
        });
        
        return {
          success: false,
          error: result?.error || 'Failed to add user to group',
          currentMembers: result?.members,
          maxMembers: undefined
        };
      }

      console.log('✅ Successfully added user to group:', result);
      return {
        success: true,
        groupId: result.group_id,
        groupName: undefined, // Not provided by join_group_safe
        newMemberCount: result.members
      };

    } catch (error: any) {
      console.error('❌ Critical error in addUserToGroup:', error);
      return { success: false, error: `Critical error: ${error.message}` };
    }
  };

  const removeUserFromGroup = async (groupId: string, userId?: string): Promise<GroupMemberManagementResult> => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      return { success: false, error: 'No user ID provided' };
    }

    try {
      const { data, error } = await supabase.rpc('remove_user_from_group', {
        p_group_id: groupId,
        p_user_id: targetUserId
      });

      if (error) {
        console.error('Error removing user from group:', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      if (!result?.success) {
        return { success: false, error: result?.error || 'Failed to remove user from group' };
      }

      return {
        success: true,
        groupId: result.group_id,
        newMemberCount: result.new_member_count
      };

    } catch (error: any) {
      console.error('Error in removeUserFromGroup:', error);
      return { success: false, error: error.message };
    }
  };

  const findAvailableGroupsWithCapacity = async (matchingMode: 'flexible' | 'strict', userProfile?: any) => {
    try {
      console.log('🔧 ULTIMATE: Finding available groups using RPC...');
      
      // Use the new RPC function that returns only available groups
      const { data: availableGroups, error: groupsError } = await supabase.rpc('get_available_groups', {
        p_limit: 50
      });

      if (groupsError) {
        console.error('❌ Error fetching available groups:', groupsError);
        return [];
      }

      if (!availableGroups?.length) {
        console.log('📊 No available groups found - will create new one');
        return [];
      }

      console.log(`📊 Found ${availableGroups.length} available groups`);
      
      // Return the groups with additional metadata
      return availableGroups.map(group => ({
        ...group,
        actual_member_count: group.current_members
      }));

    } catch (error) {
      console.error('❌ Error in findAvailableGroupsWithCapacity:', error);
      return [];
    }
  };

  const createNewGroupForCategory = async (matchingMode: 'flexible' | 'strict', userProfile?: any) => {
    if (!user) {
      console.error('❌ No user found in createNewGroupForCategory');
      throw new Error('User not authenticated');
    }

    console.log('🔧 SIMPLE: Creating new group...');

    try {
      // Simple group creation
      const { data: newGroup, error } = await supabase
        .from('groups')
        .insert({
          name: `Group-${Date.now()}`,
          vibe_label: 'New Group',
          current_members: 0,
          max_members: 10,
          is_private: false,
          lifecycle_stage: 'active'
        })
        .select('id, name')
        .single();

      if (error || !newGroup) {
        console.error('❌ Group creation failed:', error);
        throw new Error(`Failed to create group: ${error?.message}`);
      }

      console.log('✅ Group created successfully:', newGroup);
      return newGroup;

    } catch (error: any) {
      console.error('❌ Error in createNewGroupForCategory:', error);
      throw new Error(`Group creation failed: ${error.message}`);
    }
  };

  const getCurrentGroupMemberCount = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('current_members, max_members')
        .eq('id', groupId)
        .single();

      if (error || !data) {
        console.error('Error getting group member count:', error);
        return null;
      }

      return {
        currentMembers: data.current_members,
        maxMembers: data.max_members,
        hasCapacity: data.current_members < data.max_members
      };

    } catch (error) {
      console.error('Error in getCurrentGroupMemberCount:', error);
      return null;
    }
  };

  return {
    addUserToGroup,
    removeUserFromGroup,
    findAvailableGroupsWithCapacity,
    createNewGroupForCategory,
    getCurrentGroupMemberCount
  };
};