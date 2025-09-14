import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Clock, Users, Gamepad2, X } from 'lucide-react';

interface GameParticipationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onParticipate: () => void;
  onDecline: () => void;
  gameType: string;
  gameDuration: number;
  creatorUsername: string;
}

const gameTypeInfo = {
  'twoTruths': {
    title: 'Two Truths & a Lie',
    description: 'Share two true facts and one lie about yourself. Let others guess which is which!',
    icon: '🎭',
    color: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800'
  },
  'thisorthat': {
    title: 'This or That',
    description: 'Quick choices: Pizza or Burgers? Summer or Winter? Books or Movies?',
    icon: '⚖️',
    color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
  },
  'emojiriddle': {
    title: 'Emoji Riddle',
    description: 'Guess what movie, song, or phrase these emojis represent!',
    icon: '🧩',
    color: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
  }
};

export const GameParticipationDialog = ({
  isOpen,
  onClose,
  onParticipate,
  onDecline,
  gameType,
  gameDuration,
  creatorUsername
}: GameParticipationDialogProps) => {
  const gameInfo = gameTypeInfo[gameType as keyof typeof gameTypeInfo] || gameTypeInfo.twoTruths;

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={onClose}
      title=""
      className="max-w-md"
    >
      <Card className={`${gameInfo.color} border-2`}>
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-2">
            <span className="text-4xl">{gameInfo.icon}</span>
          </div>
          <CardTitle className="text-xl">{gameInfo.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {creatorUsername} wants to start a game!
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {gameInfo.description}
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{gameDuration} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Group Game</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={onParticipate} 
              className="w-full"
              size="lg"
            >
              <Gamepad2 className="w-4 h-4 mr-2" />
              Join Game
            </Button>
            
            <Button 
              onClick={onDecline} 
              variant="outline" 
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Maybe Later
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              You can leave the game anytime if you change your mind
            </p>
          </div>
        </CardContent>
      </Card>
    </ResponsiveModal>
  );
};
