import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useEnhancedKarma } from '@/hooks/useEnhancedKarma';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Trophy, Target, TrendingUp, Users, Star, Calendar, Award } from 'lucide-react';

interface GroupKarmaData {
  group_id: string;
  group_name: string;
  monthly_karma_points: number;
  total_karma_earned: number;
  rank: number;
  member_count: number;
}

interface UserKarmaRanking {
  user_id: string;
  username: string;
  karma_contributed: number;
  rank: number;
}

export const KarmaDashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    karmaProgress, 
    enhancedAchievements, 
    recentActivity, 
    getCurrentBenefits,
    getEstimatedTimeToNextLevel,
    KARMA_LEVELS,
    loading 
  } = useEnhancedKarma();

  const [groupLeaderboard, setGroupLeaderboard] = useState<GroupKarmaData[]>([]);
  const [userGroupRanking, setUserGroupRanking] = useState<UserKarmaRanking[]>([]);
  const [currentGroup, setCurrentGroup] = useState<any>(null);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(true);

  useEffect(() => {
    if (user) {
      loadLeaderboardData();
    }
  }, [user]);

  const loadLeaderboardData = async () => {
    if (!user) return;

    try {
      // Get current group
      const { data: groupMembership } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups!inner(
            id,
            name,
            vibe_label
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (groupMembership) {
        setCurrentGroup(groupMembership.groups);

        // Get group leaderboard (global group rankings)
        const { data: leaderboard } = await supabase
          .rpc('get_group_karma_leaderboard');
        
        if (leaderboard) {
          setGroupLeaderboard(leaderboard);
        }

        // Get user ranking within current group
        const { data: userRanking } = await supabase
          .rpc('get_group_user_karma_leaderboard', {
            p_group_id: groupMembership.groups.id,
            p_limit: 100,
            p_offset: 0
          });
        
        if (userRanking) {
          setUserGroupRanking(userRanking);
        }
      }
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
    } finally {
      setLoadingLeaderboards(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!karmaProgress) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No karma data available</p>
        </CardContent>
      </Card>
    );
  }

  const currentUserRank = userGroupRanking.find(u => u.user_id === user?.id);
  const currentGroupRank = currentGroup ? groupLeaderboard.find(g => g.group_id === currentGroup.id) : null;

  return (
    <div className="space-y-6">
      {/* Karma Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>Karma Progress</span>
          </CardTitle>
          <CardDescription>Your journey through the SyncChat community</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Level Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white",
                karmaProgress.currentLevel.color
              )}>
                {karmaProgress.currentLevel.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{karmaProgress.currentLevel.level}</h3>
                <p className="text-sm text-muted-foreground">{karmaProgress.totalPoints} karma points</p>
              </div>
            </div>
            {karmaProgress.nextLevel && (
              <div className="text-right">
                <p className="text-sm font-medium">{karmaProgress.pointsToNext} points to go</p>
                <p className="text-xs text-muted-foreground">{getEstimatedTimeToNextLevel()}</p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {karmaProgress.nextLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{karmaProgress.currentLevel.level}</span>
                <span>{karmaProgress.nextLevel.level}</span>
              </div>
              <Progress value={karmaProgress.progress} className="h-3" />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(karmaProgress.progress)}% complete
              </p>
            </div>
          )}

          {/* Benefits */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Current Benefits</h4>
            <div className="flex flex-wrap gap-2">
              {getCurrentBenefits().map((benefit, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {benefit}
                </Badge>
              ))}
            </div>
          </div>

          {/* Level Description */}
          <p className="text-sm text-muted-foreground italic">
            {karmaProgress.currentLevel.description}
          </p>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="group">Group Ranking</TabsTrigger>
          <TabsTrigger value="global">Global</TabsTrigger>
        </TabsList>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>Your Achievements</span>
              </CardTitle>
              <CardDescription>
                {enhancedAchievements.length} achievements unlocked
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enhancedAchievements.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {enhancedAchievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                        <div className="text-2xl">{achievement.badge_icon}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{achievement.achievement_title}</h4>
                          <p className="text-sm text-muted-foreground">{achievement.achievement_description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {achievement.points} points
                            </Badge>
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                achievement.rarity === 'legendary' && "bg-yellow-100 text-yellow-800",
                                achievement.rarity === 'epic' && "bg-purple-100 text-purple-800",
                                achievement.rarity === 'rare' && "bg-blue-100 text-blue-800",
                                achievement.rarity === 'common' && "bg-gray-100 text-gray-800"
                              )}
                            >
                              {achievement.rarity}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {achievement.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(achievement.unlocked_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Start participating to unlock achievements!
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <p>• Send messages to earn karma</p>
                    <p>• React to messages for bonus points</p>
                    <p>• Participate in games and voice rooms</p>
                    <p>• Level up to unlock special achievements!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>Your latest karma-earning activities</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className="text-lg">
                            {activity.type === 'message' && '💬'}
                            {activity.type === 'reaction' && '👍'}
                            {activity.type === 'voice' && '🎤'}
                            {activity.type === 'game' && '🎮'}
                            {activity.type === 'achievement' && '🏆'}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">
                            +{activity.points} karma
                          </p>
                          {activity.multiplier && activity.multiplier > 1 && (
                            <p className="text-xs text-yellow-600">
                              ×{activity.multiplier} multiplier
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent activity. Start chatting to earn karma!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Group Ranking Tab */}
        <TabsContent value="group" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User's position in current group */}
            {currentGroup && currentUserRank && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Your Group Rank</span>
                  </CardTitle>
                  <CardDescription>In {currentGroup.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      #{currentUserRank.rank}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentUserRank.karma_contributed} karma contributed
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Out of {userGroupRanking.length} members
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current group's global rank */}
            {currentGroup && currentGroupRank && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>Group Global Rank</span>
                  </CardTitle>
                  <CardDescription>{currentGroup.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      #{currentGroupRank.rank}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentGroupRank.monthly_karma_points} karma this month
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {currentGroupRank.member_count} members
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Group members leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Group Leaderboard</CardTitle>
              <CardDescription>Top contributors this month</CardDescription>
            </CardHeader>
            <CardContent>
              {!loadingLeaderboards && userGroupRanking.length > 0 ? (
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {userGroupRanking.slice(0, 10).map((member) => (
                      <div key={member.user_id} className={cn(
                        "flex items-center justify-between p-2 rounded",
                        member.user_id === user?.id && "bg-primary/10"
                      )}>
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            member.rank <= 3 ? "bg-yellow-100 text-yellow-800" : "bg-muted"
                          )}>
                            {member.rank}
                          </div>
                          <span className="font-medium">{member.username}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {member.karma_contributed} karma
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : loadingLeaderboards ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading group members...</p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No group members found or you're not in a group yet!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Global Leaderboard Tab */}
        <TabsContent value="global" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Global Group Rankings</span>
              </CardTitle>
              <CardDescription>Top performing groups this month</CardDescription>
            </CardHeader>
            <CardContent>
              {!loadingLeaderboards && groupLeaderboard.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {groupLeaderboard.slice(0, 20).map((group) => (
                      <div key={group.group_id} className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        currentGroup && group.group_id === currentGroup.id && "bg-primary/10 border-primary/20"
                      )}>
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                            group.rank <= 3 ? "bg-yellow-100 text-yellow-800" : "bg-muted"
                          )}>
                            {group.rank}
                          </div>
                          <div>
                            <p className="font-medium">{group.group_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.member_count} members
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{group.monthly_karma_points}</p>
                          <p className="text-xs text-muted-foreground">karma this month</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : loadingLeaderboards ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading leaderboard...</p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No groups competing yet this month!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};