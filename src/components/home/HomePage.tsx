import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAppData } from '@/hooks/useAppData';
import { useEngagement } from '@/hooks/useEngagement';
import { 
  User, 
  Settings, 
  RefreshCw, 
  Users, 
  MessageCircle, 
  Trophy, 
  Zap, 
  Heart,
  Sparkles,
  ArrowRight,
  Crown,
  Flame,
  Target,
  Gamepad2,
} from 'lucide-react';
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
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Welcome to GroupMeet</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-foreground via-primary to-primary/60 bg-clip-text text-transparent leading-tight">
            {getGreetingTime()}, {userProfile?.username || 'friend'}!
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Connect with like-minded people, share your vibe, and build meaningful conversations in real-time.
          </p>
        </div>

        {/* Current Group Status - Enhanced */}
        {appCurrentGroup ? (
          <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
            <CardContent className="relative p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Active Group</h3>
                    <p className="text-muted-foreground">You're currently connected</p>
                  </div>
                </div>
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                  {appCurrentGroup.vibe_label}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-2xl font-bold text-foreground">{appCurrentGroup.name}</h4>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{(appCurrentGroup as any).actual_member_count || appCurrentGroup.current_members || 0} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4" />
                    <span>Active since {new Date(appCurrentGroup.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-dashed border-muted/50 bg-muted/10 mb-8">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Ready to Find Your Group?</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Discover amazing people who share your interests and start meaningful conversations.
              </p>
              <Button onClick={handleEnterChat} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3">
                <Sparkles className="w-4 h-4 mr-2" />
                Find My Group
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Primary Action - Chat/Group */}
          <Card 
            className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer active:scale-[0.98] border-2 hover:border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10"
            onClick={handleEnterChat}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  {appCurrentGroup ? (
                    <MessageCircle className="w-8 h-8 text-primary" />
                  ) : (
                    <RefreshCw className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {appCurrentGroup ? 'Continue Chatting' : 'Find My Group'}
                  </h3>
                  <p className="text-muted-foreground">
                    {appCurrentGroup 
                      ? `Jump back into ${appCurrentGroup.name}` 
                      : 'Match with your perfect group'
                    }
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
              
              {appCurrentGroup && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Live • {(appCurrentGroup as any).actual_member_count || appCurrentGroup.current_members || 0} online</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Card */}
          <Card 
            className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer active:scale-[0.98] border-2 hover:border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-500/10"
            onClick={handleViewProfile}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <User className="w-8 h-8 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-1">My Profile</h3>
                  <p className="text-muted-foreground">View stats & achievements</p>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
              </div>
              
              {engagement && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-muted/50">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500 flex items-center justify-center gap-1">
                      <Trophy className="w-5 h-5" />
                      {engagement.achievement_points || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Karma Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500 flex items-center justify-center gap-1">
                      <Flame className="w-5 h-5" />
                      {engagement.daily_streak || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card 
            className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer active:scale-[0.98] border-2 hover:border-gray-500/30 bg-gradient-to-br from-gray-500/5 to-gray-500/10"
            onClick={handleViewSettings}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings className="w-8 h-8 text-gray-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-1">Settings</h3>
                  <p className="text-muted-foreground">Customize your experience</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:translate-x-1 transition-transform" />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Crown className="w-4 h-4" />
                <span>Premium features available</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Dashboard */}
        {engagement && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Zap className="w-5 h-5 text-primary" />
                Today's Activity
              </CardTitle>
              <CardDescription>Your engagement stats for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {engagement.messages_sent_today || 0}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    Messages
                  </div>
                </div>
                <div className="text-center p-4 rounded-xl bg-pink-500/5 border border-pink-500/10">
                  <div className="text-3xl font-bold text-pink-500 mb-1">
                    {engagement.reactions_given_today || 0}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Heart className="w-4 h-4" />
                    Reactions
                  </div>
                </div>
                <div className="text-center p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <div className="text-3xl font-bold text-orange-500 mb-1">
                    {engagement.daily_streak || 0}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4" />
                    Day Streak
                  </div>
                </div>
                <div className="text-center p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <div className="text-3xl font-bold text-purple-500 mb-1">
                    {engagement.tools_used_today || 0}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Gamepad2 className="w-4 h-4" />
                    Tools Used
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Footer */}
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Ready to connect and create amazing conversations!</span>
          </div>
        </div>
      </div>
    </div>
  );
};