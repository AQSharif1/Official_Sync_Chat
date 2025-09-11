import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Trophy, 
  Star, 
  Crown, 
  MessageCircle, 
  ThumbsUp, 
  Zap,
  Calendar,
  Target,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEngagement } from '@/hooks/useEngagement';
import { supabase } from '@/integrations/supabase/client';

interface ProfileViewProps {
  className?: string;
}

export const ProfileView = ({ className = "" }: ProfileViewProps) => {
  const { user } = useAuth();
  const { engagement, achievements } = useEngagement();
  const [userProfile, setUserProfile] = useState<{ username: string } | null>(null);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalReactions: 0,
    groupsJoined: 0,
    daysActive: 0
  });

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadUserStats();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      // Get message count
      const { count: messageCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Get reaction count
      const { count: reactionCount } = await supabase
        .from('message_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Get groups joined count
      const { count: groupCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      setStats({
        totalMessages: messageCount || 0,
        totalReactions: reactionCount || 0,
        groupsJoined: groupCount || 0,
        daysActive: engagement?.daily_streak || 0
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle,
    color = "primary" 
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    subtitle: string;
    color?: string;
  }) => (
    <Card className="text-center hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className={`w-12 h-12 rounded-full bg-${color}/10 mx-auto mb-3 flex items-center justify-center`}>
          <Icon className={`h-6 w-6 text-${color}`} />
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  );

  const nextLevelPoints = 1000; // Example: next level at 1000 points
  const currentPoints = engagement?.achievement_points || 0;
  const progressPercentage = (currentPoints / nextLevelPoints) * 100;

  return (
    <div className={`max-w-2xl mx-auto p-4 space-y-6 ${className}`}>
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {userProfile ? getInitials(userProfile.username) : 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{userProfile?.username || 'Anonymous User'}</h1>
              <p className="text-muted-foreground">Active member</p>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{currentPoints}</span>
                  <span className="text-sm text-muted-foreground">karma</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="font-medium">{achievements.length}</span>
                  <span className="text-sm text-muted-foreground">achievements</span>
                </div>
              </div>
            </div>

            <Button variant="outline" size="sm" className="hover-scale">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          </div>

          {/* Progress to next level */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Level Progress</span>
              <span className="text-muted-foreground">{currentPoints} / {nextLevelPoints}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {nextLevelPoints - currentPoints} more karma points to next level
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={MessageCircle}
          title="Messages"
          value={stats.totalMessages}
          subtitle="Total sent"
          color="primary"
        />
        
        <StatCard
          icon={ThumbsUp}
          title="Reactions"
          value={stats.totalReactions}
          subtitle="Given"
          color="green-500"
        />
        
        <StatCard
          icon={Zap}
          title="Streak"
          value={stats.daysActive}
          subtitle="Day streak"
          color="orange-500"
        />
        
        <StatCard
          icon={Target}
          title="Groups"
          value={stats.groupsJoined}
          subtitle="Joined"
          color="blue-500"
        />
      </div>

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length > 0 ? (
            <div className="space-y-3">
              {achievements.slice(0, 5).map((achievement) => (
                <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <span className="text-2xl">{achievement.badge_icon}</span>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{achievement.achievement_title}</h3>
                    <p className="text-xs text-muted-foreground">{achievement.achievement_description}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    +{achievement.points}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Start chatting to earn your first achievement!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Daily Activity</span>
              <span className="text-sm font-medium text-green-500">Active</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Weekly Messages</span>
              <span className="text-sm font-medium">{stats.totalMessages}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Favorite Time</span>
              <span className="text-sm font-medium text-muted-foreground">Evening</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Response Rate</span>
              <span className="text-sm font-medium text-primary">Fast</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};