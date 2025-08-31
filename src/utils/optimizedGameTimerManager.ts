// Optimized Game Timer Manager with performance improvements
// Reduces re-renders and improves game smoothness

export interface ActiveGameState {
  gameType: 'thisorthat' | 'emojiriddle' | 'twoTruths';
  gameId: string;
  roundEndsAt: Date;
  duration: number; // minutes
}

interface GameTimerCallbacks {
  onTimeEnd: () => void;
  onTick?: (remaining: number) => void;
  onWarning?: (remaining: number) => void; // New: warning callback
}

interface TimerState {
  isActive: boolean;
  remainingTime: number;
  lastUpdate: number;
}

class OptimizedGameTimerManager {
  private activeGame: ActiveGameState | null = null;
  private timer: NodeJS.Timeout | null = null;
  private callbacks: GameTimerCallbacks | null = null;
  private storageKey = 'activeGameState';
  private state: TimerState = {
    isActive: false,
    remainingTime: 0,
    lastUpdate: Date.now(),
  };
  private updateInterval = 5000; // Update every 5 seconds instead of every second
  private warningThreshold = 30000; // 30 seconds warning
  private hasWarned = false;

  constructor() {
    // Listen for storage changes to sync across tabs
    window.addEventListener('storage', this.handleStorageChange);
    
    // Listen for visibility changes to optimize performance
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Load any existing active game on init
    this.loadActiveGame();
  }

  private handleStorageChange = (e: StorageEvent) => {
    if (e.key === this.storageKey) {
      if (!e.newValue && this.activeGame) {
        this.clearActiveGame();
      }
    }
  };

  private handleVisibilityChange = () => {
    if (document.hidden && this.activeGame) {
      // Tab became hidden, persist state but clear timer
      this.saveActiveGame();
      this.clearTimer();
    } else if (!document.hidden && this.activeGame && this.state.isActive) {
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
          this.updateState();
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

  private updateState() {
    if (!this.activeGame) {
      this.state = {
        isActive: false,
        remainingTime: 0,
        lastUpdate: Date.now(),
      };
      return;
    }

    const now = Date.now();
    const remaining = Math.max(0, this.activeGame.roundEndsAt.getTime() - now);
    
    this.state = {
      isActive: remaining > 0,
      remainingTime: remaining,
      lastUpdate: now,
    };

    // Check for warning threshold
    if (remaining <= this.warningThreshold && !this.hasWarned && this.callbacks?.onWarning) {
      this.hasWarned = true;
      this.callbacks.onWarning(remaining);
    }
  }

  private startTimer() {
    if (!this.activeGame || !this.callbacks) return;

    this.clearTimer();
    this.hasWarned = false;
    
    // Update state immediately
    this.updateState();
    
    // Start timer with optimized interval
    this.timer = setInterval(() => {
      if (!this.activeGame) return;
      
      this.updateState();
      
      // Call onTick callback with current remaining time
      if (this.callbacks?.onTick) {
        this.callbacks.onTick(this.state.remainingTime);
      }
      
      // Check if time is up
      if (this.state.remainingTime <= 0) {
        this.callbacks?.onTimeEnd();
        this.endGame();
      }
    }, this.updateInterval);
  }

  startGame(
    gameType: ActiveGameState['gameType'], 
    gameId: string, 
    duration: number, 
    callbacks: GameTimerCallbacks
  ): boolean {
    if (this.activeGame) {
      console.warn('Game already in progress');
      return false;
    }

    this.activeGame = {
      gameType,
      gameId,
      roundEndsAt: new Date(Date.now() + duration * 60 * 1000),
      duration,
    };

    this.callbacks = callbacks;
    this.hasWarned = false;
    
    this.saveActiveGame();
    this.startTimer();
    
    console.log(`Game started: ${gameType} for ${duration} minutes`);
    return true;
  }

  endGame(): void {
    this.clearTimer();
    this.clearActiveGame();
    this.callbacks = null;
    this.hasWarned = false;
    console.log('Game ended');
  }

  private clearActiveGame() {
    this.activeGame = null;
    this.state = {
      isActive: false,
      remainingTime: 0,
      lastUpdate: Date.now(),
    };
    localStorage.removeItem(this.storageKey);
  }

  getActiveGame(): ActiveGameState | null {
    return this.activeGame;
  }

  getRemainingTime(): number {
    if (!this.activeGame) return 0;
    
    // Calculate current remaining time
    const now = Date.now();
    return Math.max(0, this.activeGame.roundEndsAt.getTime() - now);
  }

  getState(): TimerState {
    return { ...this.state };
  }

  // Pause/resume functionality
  pauseGame(): void {
    if (this.activeGame && this.state.isActive) {
      this.clearTimer();
      this.state.isActive = false;
    }
  }

  resumeGame(): void {
    if (this.activeGame && !this.state.isActive) {
      this.state.isActive = true;
      this.startTimer();
    }
  }

  // Update callbacks
  updateCallbacks(callbacks: GameTimerCallbacks): void {
    this.callbacks = callbacks;
  }

  // Set custom update interval
  setUpdateInterval(interval: number): void {
    this.updateInterval = Math.max(1000, interval); // Minimum 1 second
    if (this.timer) {
      this.startTimer(); // Restart with new interval
    }
  }

  // Set warning threshold
  setWarningThreshold(threshold: number): void {
    this.warningThreshold = threshold;
  }

  cleanup() {
    this.clearTimer();
    this.clearActiveGame();
    this.callbacks = null;
    this.hasWarned = false;
    
    window.removeEventListener('storage', this.handleStorageChange);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

// Export singleton instance
export const optimizedGameTimerManager = new OptimizedGameTimerManager();

// Export for React components
export const useOptimizedGameTimer = () => {
  return {
    startGame: optimizedGameTimerManager.startGame.bind(optimizedGameTimerManager),
    endGame: optimizedGameTimerManager.endGame.bind(optimizedGameTimerManager),
    getActiveGame: optimizedGameTimerManager.getActiveGame.bind(optimizedGameTimerManager),
    getRemainingTime: optimizedGameTimerManager.getRemainingTime.bind(optimizedGameTimerManager),
    getState: optimizedGameTimerManager.getState.bind(optimizedGameTimerManager),
    pauseGame: optimizedGameTimerManager.pauseGame.bind(optimizedGameTimerManager),
    resumeGame: optimizedGameTimerManager.resumeGame.bind(optimizedGameTimerManager),
    updateCallbacks: optimizedGameTimerManager.updateCallbacks.bind(optimizedGameTimerManager),
    setUpdateInterval: optimizedGameTimerManager.setUpdateInterval.bind(optimizedGameTimerManager),
    setWarningThreshold: optimizedGameTimerManager.setWarningThreshold.bind(optimizedGameTimerManager),
  };
}; 