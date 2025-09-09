import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface Achievement {
  id: string;
  achievement_type: string;
  achievement_title: string;
  achievement_description: string;
  badge_icon: string;
  points: number;
  unlocked_at: Date;
}

export interface EngagementData {
  daily_streak: number;
  messages_sent_today: number;
  reactions_given_today: number;
  tools_used_today: number;
  group_switches_used_today: number;
  reconnects_used_today: number;
  achievement_points: number;
  karma_level: string;
  total_karma_points: number;
  monthly_karma_points: number;
  last_active: Date;
  is_premium: boolean;
}

export const useEngagement = () => {
  const { user } = useAuth();
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEngagementData();
      fetchAchievements();
    }
  }, [user]);

  const fetchEngagementData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('engagement_metrics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching engagement:', error);
        return;
      }

      if (data) {
        const engagementData = data as any;
        setEngagement({
          daily_streak: engagementData.daily_streak,
          messages_sent_today: engagementData.messages_sent_today,
          reactions_given_today: engagementData.reactions_given_today,
          tools_used_today: engagementData.tools_used_today,
          group_switches_used_today: engagementData.group_switches_used_today || 0,
          reconnects_used_today: engagementData.reconnects_used_today || 0,
          achievement_points: engagementData.achievement_points || engagementData.total_karma_points || 0,
          last_active: new Date(engagementData.last_active),
          is_premium: engagementData.is_premium || false,
          karma_level: engagementData.karma_level || 'Newcomer',
          total_karma_points: engagementData.total_karma_points || 0,
          monthly_karma_points: engagementData.monthly_karma_points || 0
        });
      } else {
        // No engagement data found, set defaults
        setEngagement({
          daily_streak: 0,
          messages_sent_today: 0,
          reactions_given_today: 0,
          tools_used_today: 0,
          group_switches_used_today: 0,
          reconnects_used_today: 0,
          achievement_points: 0,
          last_active: new Date(),
          is_premium: false,
          karma_level: 'Newcomer',
          total_karma_points: 0,
          monthly_karma_points: 0
        });
      }
    } catch (error) {
      console.error('Error fetching engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_achievements' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) {
        console.error('Error fetching achievements:', error);
        return;
      }

      setAchievements(data?.map((achievement: any) => ({
        id: achievement.id,
        achievement_type: achievement.achievement_type,
        achievement_title: achievement.achievement_title,
        achievement_description: achievement.achievement_description,
        badge_icon: achievement.badge_icon,
        points: achievement.points,
        unlocked_at: new Date(achievement.unlocked_at)
      })) || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const trackActivity = async (activityType: 'message' | 'reaction' | 'tool' | 'group_switch' | 'reconnect' | 'voice_note' | 'voice_participation' | 'game_win' | 'game_participation' | 'daily_login' | 'streak_bonus') => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('update_user_engagement', {
        p_user_id: user.id,
        p_activity_type: activityType
      });

      if (error) {
        console.error('Error tracking activity:', error);
        return;
      }

      // Refresh data after tracking
      await fetchEngagementData();
      await fetchAchievements();
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  const trackKarmaActivity = async (groupId: string, activityType: string, points: number = 1, description: string = '', multiplier: number = 1.0) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('track_karma_activity', {
        p_user_id: user.id,
        p_group_id: groupId,
        p_activity_type: activityType,
        p_points: points,
        p_description: description,
        p_multiplier: multiplier
      });

      if (error) {
        console.error('Error tracking karma activity:', error);
        return;
      }

      // Refresh data after tracking
      await fetchEngagementData();
      await fetchAchievements();
    } catch (error) {
      console.error('Error tracking karma activity:', error);
    }
  };

  return {
    engagement,
    achievements,
    loading,
    trackActivity,
    trackKarmaActivity,
    refresh: () => {
      fetchEngagementData();
      fetchAchievements();
    }
  };
};