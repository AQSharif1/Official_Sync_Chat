import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserMoodInfo {
  userId: string;
  moodEmoji: string | null;
  showMoodEmoji: boolean;
}

export const useUserMood = () => {
  const [userMoodCache, setUserMoodCache] = useState<Map<string, UserMoodInfo>>(new Map());

  const getUserMoodInfo = async (userId: string): Promise<UserMoodInfo> => {
    // Check cache first
    if (userMoodCache.has(userId)) {
      return userMoodCache.get(userId)!;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('mood_emoji, show_mood_emoji')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const moodInfo: UserMoodInfo = {
        userId,
        moodEmoji: data.mood_emoji || null,
        showMoodEmoji: data.show_mood_emoji || false
      };

      // Cache the result
      setUserMoodCache(prev => new Map(prev).set(userId, moodInfo));
      
      return moodInfo;
    } catch (error) {
      console.error('Error fetching user mood info:', error);
      const fallbackInfo: UserMoodInfo = {
        userId,
        moodEmoji: null,
        showMoodEmoji: false
      };
      
      // Cache the fallback
      setUserMoodCache(prev => new Map(prev).set(userId, fallbackInfo));
      
      return fallbackInfo;
    }
  };

  const getUserDisplayName = async (username: string, userId: string): Promise<string> => {
    const moodInfo = await getUserMoodInfo(userId);
    
    if (moodInfo.showMoodEmoji && moodInfo.moodEmoji) {
      return `${username} ${moodInfo.moodEmoji}`;
    }
    
    return username;
  };

  const clearCache = () => {
    setUserMoodCache(new Map());
  };

  return {
    getUserMoodInfo,
    getUserDisplayName,
    clearCache
  };
};