import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { useEngagement } from '@/hooks/useEngagement';
import { useEnhancedKarma } from '@/hooks/useEnhancedKarma';

import { useReconnectDM } from '@/hooks/useReconnectDM';
import { PremiumUpgrade } from '@/components/premium/PremiumUpgrade';
import { Crown, Edit, Users, Calendar, Star, Zap, X, Plus, Home, User, Smile, Trophy, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUsernameChange } from '@/hooks/useUsernameChange';
import { useAccountManagement } from '@/hooks/useAccountManagement';
import { KarmaDashboard } from '@/components/karma/KarmaDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProfilePageProps {
  className?: string;
  onGoHome?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ className, onGoHome }) => {
  const { user } = useAuth();
  const { isPremium, premium } = usePremium();
  const { engagement } = useEngagement();
  const { karmaProgress, enhancedAchievements } = useEnhancedKarma();
  const { privateChats } = useReconnectDM();
  const { canChange: canChangeUsername, isFirstTime, isPremium: usernamePremium, changeUsername } = useUsernameChange();
  const { deleteAccount, isLoading: accountLoading } = useAccountManagement();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentGroup, setCurrentGroup] = useState<any>(null);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showPremiumUpgrade, setShowPremiumUpgrade] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isEditingMood, setIsEditingMood] = useState(false);
  const [dailyMood, setDailyMood] = useState(5);
  const [moodEmoji, setMoodEmoji] = useState('😊');
  const [showMoodEmoji, setShowMoodEmoji] = useState(false);
  const [lastMoodUpdate, setLastMoodUpdate] = useState<string | null>(null);

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
        setEditedTags([...profile.genres]);
        setDailyMood(profile.daily_mood || 5);
        setMoodEmoji(profile.mood_emoji || '😊');
        setShowMoodEmoji(profile.show_mood_emoji || false);
        setLastMoodUpdate(profile.last_mood_update || null);
      }

      // Load current group if any
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
        setCurrentGroup(groupMembership.groups);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTags = async () => {
    if (!user || !userProfile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ genres: editedTags })
        .eq('user_id', user.id);

      if (error) throw error;

      setUserProfile({ ...userProfile, genres: editedTags });
      setIsEditingTags(false);
      toast({
        title: "Vibe Tags Updated",
        description: "Your preferences have been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating tags:', error);
      toast({
        title: "Error",
        description: "Failed to update your vibe tags. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addTag = () => {
    if (newTag.trim() && !editedTags.includes(newTag.trim()) && editedTags.length < 5) {
      setEditedTags([...editedTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter(tag => tag !== tagToRemove));
  };

  const handleUsernameChange = async () => {
    if (!newUsername.trim()) {
      toast({
        title: "Invalid Username",
        description: "Please enter a valid username.",
        variant: "destructive",
      });
      return;
    }

    const success = await changeUsername(newUsername);
    if (success) {
      // Refresh user profile data
      await loadUserData();
      setIsEditingUsername(false);
      setNewUsername('');
    }
  };

  const getMoodEmoji = (mood: number) => {
    if (mood <= 2) return '😢';
    if (mood <= 4) return '😐';
    if (mood <= 6) return '😊';
    if (mood <= 8) return '😄';
    return '🤩';
  };

  const canUpdateMoodToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return lastMoodUpdate !== today;
  };

  const handleMoodUpdate = async (newMood: number) => {
    if (!user || !userProfile) return;

    try {
      const newEmoji = getMoodEmoji(newMood);
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('profiles')
        .update({ 
          daily_mood: newMood,
          mood_emoji: newEmoji,
          last_mood_update: today
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setDailyMood(newMood);
      setMoodEmoji(newEmoji);
      setLastMoodUpdate(today);
      setUserProfile({ 
        ...userProfile, 
        daily_mood: newMood, 
        mood_emoji: newEmoji,
        last_mood_update: today
      });
      setIsEditingMood(false);

      toast({
        title: "Daily Mood Updated",
        description: `Your mood has been set to ${newEmoji}`,
      });
    } catch (error) {
      console.error('Error updating mood:', error);
      toast({
        title: "Error",
        description: "Failed to update your mood. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleMoodDisplay = async () => {
    if (!user || !userProfile) return;

    try {
      const newShowMoodEmoji = !showMoodEmoji;

      const { error } = await supabase
        .from('profiles')
        .update({ show_mood_emoji: newShowMoodEmoji })
        .eq('user_id', user.id);

      if (error) throw error;

      setShowMoodEmoji(newShowMoodEmoji);
      setUserProfile({ ...userProfile, show_mood_emoji: newShowMoodEmoji });

      toast({
        title: showMoodEmoji ? "Mood Hidden" : "Mood Visible",
        description: showMoodEmoji 
          ? "Your mood emoji is now hidden from others." 
          : "Your mood emoji will now be visible next to your name.",
      });
    } catch (error) {
      console.error('Error updating mood display:', error);
      toast({
        title: "Error",
        description: "Failed to update mood display settings.",
        variant: "destructive",
      });
    }
  };

  const getKarmaLevel = (points: number) => {
    if (points >= 1000) return { level: 'Legend', icon: '👑', color: 'bg-gradient-to-r from-yellow-400 to-orange-500' };
    if (points >= 500) return { level: 'Expert', icon: '⭐', color: 'bg-gradient-to-r from-blue-400 to-purple-500' };
    if (points >= 100) return { level: 'Rising', icon: '🔥', color: 'bg-gradient-to-r from-green-400 to-blue-500' };
    return { level: 'Newcomer', icon: '🌱', color: 'bg-gradient-to-r from-gray-400 to-gray-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No profile found. Please complete onboarding first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use enhanced karma if available, fallback to old system
  const karmaInfo = karmaProgress 
    ? karmaProgress.currentLevel 
    : getKarmaLevel(engagement?.achievement_points || 0);
  const reconnectCount = privateChats?.length || 0;

  return (
    <div className={`min-h-screen bg-background p-4 ${className}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Home Navigation Button */}
        <div className="flex justify-start">
          <Button 
            variant="outline" 
            onClick={onGoHome || (() => console.log('Go home clicked'))}
            className="flex items-center gap-2 hover-scale"
          >
            <Home className="w-4 h-4" />
            Home
          </Button>
        </div>
        
        {/* Header Card */}
        <Card className="overflow-hidden">
          <div className={`h-24 ${karmaInfo.color}`}></div>
          <CardContent className="p-6 -mt-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-card rounded-full border-4 border-background flex items-center justify-center text-3xl mb-4">
                {userProfile.username?.charAt(0)?.toUpperCase() || '?'}
              </div>
              
              <h1 className="text-2xl font-bold text-card-foreground mb-2 flex items-center gap-2">
                {userProfile.username}
                <Dialog open={isEditingUsername} onOpenChange={setIsEditingUsername}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      disabled={!canChangeUsername}
                      onClick={() => setNewUsername(userProfile.username)}
                    >
                      <User className="w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Username</DialogTitle>
                      <DialogDescription>
                        {isFirstTime 
                          ? "This is your one-time username change opportunity."
                          : usernamePremium
                            ? "Premium users can change their username once per month."
                            : "You've already used your username change."
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter new username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        maxLength={20}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditingUsername(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUsernameChange}>
                          Change Username
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </h1>
              
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span className="text-lg">{karmaInfo.icon}</span>
                  {karmaInfo.level}
                </Badge>
                {isPremium && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Premium
                  </Badge>
                )}
              </div>

              {currentGroup && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Active in: <strong>{currentGroup.name}</strong> {currentGroup.vibe_label}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Karma Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Your Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {karmaProgress?.totalPoints || engagement?.achievement_points || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Karma</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {engagement?.daily_streak || 0}
              </div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {enhancedAchievements?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Achievements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {engagement?.messages_sent_today || 0}
              </div>
              <div className="text-sm text-muted-foreground">Messages Today</div>
            </div>
          </CardContent>
        </Card>

        {/* Karma Progress Card */}
        {karmaProgress && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Karma Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white ${karmaProgress.currentLevel.color}`}>
                    {karmaProgress.currentLevel.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{karmaProgress.currentLevel.level}</h3>
                    <p className="text-sm text-muted-foreground">{karmaProgress.totalPoints} points</p>
                  </div>
                </div>
                {karmaProgress.nextLevel && (
                  <div className="text-right">
                    <p className="text-sm font-medium">{karmaProgress.pointsToNext} to go</p>
                    <p className="text-xs text-muted-foreground">Next: {karmaProgress.nextLevel.level}</p>
                  </div>
                )}
              </div>
              
              {karmaProgress.nextLevel && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{karmaProgress.currentLevel.level}</span>
                    <span>{karmaProgress.nextLevel.level}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${karmaProgress.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    {Math.round(karmaProgress.progress)}% complete
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Profile Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="karma">
              <Trophy className="w-4 h-4 mr-2" />
              Karma
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Daily Mood Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Smile className="w-5 h-5" />
                Daily Mood
              </CardTitle>
              <Dialog open={isEditingMood} onOpenChange={setIsEditingMood}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Update
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Your Daily Mood</DialogTitle>
                    <DialogDescription>
                      How are you feeling right now? You can update this anytime.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-6xl mb-4">{getMoodEmoji(dailyMood)}</div>
                      <div className="text-xl font-semibold mb-2">
                        {dailyMood <= 2 ? 'Low Energy' :
                         dailyMood <= 4 ? 'Mellow' :
                         dailyMood <= 6 ? 'Good' :
                         dailyMood <= 8 ? 'Great' : 'Amazing!'}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Slider
                        value={[dailyMood]}
                        onValueChange={(value) => setDailyMood(value[0])}
                        max={10}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>😢 Low</span>
                        <span className="font-medium text-foreground">
                          {dailyMood}/10
                        </span>
                        <span>🤩 Amazing</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsEditingMood(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => handleMoodUpdate(dailyMood)}>
                        Update Mood
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{moodEmoji}</span>
                  <div>
                    <div className="font-medium">
                      {dailyMood <= 2 ? 'Low Energy' :
                       dailyMood <= 4 ? 'Mellow' :
                       dailyMood <= 6 ? 'Good' :
                       dailyMood <= 8 ? 'Great' : 'Amazing!'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {lastMoodUpdate ? `Last updated: ${new Date(lastMoodUpdate).toLocaleDateString()}` : 'Not set yet'}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">{dailyMood}/10</Badge>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Show mood emoji next to name</div>
                  <div className="text-xs text-muted-foreground">
                    Others will see your mood emoji when you send messages
                  </div>
                </div>
                <Switch
                  checked={showMoodEmoji}
                  onCheckedChange={handleToggleMoodDisplay}
                />
              </div>
              
              {showMoodEmoji && (
                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Preview:</div>
                  <div className="font-medium">
                    {userProfile.username} {moodEmoji}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>


        {/* Vibe Tags Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Your Vibe Tags
              </CardTitle>
              <Dialog open={isEditingTags} onOpenChange={setIsEditingTags}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Your Vibe Tags</DialogTitle>
                    <DialogDescription>
                      Add up to 5 tags that represent your interests and vibes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {editedTags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 w-4 h-4 ml-1"
                            onClick={() => removeTag(tag)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    {editedTags.length < 5 && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a vibe tag..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        />
                        <Button onClick={addTag}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsEditingTags(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveTags}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {userProfile.genres?.length > 0 ? (
                userProfile.genres.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  No vibe tags set. Click Edit to add some!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                // For now, show a toast about DM functionality
                toast({
                  title: "Direct Messaging",
                  description: "Use the DM button in your group chat to send direct messages to group members.",
                });
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              Direct Messaging Info
            </Button>
            
            {!isPremium && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Upgrade to Premium</h4>
                  <p className="text-xs text-muted-foreground">
                    Unlock unlimited group switches, direct messaging, and more!
                  </p>
                  <Button 
                    className="w-full"
                    onClick={() => setShowPremiumUpgrade(true)}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </Button>
                </div>
              </>
            )}

            {isPremium && premium && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    Premium Active
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {premium.subscription_end ? 
                      `Renews on ${new Date(premium.subscription_end).toLocaleDateString()}` :
                      'Active subscription'
                    }
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        {currentGroup && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Group:</span>
                  <span className="font-medium">{currentGroup.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="font-medium">
                    {new Date(currentGroup.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vibe:</span>
                  <span className="font-medium">{currentGroup.vibe_label}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          {/* Karma Tab */}
          <TabsContent value="karma" className="mt-6">
            <KarmaDashboard />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Settings
                </CardTitle>
                <CardDescription>
                  Manage your account preferences and privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Show Online Status</h4>
                    <p className="text-sm text-muted-foreground">Let others see when you're online</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Public Profile</h4>
                    <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-destructive/20 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium text-destructive">Delete Account</h4>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={accountLoading}
                        className="ml-4"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Delete Account
                  </DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-destructive/10 rounded-lg">
                    <h4 className="font-medium text-destructive mb-2">What will be deleted:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Your profile and account information</li>
                      <li>• All your messages and chat history</li>
                      <li>• Your karma points and achievements</li>
                      <li>• Any premium features and subscriptions</li>
                      <li>• All associated data and preferences</li>
                    </ul>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const result = await deleteAccount();
                        if (result.success) {
                          setShowDeleteConfirm(false);
                          // Small delay to ensure signOut completes before navigation
                          setTimeout(() => {
                            if (onGoHome) {
                              onGoHome();
                            }
                          }, 500);
                        }
                      }}
                      disabled={accountLoading}
                      className="flex-1"
                    >
                      {accountLoading ? "Deleting..." : "Delete Account"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>

      {/* Premium Upgrade Modal */}
      <Dialog open={showPremiumUpgrade} onOpenChange={setShowPremiumUpgrade}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <PremiumUpgrade onClose={() => setShowPremiumUpgrade(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};