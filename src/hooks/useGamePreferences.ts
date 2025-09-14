import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface GamePreferences {
  enabledGames: {
    thisOrThat: boolean;
    emojiRiddle: boolean;
    twoTruths: boolean;
  };
  gameDuration: number; // 1-10 minutes
}

export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  enabledGames: {
    thisOrThat: true,
    emojiRiddle: true,
    twoTruths: true,
  },
  gameDuration: 5, // Default 5 minutes
};

export const useGamePreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<GamePreferences>(DEFAULT_GAME_PREFERENCES);
  const [loading, setLoading] = useState(false);

  // Load preferences from database
  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_game_preferences')
        .select('enabled_games, game_duration')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          enabledGames: {
            thisOrThat: data.enabled_games.thisOrThat ?? true,
            emojiRiddle: data.enabled_games.emojiRiddle ?? true,
            twoTruths: data.enabled_games.twoTruths ?? true,
          },
          gameDuration: data.game_duration ?? 5
        });
      } else {
        // Create default preferences for new user
        await savePreferences(DEFAULT_GAME_PREFERENCES);
      }
    } catch (error) {
      console.error('Error loading game preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Save preferences to database
  const savePreferences = useCallback(async (newPreferences: GamePreferences) => {
    if (!user?.id) return false;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('user_game_preferences')
        .upsert({
          user_id: user.id,
          enabled_games: newPreferences.enabledGames,
          game_duration: newPreferences.gameDuration,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setPreferences(newPreferences);
      return true;
    } catch (error) {
      console.error('Error saving game preferences:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Update a specific preference
  const updatePreference = useCallback(async (key: keyof GamePreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    return await savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Update enabled games
  const updateEnabledGames = useCallback(async (gameType: keyof GamePreferences['enabledGames'], enabled: boolean) => {
    const newPreferences = {
      ...preferences,
      enabledGames: {
        ...preferences.enabledGames,
        [gameType]: enabled
      }
    };
    return await savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Update game duration
  const updateGameDuration = useCallback(async (duration: number) => {
    const clampedDuration = Math.min(10, Math.max(1, duration));
    return await updatePreference('gameDuration', clampedDuration);
  }, [updatePreference]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    savePreferences,
    updatePreference,
    updateEnabledGames,
    updateGameDuration,
    loadPreferences
  };
};

// Helper function to check if any games are enabled
export const hasAnyGameEnabled = (prefs: GamePreferences): boolean =>
  prefs.enabledGames.thisOrThat || prefs.enabledGames.emojiRiddle || prefs.enabledGames.twoTruths;

