import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEnhancedKarma } from '@/hooks/useEnhancedKarma';
import { cn } from '@/lib/utils';

interface KarmaIndicatorProps {
  variant?: 'minimal' | 'compact' | 'detailed';
  showProgress?: boolean;
  className?: string;
}

export const KarmaIndicator: React.FC<KarmaIndicatorProps> = ({
  variant = 'minimal',
  showProgress = false,
  className
}) => {
  const { karmaProgress, loading } = useEnhancedKarma();

  if (loading || !karmaProgress) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-6 w-16 bg-muted rounded"></div>
      </div>
    );
  }

  const { currentLevel, totalPoints, progress, pointsToNext } = karmaProgress;

  if (variant === 'minimal') {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs font-medium cursor-help transition-all duration-200 hover:scale-105",
              currentLevel.color,
              "text-white border-0",
              className
            )}
          >
            <span className="mr-1">{currentLevel.icon}</span>
            {currentLevel.level}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-semibold">{currentLevel.level}</p>
            <p className="text-sm text-muted-foreground">{totalPoints} karma points</p>
            {pointsToNext > 0 && (
              <p className="text-xs text-muted-foreground">
                {pointsToNext} points to next level
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Badge 
          variant="secondary" 
          className={cn(
            "text-xs font-medium",
            currentLevel.color,
            "text-white border-0"
          )}
        >
          <span className="mr-1">{currentLevel.icon}</span>
          {currentLevel.level}
        </Badge>
        <span className="text-sm text-muted-foreground">{totalPoints}</span>
        {showProgress && pointsToNext > 0 && (
          <div className="flex-1 min-w-0">
            <Progress value={progress} className="h-1" />
          </div>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge 
            variant="secondary" 
            className={cn(
              "text-sm font-medium",
              currentLevel.color,
              "text-white border-0"
            )}
          >
            <span className="mr-1">{currentLevel.icon}</span>
            {currentLevel.level}
          </Badge>
          <span className="text-sm font-semibold">{totalPoints} points</span>
        </div>
        {pointsToNext > 0 && (
          <span className="text-xs text-muted-foreground">
            {pointsToNext} to next level
          </span>
        )}
      </div>
      
      {showProgress && pointsToNext > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}% to {karmaProgress.nextLevel?.level}
          </p>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        {currentLevel.description}
      </p>
    </div>
  );
};

// Floating karma notification for recent activity
interface KarmaFloatingNotificationProps {
  points: number;
  description: string;
  multiplier?: number;
  onClose: () => void;
}

export const KarmaFloatingNotification: React.FC<KarmaFloatingNotificationProps> = ({
  points,
  description,
  multiplier,
  onClose
}) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-4 duration-300">
      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <span className="text-lg">⭐</span>
        <div>
          <p className="text-sm font-medium">
            +{points} karma
            {multiplier && multiplier > 1 && (
              <span className="ml-1 text-yellow-300">×{multiplier}</span>
            )}
          </p>
          <p className="text-xs opacity-80">{description}</p>
        </div>
      </div>
    </div>
  );
};

// Subtle karma points display for messages
interface MessageKarmaProps {
  points: number;
  className?: string;
}

export const MessageKarma: React.FC<MessageKarmaProps> = ({ points, className }) => {
  if (points <= 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger>
        <span className={cn(
          "inline-flex items-center text-xs text-muted-foreground opacity-60 hover:opacity-100 transition-opacity",
          className
        )}>
          <span className="mr-1">⭐</span>
          +{points}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Karma earned from this activity</p>
      </TooltipContent>
    </Tooltip>
  );
};