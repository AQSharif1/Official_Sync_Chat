import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/hooks/useAppData';
import { useEngagement } from '@/hooks/useEngagement';
import { User, Settings, RefreshCw, Home, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HomePageProps {
  onStartMatching?: (groupId?: string, groupData?: any) => void;
  onViewProfile?: () => void;
  onViewSettings?: () => void;
  className?: string;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartMatching, onViewProfile, onViewSettings, className }) => {
  const { user } = useAuth();
  const { currentGroup: appCurrentGroup } = useAppData();
  const { engagement } = useEngagement();
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      // Load current group if any with actual member count
      const { data: groupMembership } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups!inner(
            id,
            name,
            vibe_label,
            created_at,
            lifecycle_stage
          )
        `)
        .eq('user_id', user.id)
        .eq('groups.lifecycle_stage', 'active')
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (groupMembership) {
        const groupData = groupMembership.groups as any;
        
        // Get actual member count
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select('user_id', { count: 'exact' })
          .eq('group_id', groupData.id);

        if (!memberError && memberData) {
          // Note: Using appCurrentGroup for display, local state removed
        } else {
          // Note: Using appCurrentGroup for display, local state removed
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterChat = async () => {
    if (!user) return;

    // Check if user has an active group
    try {
      const { data: membership, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups!inner(
            id,
            name,
            vibe_label,
            current_members,
            lifecycle_stage
          )
        `)
        .eq('user_id', user.id)
        .eq('groups.lifecycle_stage', 'active')
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (membership && membership.groups) {
        // User has an active group, take them directly to chat
        const groupData = membership.groups as any;
        
        // Get actual member count
        const { data: memberCount, error: countError } = await supabase
          .from('group_members')
          .select('user_id', { count: 'exact' })
          .eq('group_id', groupData.id);

        if (countError) throw countError;

        // Navigate directly to chat with proper group data
        if (onStartMatching) {
          onStartMatching(groupData.id, {
            id: groupData.id,
            name: groupData.name,
            vibe_label: groupData.vibe_label,
            actual_member_count: memberCount?.length || 0
          });
        }
      } else {
        // No active group, start matching flow
        if (onStartMatching) {
          onStartMatching();
        }
      }
    } catch (error) {
      console.error('Error checking user group:', error);
      // Fallback to normal matching flow
      if (onStartMatching) {
        onStartMatching();
      }
    }
  };

  const handleViewProfile = () => {
    console.log('HomePage: Navigating to profile...');
    if (onViewProfile) {
      onViewProfile();
    }
  };

  const handleViewSettings = () => {
    console.log('HomePage: Navigating to settings...');
    if (onViewSettings) {
      onViewSettings();
    }
  };

  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Hi there';
    if (hour < 17) return 'Hi there';
    return 'Hi there';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background p-4 ${className}`}>
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Welcome Header */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {getGreetingTime()}, {userProfile?.username || 'friend'} 👋
          </h1>
          <p className="text-muted-foreground">
            Welcome back! What would you like to do today?
          </p>
        </div>

        {/* Current Group Status */}
        {appCurrentGroup ? (
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Active Group
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">{appCurrentGroup.name}</span>
                  <Badge variant="secondary">{appCurrentGroup.vibe_label}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  {(appCurrentGroup as any).actual_member_count || appCurrentGroup.current_members || 0} member{((appCurrentGroup as any).actual_member_count || appCurrentGroup.current_members || 0) !== 1 ? 's' : ''} • 
                  Active since {new Date(appCurrentGroup.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-muted bg-muted/20">
            <CardContent className="p-6 text-center">
              <div className="space-y-2">
                <h3 className="font-semibold">You're not in a group yet</h3>
                <p className="text-muted-foreground text-sm">
                  Find your perfect group match and start chatting!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Action Buttons */}
        <div className="grid gap-4">
          
          {/* Enter/Join Chat */}
          <Card 
            className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer active:scale-[0.98]" 
            onClick={handleEnterChat}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  {appCurrentGroup ? (
                    <RefreshCw className="w-6 h-6 text-primary" />
                  ) : (
                    <RefreshCw className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {appCurrentGroup ? '💬 Enter Group Chat' : '🔄 Match Me'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {appCurrentGroup 
                      ? `Continue chatting in ${appCurrentGroup.name}` 
                      : 'Find and join a new group that matches your vibe'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* View Profile */}
          <Card 
            className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer active:scale-[0.98]" 
            onClick={handleViewProfile}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">👤 View Profile</h3>
                  <p className="text-muted-foreground text-sm">
                    Check your karma, achievements, and edit your vibe tags
                  </p>
                </div>
                {engagement && (
                  <div className="text-right">
                    <div className="text-sm font-medium">{engagement.achievement_points}</div>
                    <div className="text-xs text-muted-foreground">karma</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card 
            className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer active:scale-[0.98]" 
            onClick={handleViewSettings}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-500/10 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-gray-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">⚙️ Settings</h3>
                  <p className="text-muted-foreground text-sm">
                    Manage notifications, premium features, and account settings
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Quick Stats */}
        {engagement && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today's Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {engagement.messages_sent_today || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Messages</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {engagement.reactions_given_today || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Reactions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {engagement.daily_streak || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            Ready to connect? Pick an option above to get started! ✨
          </p>
        </div>
      </div>
    </div>
  );
};