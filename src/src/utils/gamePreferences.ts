// Game Preferences utility for Phase 1 - Manual games only
// Max 100 lines per constraint requirements

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

const STORAGE_KEY = 'gamePrefs';

// Debounced localStorage writes to prevent jank (≥200ms)
let saveTimeout: NodeJS.Timeout | null = null;

export const saveGamePreferences = (prefs: GamePreferences): void => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.warn('Failed to save game preferences:', error);
    }
  }, 200);
};

export const loadGamePreferences = (): GamePreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_GAME_PREFERENCES;
    }
    
    const parsed = JSON.parse(stored);
    
    // Validate structure to prevent crashes
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_GAME_PREFERENCES;
    }
    
    // Ensure all required fields exist with safe defaults
    return {
      enabledGames: {
        thisOrThat: parsed.enabledGames?.thisOrThat ?? true,
        emojiRiddle: parsed.enabledGames?.emojiRiddle ?? true,
        twoTruths: parsed.enabledGames?.twoTruths ?? true,
      },
      gameDuration: Math.min(10, Math.max(1, parsed.gameDuration ?? 5)),
    };
  } catch (error) {
    console.warn('Failed to load game preferences, using defaults:', error);
    return DEFAULT_GAME_PREFERENCES;
  }
};

export const hasAnyGameEnabled = (prefs: GamePreferences): boolean => {
  return Object.values(prefs.enabledGames).some(enabled => enabled);
};

// Clear any potential timers on visibility change or navigation
export const clearGameTimers = (): void => {
  // Hook for clearing any game-related timers when tabs change, etc.
  // Implementation depends on specific timer management needs
};