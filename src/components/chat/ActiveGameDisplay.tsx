import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, X, Gamepad2 } from 'lucide-react';
import { ActiveGameState } from '@/utils/gameTimerManager';

interface ActiveGameDisplayProps {
  game: ActiveGameState;
  onExit: () => void;
  currentUserId: string;
  currentUsername: string;
}

const gameTypeInfo = {
  'thisorthat': {
    title: 'This or That',
    icon: '⚖️',
    color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
  },
  'emojiriddle': {
    title: 'Emoji Riddle',
    icon: '🧩',
    color: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
  },
  'twoTruths': {
    title: 'Two Truths & a Lie',
    icon: '🎭',
    color: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800'
  }
};

export const ActiveGameDisplay = ({ game, onExit, currentUserId, currentUsername }: ActiveGameDisplayProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isParticipating, setIsParticipating] = useState(true);

  const gameInfo = gameTypeInfo[game.gameType] || gameTypeInfo.thisorthat;

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const timeRemaining = game.roundEndsAt.getTime() - now.getTime();
      
      if (timeRemaining <= 0) {
        setTimeLeft('Game Ended');
        return;
      }

      const minutes = Math.floor(timeRemaining / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [game.roundEndsAt]);

  const handleExit = () => {
    setIsParticipating(false);
    onExit();
  };

  if (!isParticipating) {
    return null;
  }

  return (
    <Card className={`${gameInfo.color} border-2 mb-4`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{gameInfo.icon}</span>
            <div>
              <CardTitle className="text-lg">{gameInfo.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Active Game Session
              </p>
            </div>
          </div>
          <Button
            onClick={handleExit}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{timeLeft}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Group Game</span>
            </div>
          </div>
          
          <Badge variant="secondary" className="flex items-center gap-1">
            <Gamepad2 className="w-3 h-3" />
            Active
          </Badge>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Game is in progress! Participate in the chat or wait for the next round.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleExit} 
            variant="outline" 
            size="sm"
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Leave Game
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
