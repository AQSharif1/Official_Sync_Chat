// Game Timer Manager - Phase 2 manual game control
// Max 100 lines per constraint requirements

export interface ActiveGameState {
  gameType: 'thisorthat' | 'emojiriddle' | 'twoTruths';
  gameId: string;
  roundEndsAt: Date;
  duration: number; // minutes
}

interface GameTimerCallbacks {
  onTimeEnd: () => void;
  onTick?: (remaining: number) => void;
}

class GameTimerManager {
  private activeGame: ActiveGameState | null = null;
  private timer: NodeJS.Timeout | null = null;
  private callbacks: GameTimerCallbacks | null = null;
  private storageKey = 'activeGameState';

  constructor() {
    // Listen for storage changes to sync across tabs
    window.addEventListener('storage', this.handleStorageChange);
    
    // Listen for visibility changes to cleanup on tab switch
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Load any existing active game on init
    this.loadActiveGame();
  }

  private handleStorageChange = (e: StorageEvent) => {
    if (e.key === this.storageKey) {
      // Another tab changed the active game state
      if (!e.newValue && this.activeGame) {
        // Game was ended in another tab
        this.clearActiveGame();
      }
    }
  };

  private handleVisibilityChange = () => {
    if (document.hidden && this.activeGame) {
      // Tab became hidden, persist state but clear timer
      this.saveActiveGame();
      this.clearTimer();
    } else if (!document.hidden && this.activeGame) {
      // Tab became visible, restart timer if game still active
      this.startTimer();
    }
  };

  private saveActiveGame() {
    if (this.activeGame) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.activeGame));
    }
  }

  private loadActiveGame() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const game = JSON.parse(stored);
        // Check if game is still valid (not expired)
        if (new Date(game.roundEndsAt) > new Date()) {
          this.activeGame = {
            ...game,
            roundEndsAt: new Date(game.roundEndsAt)
          };
        } else {
          this.clearActiveGame();
        }
      }
    } catch (error) {
      console.warn('Failed to load active game:', error);
      this.clearActiveGame();
    }
  }

  private clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private startTimer() {
    if (!this.activeGame || !this.callbacks) return;

    this.clearTimer();
    
    this.timer = setInterval(() => {
      if (!this.activeGame) return;
      
      const now = new Date();
      const remaining = Math.max(0, this.activeGame.roundEndsAt.getTime() - now.getTime());
      
      if (remaining <= 0) {
        this.callbacks?.onTimeEnd();
        this.clearActiveGame();
      } else {
        this.callbacks?.onTick?.(remaining);
      }
    }, 1000);
  }

  startGame(gameType: ActiveGameState['gameType'], gameId: string, duration: number, callbacks: GameTimerCallbacks): boolean {
    // Check if another game is already active
    if (this.activeGame) {
      return false;
    }

    const roundEndsAt = new Date(Date.now() + duration * 60 * 1000);
    
    this.activeGame = {
      gameType,
      gameId,
      roundEndsAt,
      duration
    };

    this.callbacks = callbacks;
    this.saveActiveGame();
    this.startTimer();
    
    return true;
  }

  endGame(): void {
    this.clearActiveGame();
  }

  private clearActiveGame() {
    this.clearTimer();
    this.activeGame = null;
    this.callbacks = null;
    localStorage.removeItem(this.storageKey);
  }

  getActiveGame(): ActiveGameState | null {
    return this.activeGame;
  }

  getRemainingTime(): number {
    if (!this.activeGame) return 0;
    return Math.max(0, this.activeGame.roundEndsAt.getTime() - Date.now());
  }

  cleanup() {
    this.clearActiveGame();
    window.removeEventListener('storage', this.handleStorageChange);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

// Singleton instance
export const gameTimerManager = new GameTimerManager();