import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, MessageCircle, Heart, Zap, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { useEngagement } from '@/hooks/useEngagement';
import { AchievementBadge } from './AchievementBadge';

interface EngagementDashboardProps {
  onClose: () => void;
}

export const EngagementDashboard = ({ onClose }: EngagementDashboardProps) => {
  const { engagement, achievements, loading } = useEngagement();

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">Loading your progress...</div>
        </CardContent>
      </Card>
    );
  }

  const todayProgress = engagement ? {
    messages: Math.min((engagement.messages_sent_today / 10) * 100, 100),
    reactions: Math.min((engagement.reactions_given_today / 5) * 100, 100),
    tools: Math.min((engagement.tools_used_today / 3) * 100, 100)
  } : { messages: 0, reactions: 0, tools: 0 };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed inset-4 flex items-center justify-center">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Your Progress</CardTitle>
              </div>
              <Button variant="ghost" onClick={onClose}>✕</Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 overflow-y-auto">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
                <TabsTrigger value="progress">Daily Progress</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{engagement?.daily_streak || 0}</div>
                      <div className="text-sm text-muted-foreground">Day Streak</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{engagement?.achievement_points || 0}</div>
                      <div className="text-sm text-muted-foreground">Total Points</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <MessageCircle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{engagement?.messages_sent_today || 0}</div>
                      <div className="text-sm text-muted-foreground">Messages Today</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Heart className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{engagement?.reactions_given_today || 0}</div>
                      <div className="text-sm text-muted-foreground">Reactions Today</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Recent Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {achievements.length > 0 ? (
                      <div className="space-y-2">
                        {achievements.slice(0, 3).map(achievement => (
                          <AchievementBadge 
                            key={achievement.id} 
                            achievement={achievement} 
                            showDetails 
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        Start chatting to unlock your first achievement!
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="achievements" className="space-y-4">
                {achievements.length > 0 ? (
                  <div className="grid gap-3">
                    {achievements.map(achievement => (
                      <AchievementBadge 
                        key={achievement.id} 
                        achievement={achievement} 
                        showDetails 
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No achievements yet</h3>
                      <p className="text-muted-foreground">
                        Start participating in your group to unlock achievements!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="progress" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Today's Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Messages (Goal: 10)</span>
                        <span>{engagement?.messages_sent_today || 0}/10</span>
                      </div>
                      <Progress value={todayProgress.messages} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Reactions (Goal: 5)</span>
                        <span>{engagement?.reactions_given_today || 0}/5</span>
                      </div>
                      <Progress value={todayProgress.reactions} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Tools Used (Goal: 3)</span>
                        <span>{engagement?.tools_used_today || 0}/3</span>
                      </div>
                      <Progress value={todayProgress.tools} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Available Achievements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span>💬</span>
                        <span>First Steps - Send your first message (10 pts)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🔥</span>
                        <span>Getting Started - 3 day streak (25 pts)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>⭐</span>
                        <span>Week Warrior - 7 day streak (50 pts)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🦋</span>
                        <span>Social Butterfly - 10+ reactions in one day (30 pts)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};