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
        .from('user_engagement' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
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
          achievement_points: engagementData.achievement_points,
          last_active: new Date(engagementData.last_active),
          is_premium: engagementData.is_premium || false
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

  const trackActivity = async (activityType: 'message' | 'reaction' | 'tool' | 'group_switch' | 'reconnect') => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('update_user_engagement' as any, {
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

  return {
    engagement,
    achievements,
    loading,
    trackActivity,
    refresh: () => {
      fetchEngagementData();
      fetchAchievements();
    }
  };
};