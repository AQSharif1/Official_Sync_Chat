import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Sparkles, RotateCcw, MessageCircle, Trophy, Crown, Shuffle, Home } from 'lucide-react';
import { GroupChat } from '../chat/GroupChat';
import { useEngagement } from '@/hooks/useEngagement';
import { usePremium } from '@/hooks/usePremium';
import { PremiumLimitModal } from '@/components/premium/PremiumLimitModal';
import { AchievementBadge } from '@/components/engagement/AchievementBadge';
import { useGroupMatchingLifecycle } from '@/hooks/useGroupMatchingLifecycle';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  genres: string[];
  personality: string[];
  habits: string[];
  username: string;
}

interface GroupData {
  id: string;
  name: string;
  vibe_label: string;
  members: { username: string }[];
}

interface GroupMatchingFlowProps {
  userProfile: UserProfile;
  onGroupMatched: (groupId: string) => void;
}

export const GroupMatchingFlow = ({ userProfile, onGroupMatched }: GroupMatchingFlowProps) => {
  const [isMatching, setIsMatching] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<GroupData | null>(null);
  const [canSwitch, setCanSwitch] = useState(true);
  const [hasUsedFreeSwitch, setHasUsedFreeSwitch] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showReshuffleNotification, setShowReshuffleNotification] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { engagement, achievements, trackActivity } = useEngagement();
  const { isPremium, canUseFeature } = usePremium();
  const navigate = useNavigate();
  const { 
    lifecycleData, 
    refreshLifecycleData, 
    findAndJoinGroupWithCapacityCheck, 
    performReshuffle 
  } = useGroupMatchingLifecycle();

  useEffect(() => {
    if (user) {
      checkExistingGroup();
      checkSwitchStatus();
      refreshLifecycleData();
    }
  }, [user]);

  useEffect(() => {
    // Check if reshuffle notification should be shown
    if (lifecycleData.needsReshuffle && lifecycleData.canTransition && currentGroup) {
      setShowReshuffleNotification(true);
    }
  }, [lifecycleData, currentGroup]);

  const checkExistingGroup = async () => {
    if (!user) return;

    try {
      const { data: membership } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            id,
            name,
            vibe_label
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (membership?.groups) {
        // Get group members with their profiles
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', membership.group_id);

        // Get usernames for all members
        const memberUsernames: string[] = [];
        if (members) {
          for (const member of members) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', member.user_id)
              .single();
            
            memberUsernames.push(profile?.username || 'Unknown');
          }
        }

        const groupData: GroupData = {
          id: membership.groups.id,
          name: membership.groups.name,
          vibe_label: membership.groups.vibe_label,
          members: memberUsernames.map(username => ({ username }))
        };

        setCurrentGroup(groupData);
        onGroupMatched(groupData.id);
      }
    } catch (error) {
      console.error('Error checking existing group:', error);
    }
  };

  const checkSwitchStatus = async () => {
    if (!user) return;

    try {
      // Check if user has available group switches this month
      const { data: canSwitch, error: switchError } = await supabase
        .rpc('can_user_switch_groups', { p_user_id: user.id });
      
      if (switchError) {
        console.error('Error checking switch availability:', switchError);
        setCanSwitch(false);
        return;
      }
      
      setCanSwitch(canSwitch);
    } catch (error) {
      console.error('Error checking switch status:', error);
      setCanSwitch(false);
    }
  };

  const saveUserProfile = async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          username: userProfile.username,
          genres: userProfile.genres,
          personality: userProfile.personality,
          habits: userProfile.habits
        }, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  };

  const findOrCreateGroup = async () => {
    if (!user) {
      console.error('❌ No user available for group matching');
      toast({
        title: "Authentication Error", 
        description: "Please log in again to join a group.",
        variant: "destructive"
      });
      return;
    }

    setIsMatching(true);

    try {
      // Save user profile first with error handling
      try {
        await saveUserProfile();
      } catch (profileError: any) {
        console.error('❌ Failed to save user profile:', profileError);
        throw new Error(`Profile save failed: ${profileError.message}`);
      }

      // Try to find an existing group with space first
      const { data: existingGroups, error: groupsFetchError } = await supabase
        .from('groups')
        .select('id, name, vibe_label, current_members, max_members')
        .lt('current_members', 10)
        .eq('lifecycle_stage', 'active')
        .order('created_at', { ascending: true })
        .limit(5); // Get more options to increase success rate

      if (groupsFetchError) {
        console.error('❌ Error fetching existing groups:', groupsFetchError);
        throw new Error(`Failed to fetch groups: ${groupsFetchError.message}`);
      }

      let targetGroupId: string | null = null;
      let groupJoinAttempts = 0;

      // Try joining existing groups (with multiple attempts)
      if (existingGroups && existingGroups.length > 0) {
        for (const group of existingGroups) {
          groupJoinAttempts++;
          
          try {
            const { data: rpcResult, error: rpcError } = await supabase.rpc('join_group_safe', {
              p_group_id: group.id
            });

            if (!rpcError && rpcResult?.ok) {
              targetGroupId = group.id;
              break;
            } else {
              console.warn(`⚠️ Failed to join group ${group.name}:`, rpcError?.message || rpcResult?.error);
              // Continue to next group
            }
          } catch (joinError: any) {
            console.warn(`⚠️ Error attempting to join group ${group.name}:`, joinError);
            // Continue to next group
          }
        }
      }

      // If couldn't join any existing group, create a new one
      if (!targetGroupId) {
        try {
          const { data: newGroup, error: groupError } = await supabase
            .from('groups')
            .insert({
              name: `Group-${Date.now()}`,
              vibe_label: 'New Connections',
              current_members: 0,
              max_members: 10,
              is_private: false,
              lifecycle_stage: 'active',
              created_by_user_id: user.id
            })
            .select('id, name, vibe_label')
            .single();

          if (groupError || !newGroup) {
            console.error('❌ Group creation failed:', groupError);
            throw new Error(`Group creation failed: ${groupError?.message || 'Unknown error'}`);
          }

          // Add user to the new group with retry
          let joinSuccess = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const { data: rpcResult, error: rpcError } = await supabase.rpc('join_group_safe', {
                p_group_id: newGroup.id
              });

              if (!rpcError && rpcResult?.ok) {
                targetGroupId = newGroup.id;
                joinSuccess = true;
                break;
              } else {
                console.error(`❌ Join attempt ${attempt} failed:`, rpcError?.message || rpcResult?.error);
                if (attempt < 3) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
              }
            } catch (attemptError: any) {
              console.error(`❌ Join attempt ${attempt} error:`, attemptError);
              if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              }
            }
          }

          if (!joinSuccess) {
            // Clean up the created group if we can't join it
            try {
              await supabase.from('groups').delete().eq('id', newGroup.id);
            } catch (cleanupError) {
              // Silent cleanup error handling
            }
            throw new Error('Failed to join newly created group after 3 attempts');
          }
        } catch (creationError: any) {
          console.error('❌ Group creation process failed:', creationError);
          throw creationError;
        }
      }

      if (!targetGroupId) {
        throw new Error('Could not join any group or create a new one');
      }

      // Verify group membership and get complete group data
      const { data: groupData, error: groupDataError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', targetGroupId)
        .single();

      if (groupDataError || !groupData) {
        console.error('❌ Failed to fetch group data:', groupDataError);
        throw new Error('Failed to fetch group information after joining');
      }

      // Get actual member count and usernames
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          profiles!inner(username)
        `)
        .eq('group_id', targetGroupId);

      const memberUsernames = members?.map(m => ({ 
        username: m.profiles?.username || 'Unknown User' 
      })) || [{ username: userProfile.username }];

      const completeGroup: GroupData = {
        id: targetGroupId,
        name: groupData.name,
        vibe_label: groupData.vibe_label || 'New Connections',
        members: memberUsernames
      };

      setCurrentGroup(completeGroup);
      onGroupMatched(targetGroupId);

      toast({
        title: "🎉 Welcome to Your Group!",
        description: `You've joined ${groupData.name} with ${memberUsernames.length} members!`,
        variant: "default"
      });

    } catch (error: any) {
      console.error('❌ Critical error in group matching:', error);
      
      let errorMessage = 'Failed to find or create group. Please try again.';
      if (error.message?.includes('Profile save')) {
        errorMessage = 'Failed to save your profile. Please check your information and try again.';
      } else if (error.message?.includes('Group creation')) {
        errorMessage = 'Failed to create a new group. Please try again or contact support.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast({
        title: "Group Matching Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleSwitchGroup = async () => {
    if (!user || !currentGroup) return;

    // Check if user can switch groups
    if (!isPremium && hasUsedFreeSwitch) {
      setShowLimitModal(true);
      return;
    }

    // Check daily switch limit for free users
    if (!isPremium && engagement && engagement.group_switches_used_today >= 1) {
      setShowLimitModal(true);
      return;
    }

    try {
      // Leave current group
      await supabase
        .from('group_members')
        .delete()
        .eq('user_id', user.id)
        .eq('group_id', currentGroup.id);

      // Update group member count
      await supabase
        .from('groups')
        .update({ 
          current_members: Math.max(0, currentGroup.members.length - 1)
        })
        .eq('id', currentGroup.id);

      // Track group switch activity
      await trackActivity('group_switch');

      // Mark that user has used their free switch (only for non-premium)
      if (!isPremium) {
        await supabase
          .from('user_switches')
          .upsert({
            user_id: user.id,
            has_used_free_switch: true
          });
        setHasUsedFreeSwitch(true);
        setCanSwitch(false);
      }

      setCurrentGroup(null);

      // Find new group
      await findOrCreateGroup();

    } catch (error) {
      console.error('Error switching groups:', error);
      toast({
        title: "Error",
        description: "Failed to switch groups. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (showChat && currentGroup) {
    return (
      <GroupChat
        groupId={currentGroup.id}
        groupName={currentGroup.name}
        groupVibe={currentGroup.vibe_label}
        memberCount={currentGroup.members.length}
        onBack={() => setShowChat(false)}
      />
    );
  }

  const handleReshuffleToNewGroup = async () => {
    const result = await performReshuffle();
    if (result && typeof result === 'object' && result.success) {
      setShowReshuffleNotification(false);
      setCurrentGroup(null);
      // The new group will be loaded by the reshuffle logic
      window.location.reload(); // Refresh to show new group
    }
  };

  if (currentGroup) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Home Button */}
        <div className="mb-4 flex justify-start">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>
        
        {/* Reshuffle Notification */}
        {showReshuffleNotification && (
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Shuffle className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-1">
                    🎉 Your 30-day group has wrapped!
                  </h3>
                  <p className="text-sm text-orange-800 mb-4">
                    We've found you a new group match based on your preferences with {lifecycleData.memory.totalUserCount}+ users in our community.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleReshuffleToNewGroup}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Shuffle className="h-4 w-4 mr-2" />
                      Join New Group
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowReshuffleNotification(false)}
                      className="border-orange-300 text-orange-700"
                    >
                      Stay Here
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
          {isPremium && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            </div>
          )}
          <CardHeader className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <Badge variant="secondary">{currentGroup.vibe_label}</Badge>
              {lifecycleData.memory.matchingMode === 'strict' && (
                <Badge variant="outline" className="text-xs">
                  Curated Match
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl">{currentGroup.name}</CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{currentGroup.members.length} members</span>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Group Members:</h4>
              <div className="flex flex-wrap gap-2">
                {currentGroup.members.map((member, index) => (
                  <Badge key={index} variant="outline">
                    {member.username}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Engagement Summary */}
            {engagement && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Your Progress</span>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-bold">
                      {engagement.achievement_points} pts
                      {isPremium && <span className="text-xs text-primary ml-1">(2x rate)</span>}
                    </span>
                  </div>
                </div>
                
                {achievements.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Recent Achievement</span>
                    <AchievementBadge achievement={achievements[0]} size="sm" />
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">{engagement.daily_streak}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-500">{engagement.messages_sent_today}</div>
                    <div className="text-xs text-muted-foreground">Messages</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-pink-500">{engagement.reactions_given_today}</div>
                    <div className="text-xs text-muted-foreground">Reactions</div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowChat(true)}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Open Chat
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSwitchGroup}
                  disabled={!isPremium && !canSwitch}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {isPremium ? 'Switch Group' : 
                   canSwitch ? 'Switch Group (Free)' : 'Switch Group (Premium)'}
                </Button>
              </div>
              
              {!isPremium && hasUsedFreeSwitch && (
                <p className="text-sm text-muted-foreground mt-2">
                  You've used your free switch. Upgrade to Premium for unlimited switches!
                </p>
              )}
              
              {isPremium && (
                <p className="text-sm text-primary mt-2 flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Unlimited group switching with Premium
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <PremiumLimitModal
          open={showLimitModal}
          onOpenChange={setShowLimitModal}
          feature="group_switch"
          currentUsage={engagement?.group_switches_used_today || 0}
          limit={1}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Home Button */}
      <div className="mb-4 flex justify-start">
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Home
        </Button>
      </div>
      
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Find Your Perfect Group</CardTitle>
          {!lifecycleData.loading && (
            <div className="flex justify-center gap-2 mt-2">
              <Badge variant={lifecycleData.memory.matchingMode === 'flexible' ? 'default' : 'secondary'}>
                {lifecycleData.memory.matchingMode === 'flexible' ? 'Quick Match' : 'Curated Match'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {lifecycleData.memory.totalUserCount} users
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {lifecycleData.memory.matchingMode === 'flexible' 
                ? "We'll find you an active group to join and start connecting!"
                : "Based on your preferences, we'll match you with like-minded people in a curated group of up to 10 members."
              }
            </p>
            
            <div className="space-y-2">
              <h4 className="font-medium">Your Profile Summary:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{userProfile?.genres?.length || 0} favorite genres</p>
                <p>{userProfile?.personality?.length || 0} personality traits</p>
                <p>{userProfile?.habits?.length || 0} habits</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={findOrCreateGroup} 
            disabled={isMatching || lifecycleData.loading}
            size="lg"
            className="w-full"
          >
            {isMatching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding Your Group...
              </>
            ) : (
              'Find My Group'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};