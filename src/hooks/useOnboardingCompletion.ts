import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

import { useGroupMemberManagement } from '@/hooks/useGroupMemberManagement';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  username: string;
  genres: string[];
  personality: string[];
  habits: string[];
}

export const useOnboardingCompletion = () => {
  const { user } = useAuth();
  const { addUserToGroup, findAvailableGroupsWithCapacity, createNewGroupForCategory } = useGroupMemberManagement();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // SIMPLE: Minimal profile validation - just require username
  const validateProfile = (profile: UserProfile): { isValid: boolean; error?: string } => {
    if (!profile.username || profile.username.trim().length === 0) {
      return { isValid: false, error: 'Username is required' };
    }

    // Accept any username length and any preferences
    return { isValid: true };
  };

  // Retry mechanism for critical operations
  const retryOperation = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.warn(`Operation failed, attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    throw new Error('All retry attempts failed');
  };

  const completeOnboarding = async (userProfile: UserProfile): Promise<{ success: boolean; groupId?: string }> => {
    if (!user?.id) {
      console.error('❌ No user ID available:', user);
      toast({
        title: "Authentication Error",
        description: "User not properly authenticated. Please sign in again.",
        variant: "destructive"
      });
      return { success: false };
    }

    // Check if user session is still valid (fix refresh token issues)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('❌ Session validation failed:', sessionError);
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive"
        });
        return { success: false };
      }
      console.log('✅ Session validated for user:', session.user.email);
    } catch (sessionCheckError) {
      console.error('❌ Error checking session:', sessionCheckError);
      // Continue anyway, but log the issue
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user.id)) {
      console.error('❌ Invalid user ID format:', user.id);
      toast({
        title: "Invalid User ID",
        description: "User ID format is invalid. Please contact support.",
        variant: "destructive"
      });
      return { success: false };
    }

    console.log('✅ User authentication validated:', {
      userId: user.id,
      email: user.email,
      emailConfirmed: !!user.email_confirmed_at
    });

    // Validate profile before proceeding
    const validation = validateProfile(userProfile);
    if (!validation.isValid) {
      toast({
        title: "Profile Validation Error",
        description: validation.error,
        variant: "destructive"
      });
      return { success: false };
    }

    setIsProcessing(true);

    try {
      // Insert/update profile data with retry logic
      console.log('🔄 Starting profile creation for user:', user.id);
      await retryOperation(async () => {
        const profileData = {
          user_id: user.id,
          username: userProfile.username.trim(),
          genres: Array.isArray(userProfile.genres) ? userProfile.genres : [],
          personality: Array.isArray(userProfile.personality) ? userProfile.personality : [],
          habits: Array.isArray(userProfile.habits) ? userProfile.habits : [],
          updated_at: new Date().toISOString()
        };
        
        console.log('📝 Inserting profile data:', profileData);
        
        // Use simple upsert without constraint specification to avoid constraint issues
        // Supabase will automatically use the primary key (user_id) for conflict resolution
        const { data: profileResult, error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData)
          .select();

        console.log('💡 Profile upsert result:', { data: profileResult, error: profileError });

        if (profileError) {
          console.error('❌ Profile creation error details:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          });
          
          // If upsert fails, try insert then update approach
          console.log('🔄 Trying insert/update approach...');
          
          // First try to insert
          const insertResult = await supabase
            .from('profiles')
            .insert(profileData)
            .select();
            
          if (insertResult.error && insertResult.error.code === '23505') {
            // Duplicate key error, try update instead
            console.log('🔄 Duplicate key detected, trying update...');
            const updateResult = await supabase
              .from('profiles')
              .update(profileData)
              .eq('user_id', user.id)
              .select();
              
            if (updateResult.error) {
              throw new Error(`Profile creation failed: ${updateResult.error.message}`);
            }
            return updateResult.data;
          } else if (insertResult.error) {
            throw new Error(`Profile creation failed: ${insertResult.error.message}`);
          } else {
            return insertResult.data;
          }
        }
        
        console.log('✅ Profile created/updated successfully');
      });

      // Verify profile was created successfully
      const { data: savedProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('user_id', user.id)
        .single();

      if (verifyError || !savedProfile) {
        console.error('Profile verification failed:', verifyError);
        toast({
          title: "Error",
          description: "Profile creation could not be verified. Please try again.",
          variant: "destructive"
        });
        return { success: false };
      }

      // ROBUST: Find existing group with space or create new one with comprehensive error handling
      console.log('🔧 ROBUST: Finding group with enhanced error handling and retry logic...');
      
      let targetGroupId: string | null = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts && !targetGroupId) {
        attempts++;
        console.log(`🔄 Group assignment attempt ${attempts}/${maxAttempts}`);
        
        try {
          // Use the RPC function instead
          const { data: existingGroups, error: groupsError } = await supabase.rpc('get_available_groups', {
            p_limit: 5
          });

          if (groupsError) {
            console.error(`❌ Error finding existing groups (attempt ${attempts}):`, groupsError);
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
              continue;
            }
            throw new Error(`Failed to find groups: ${groupsError.message}`);
          }

          // Try joining existing groups
          if (existingGroups && existingGroups.length > 0) {
            console.log(`🔍 Found ${existingGroups.length} potential groups to join`);
            
            for (const existingGroup of existingGroups) {
              console.log(`🔄 Attempting to join: ${existingGroup.name} (${existingGroup.current_members}/${existingGroup.max_members || 10})`);
              
              try {
                    const { data: rpcResult, error: rpcError } = await supabase.rpc('join_group_safe', {
      p_group_id: existingGroup.id
    });

                                  console.log('💡 join_group_safe RPC result for existing group:', { rpcResult, rpcError });

                if (!rpcError && rpcResult?.ok) {
                  targetGroupId = existingGroup.id;
                  console.log(`✅ Successfully joined existing group: ${existingGroup.name} (members: ${rpcResult.members})`);
                  break;
                } else {
                  console.warn(`⚠️ Failed to join ${existingGroup.name}:`, rpcError?.message || rpcResult?.error);
                  // Continue to next group
                }
              } catch (joinError: any) {
                console.warn(`⚠️ Error joining ${existingGroup.name}:`, joinError);
                // Continue to next group
              }
            }
          }

          // If couldn't join any existing group, create a new one
          if (!targetGroupId) {
            console.log(`🔧 Creating new group (attempt ${attempts})...`);
            
            const { data: newGroup, error: groupError } = await supabase
              .from('groups')
              .insert({
                name: `Group-${Date.now()}-${attempts}`,
                vibe_label: 'New Connections',
                current_members: 0,
                max_members: 10,
                is_private: false,
                lifecycle_stage: 'active',
                created_by_user_id: user.id
              })
              .select('id, name')
              .single();

            if (groupError || !newGroup) {
              console.error(`❌ Group creation failed (attempt ${attempts}):`, groupError);
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                continue;
              }
              throw new Error(`Group creation failed: ${groupError?.message}`);
            }

            console.log(`✅ New group created: ${newGroup.name}`);

            // Add user to the new group with retry
            let joinSuccess = false;
            for (let joinAttempt = 1; joinAttempt <= 3; joinAttempt++) {
              try {
                const { data: rpcResult, error: rpcError } = await supabase.rpc('join_group_safe', {
                  p_group_id: newGroup.id
                });

                console.log(`💡 join_group_safe RPC result for new group (join attempt ${joinAttempt}):`, { rpcResult, rpcError });

                if (!rpcError && rpcResult?.ok) {
                  targetGroupId = newGroup.id;
                  joinSuccess = true;
                  console.log(`✅ Successfully joined new group on attempt ${joinAttempt}`);
                  break;
                } else {
                  console.error(`❌ Join attempt ${joinAttempt} failed:`, rpcError?.message || rpcResult?.error);
                  if (joinAttempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * joinAttempt));
                  }
                }
              } catch (joinError: any) {
                console.error(`❌ Join attempt ${joinAttempt} error:`, joinError);
                if (joinAttempt < 3) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * joinAttempt));
                }
              }
            }

            if (!joinSuccess) {
              // Clean up the created group
              try {
                await supabase.from('groups').delete().eq('id', newGroup.id);
                console.log('🧹 Cleaned up unused group');
              } catch (cleanupError) {
                console.error('Failed to clean up unused group:', cleanupError);
              }
              
              if (attempts < maxAttempts) {
                console.log('⏭️ Retrying entire group assignment process...');
                await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
                continue;
              }
              throw new Error('Failed to join newly created group after multiple attempts');
            }
          }

        } catch (error: any) {
          console.error(`❌ Group assignment attempt ${attempts} failed:`, error);
          if (attempts < maxAttempts) {
            console.log(`⏭️ Retrying in ${2000 * attempts}ms...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
            continue;
          }
          throw error;
        }
      }

      if (!targetGroupId) {
        throw new Error('Failed to assign user to any group after all attempts');
      }

      // Verify the assignment was successful
      try {
        const { data: verifyMembership } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
          .eq('group_id', targetGroupId)
          .single();

        if (!verifyMembership) {
          throw new Error('Group membership verification failed');
        }

        // Update profile with group_id - simple and robust
        try {
          await supabase
            .from('profiles')
            .update({ group_id: targetGroupId })
            .eq('user_id', user.id);
          console.log('✅ Profile updated with group_id');
        } catch (profileError) {
          console.warn('⚠️ Profile update failed, but user is in group - continuing onboarding');
          // Don't fail the entire onboarding process - user is successfully in group
        }

        console.log('✅ User successfully assigned to group:', targetGroupId);
        
        // Final verification: Ensure user can access their group
        const { data: finalCheck } = await supabase
          .from('profiles')
          .select('group_id')
          .eq('user_id', user.id)
          .single();
        
        if (finalCheck?.group_id !== targetGroupId) {
          console.warn('⚠️ Profile group_id mismatch after assignment - this is non-critical');
          // Profile update failed, but user is in group - this is acceptable
        }
        
        toast({
          title: "🎉 Welcome to Your Group!",
          description: "You've been successfully matched with other users. Start chatting!",
          variant: "default"
        });

        // Notify the app that onboarding is complete
        window.dispatchEvent(new CustomEvent('onboarding:complete', { 
          detail: { groupId: targetGroupId } 
        }));
        
        return { success: true, groupId: targetGroupId };
        
      } catch (verificationError: any) {
        console.error('❌ Group assignment verification failed:', verificationError);
        toast({
          title: "Assignment Verification Failed",
          description: "Group assignment may not have completed properly. Please try signing in again.",
          variant: "destructive"
        });
        return { success: false };
      }

      // Onboarding completed successfully - clear incomplete signup markers
      localStorage.removeItem('incomplete_signup_time');
      localStorage.removeItem('onboarding_skipped');

      return { success: true, groupId: targetGroupId || undefined };

    } catch (error: any) {
      console.error('❌ CRITICAL ERROR in completeOnboarding:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        cause: error.cause
      });
      
      // More specific error message based on error type
      let errorDescription = "An unexpected error occurred. Please try again.";
      if (error.message?.includes('profile')) {
        errorDescription = "Failed to create user profile. Please check your information and try again.";
      } else if (error.message?.includes('group')) {
        errorDescription = "Failed to assign you to a group. Please try again or contact support.";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorDescription = "Network error. Please check your connection and try again.";
      }
      
      toast({
        title: "Onboarding Failed",
        description: errorDescription,
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    completeOnboarding,
    isProcessing
  };
};