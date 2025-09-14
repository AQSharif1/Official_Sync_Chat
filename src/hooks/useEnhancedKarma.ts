import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEngagement } from './useEngagement';

// Enhanced karma level system with more detailed progression
export interface KarmaLevel {
  level: string;
  icon: string;
  color: string;
  minPoints: number;
  maxPoints: number;
  benefits: string[];
  description: string;
}

export interface KarmaProgressInfo {
  currentLevel: KarmaLevel;
  nextLevel: KarmaLevel | null;
  progress: number; // 0-100
  pointsToNext: number;
  totalPoints: number;
}

export interface EnhancedAchievement {
  id: string;
  achievement_type: string;
  achievement_title: string;
  achievement_description: string;
  badge_icon: string;
  points: number;
  unlocked_at: Date;
  category: 'social' | 'engagement' | 'loyalty' | 'gaming' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface KarmaActivity {
  type: 'message' | 'reaction' | 'voice' | 'game' | 'achievement';
  points: number;
  description: string;
  timestamp: Date;
  multiplier?: number;
}

// Enhanced karma levels with more progression tiers
export const KARMA_LEVELS: KarmaLevel[] = [
  {
    level: 'Newcomer',
    icon: '🌱',
    color: 'bg-gradient-to-r from-gray-400 to-gray-600',
    minPoints: 0,
    maxPoints: 49,
    benefits: ['Basic chat features'],
    description: 'Welcome to SyncChat! Start your journey here.'
  },
  {
    level: 'Explorer',
    icon: '🗺️',
    color: 'bg-gradient-to-r from-blue-400 to-blue-600',
    minPoints: 50,
    maxPoints: 99,
    benefits: ['Basic chat features', 'Custom reactions'],
    description: 'You\'re exploring SyncChat and making connections!'
  },
  {
    level: 'Rising',
    icon: '🔥',
    color: 'bg-gradient-to-r from-green-400 to-blue-500',
    minPoints: 100,
    maxPoints: 249,
    benefits: ['Custom reactions', 'Voice room priority', 'Special badges'],
    description: 'You\'re becoming an active community member!'
  },
  {
    level: 'Champion',
    icon: '⚡',
    color: 'bg-gradient-to-r from-purple-400 to-pink-500',
    minPoints: 250,
    maxPoints: 499,
    benefits: ['Voice priority', 'Game hosting', 'Profile themes'],
    description: 'A true champion of community engagement!'
  },
  {
    level: 'Expert',
    icon: '⭐',
    color: 'bg-gradient-to-r from-blue-400 to-purple-500',
    minPoints: 500,
    maxPoints: 999,
    benefits: ['Game hosting', 'Profile themes', 'Exclusive features'],
    description: 'An expert with deep community involvement!'
  },
  {
    level: 'Legend',
    icon: '👑',
    color: 'bg-gradient-to-r from-yellow-400 to-orange-500',
    minPoints: 1000,
    maxPoints: 2499,
    benefits: ['All features', 'Legend status', 'Group influence'],
    description: 'A legendary figure in the SyncChat community!'
  },
  {
    level: 'Mythical',
    icon: '🌟',
    color: 'bg-gradient-to-r from-pink-500 to-violet-600',
    minPoints: 2500,
    maxPoints: Number.MAX_SAFE_INTEGER,
    benefits: ['Ultimate features', 'Mythical status', 'Community leadership'],
    description: 'The pinnacle of SyncChat achievement!'
  }
];

export const useEnhancedKarma = () => {
  const { user } = useAuth();
  const { engagement, achievements, trackActivity } = useEngagement();
  const [karmaProgress, setKarmaProgress] = useState<KarmaProgressInfo | null>(null);
  const [recentActivity, setRecentActivity] = useState<KarmaActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Get karma level for given points
  const getKarmaLevel = useCallback((points: number): KarmaLevel => {
    for (let i = KARMA_LEVELS.length - 1; i >= 0; i--) {
      if (points >= KARMA_LEVELS[i].minPoints) {
        return KARMA_LEVELS[i];
      }
    }
    return KARMA_LEVELS[0];
  }, []);

  // Calculate karma progress information
  const calculateKarmaProgress = useCallback((points: number): KarmaProgressInfo => {
    const currentLevel = getKarmaLevel(points);
    const currentLevelIndex = KARMA_LEVELS.findIndex(level => level.level === currentLevel.level);
    const nextLevel = currentLevelIndex < KARMA_LEVELS.length - 1 ? KARMA_LEVELS[currentLevelIndex + 1] : null;
    
    const progress = nextLevel 
      ? ((points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100
      : 100;
    
    const pointsToNext = nextLevel ? nextLevel.minPoints - points : 0;

    return {
      currentLevel,
      nextLevel,
      progress: Math.min(100, Math.max(0, progress)),
      pointsToNext: Math.max(0, pointsToNext),
      totalPoints: points
    };
  }, [getKarmaLevel]);

  // Enhanced achievement categorization
  const categorizeAchievements = useCallback((achievements: any[]): EnhancedAchievement[] => {
    return achievements.map(achievement => {
      let category: EnhancedAchievement['category'] = 'engagement';
      let rarity: EnhancedAchievement['rarity'] = 'common';

      // Categorize by type
      if (achievement.achievement_type.includes('social') || achievement.achievement_type.includes('reaction')) {
        category = 'social';
      } else if (achievement.achievement_type.includes('streak') || achievement.achievement_type.includes('message')) {
        category = 'engagement';
      } else if (achievement.achievement_type.includes('loyalty') || achievement.achievement_type.includes('group')) {
        category = 'loyalty';
      } else if (achievement.achievement_type.includes('game') || achievement.achievement_type.includes('voice')) {
        category = 'gaming';
      }

      // Determine rarity by points
      if (achievement.points >= 200) {
        rarity = 'legendary';
      } else if (achievement.points >= 100) {
        rarity = 'epic';
      } else if (achievement.points >= 50) {
        rarity = 'rare';
      }

      return {
        ...achievement,
        category,
        rarity
      };
    });
  }, []);

  // Track karma activity with detailed logging
  const trackKarmaActivity = useCallback(async (
    type: KarmaActivity['type'], 
    points: number, 
    description: string,
    multiplier?: number,
    groupId?: string
  ) => {
    if (!user) return;

    const activity: KarmaActivity = {
      type,
      points,
      description,
      timestamp: new Date(),
      multiplier
    };

    // Update local state immediately for UI responsiveness
    setRecentActivity(prev => [activity, ...prev.slice(0, 9)]); // Keep last 10 activities

    try {
      // Only save to database if we have a valid group_id
      if (groupId && groupId.trim() !== '') {
        const { error } = await supabase.rpc('track_karma_activity', {
          p_user_id: user.id,
          p_group_id: groupId,
          p_activity_type: type,
          p_points: points,
          p_description: description,
          p_multiplier: multiplier || 1.0
        });

        if (error) {
          console.error('Error tracking karma activity:', error);
        }
      } else {
        console.warn('Cannot track karma activity: no valid group_id provided', { groupId, type, points, description });
      }
    } catch (error) {
      console.error('Error tracking karma activity:', error);
    }

    // Track the activity using existing system
    if (type === 'message' || type === 'reaction') {
      await trackActivity(type as 'message' | 'reaction');
    }
  }, [trackActivity, user]);

  // Enhanced activity tracking with karma points calculation
  const trackEnhancedActivity = useCallback(async (activityType: 'message' | 'reaction' | 'tool' | 'voice' | 'game') => {
    if (!user || !engagement) return;

    let basePoints = 0;
    let description = '';
    let karmaType: KarmaActivity['type'] = activityType;

    switch (activityType) {
      case 'message':
        basePoints = 2;
        description = 'Sent a message';
        break;
      case 'reaction':
        basePoints = 1;
        description = 'Gave a reaction';
        break;
      case 'voice':
        basePoints = 5;
        description = 'Joined voice room';
        karmaType = 'voice';
        break;
      case 'game':
        basePoints = 3;
        description = 'Participated in game';
        karmaType = 'game';
        break;
      case 'tool':
        basePoints = 1;
        description = 'Used chat tool';
        break;
    }

    // Apply premium multiplier if user is premium
    const multiplier = engagement.is_premium ? 2 : 1;
    const finalPoints = basePoints * multiplier;

    // Note: trackKarmaActivity requires group context, so we only call trackActivity here
    // Specific karma tracking should be done in components that have group context
    
    // Call original tracking function
    await trackActivity(activityType);
  }, [user, engagement, trackKarmaActivity, trackActivity]);

  // Fetch recent karma activities from database
  const fetchRecentActivities = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('karma_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const activities: KarmaActivity[] = data?.map(item => ({
        type: item.activity_type as KarmaActivity['type'],
        points: item.points_earned,
        description: item.description,
        timestamp: new Date(item.created_at),
        multiplier: item.multiplier
      })) || [];

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  }, [user]);

  // Update karma progress when engagement data changes
  useEffect(() => {
    if (engagement) {
      const progress = calculateKarmaProgress(engagement.achievement_points || 0);
      setKarmaProgress(progress);
      setLoading(false);
    }
  }, [engagement, calculateKarmaProgress]);

  // Load recent activities on mount
  useEffect(() => {
    if (user) {
      fetchRecentActivities();
    }
  }, [user, fetchRecentActivities]);

  // Get achievements with enhanced categorization
  const enhancedAchievements = achievements ? categorizeAchievements(achievements) : [];

  // Get karma benefits for current level
  const getCurrentBenefits = useCallback((): string[] => {
    if (!karmaProgress) return [];
    return karmaProgress.currentLevel.benefits;
  }, [karmaProgress]);

  // Check if user has specific karma level
  const hasKarmaLevel = useCallback((levelName: string): boolean => {
    if (!karmaProgress) return false;
    const targetLevel = KARMA_LEVELS.find(level => level.level === levelName);
    if (!targetLevel) return false;
    return karmaProgress.totalPoints >= targetLevel.minPoints;
  }, [karmaProgress]);

  // Get estimated time to next level (based on recent activity)
  const getEstimatedTimeToNextLevel = useCallback((): string => {
    if (!karmaProgress || !karmaProgress.nextLevel || karmaProgress.pointsToNext === 0) {
      return 'Max level reached!';
    }

    // Calculate average points per day from recent activity
    const recentPoints = recentActivity
      .filter(activity => activity.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .reduce((sum, activity) => sum + activity.points, 0);
    
    const avgPointsPerDay = recentPoints / 7;
    
    if (avgPointsPerDay <= 0) {
      return 'Keep being active to level up!';
    }

    const daysToNext = Math.ceil(karmaProgress.pointsToNext / avgPointsPerDay);
    
    if (daysToNext <= 1) return 'Less than a day';
    if (daysToNext <= 7) return `${daysToNext} days`;
    if (daysToNext <= 30) return `${Math.ceil(daysToNext / 7)} weeks`;
    return `${Math.ceil(daysToNext / 30)} months`;
  }, [karmaProgress, recentActivity]);

  return {
    // Core data
    karmaProgress,
    enhancedAchievements,
    recentActivity,
    loading,

    // Utility functions
    getKarmaLevel,
    calculateKarmaProgress,
    getCurrentBenefits,
    hasKarmaLevel,
    getEstimatedTimeToNextLevel,

    // Activity tracking
    trackEnhancedActivity,
    trackKarmaActivity,
    fetchRecentActivities,

    // Constants
    KARMA_LEVELS
  };
};