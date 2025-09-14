import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Gamepad2, ArrowRight, RotateCcw, Clock, Users } from 'lucide-react';

interface GamePrompt {
  type: 'two-truths' | 'this-or-that' | 'emoji-riddle';
  title: string;
  content: string | string[];
  action: string;
}

const gamePrompts: GamePrompt[] = [
  {
    type: 'two-truths',
    title: 'Two Truths & a Lie',
    content: 'Share two true facts and one lie about yourself. Let others guess which is which!',
    action: 'Start Game'
  },
  {
    type: 'this-or-that',
    title: 'This or That',
    content: 'Quick choices: Pizza or Burgers? Summer or Winter? Books or Movies?',
    action: 'Ask Question'
  },
  {
    type: 'emoji-riddle',
    title: 'Emoji Riddle',
    content: 'Guess what movie, song, or phrase these emojis represent! 🎬🍿',
    action: 'Create Riddle'
  }
];

interface GameQuickPickerProps {
  onGameSelect: (gameType: string, duration?: number) => void;
  disabled?: boolean;
}

export const GameQuickPicker = ({ onGameSelect, disabled }: GameQuickPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GamePrompt | null>(null);
  const [gameDuration, setGameDuration] = useState(5); // Default 5 minutes
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const handleGameSelect = (game: GamePrompt) => {
    setSelectedGame(game);
    setShowDurationPicker(true);
  };

  const handleStartWithDuration = () => {
    if (!selectedGame) return;
    
    const gameTypeMap = {
      'two-truths': 'twoTruths',
      'this-or-that': 'thisorthat',
      'emoji-riddle': 'emojiriddle'
    };
    
    onGameSelect(gameTypeMap[selectedGame.type], gameDuration);
    setIsOpen(false);
    setSelectedGame(null);
    setShowDurationPicker(false);
  };

  const handleRetry = () => {
    if (selectedGame) {
      handleGameSelect(selectedGame);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="hover-scale"
      >
        <Gamepad2 className="w-4 h-4" />
      </Button>

      <ResponsiveModal
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsOpen(false);
            setSelectedGame(null);
            setShowDurationPicker(false);
          }
        }}
        title="Quick Games"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">Choose a Game</h2>
            <p className="text-sm text-muted-foreground">
              Fast, fun activities to energize your chat
            </p>
          </div>

          <div className="grid gap-3">
            {gamePrompts.map((game) => (
              <Card 
                key={game.type}
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] border-2 hover:border-primary/50"
                onClick={() => handleGameSelect(game)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {game.title}
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {game.content}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-primary font-medium">
                      {game.action}
                    </span>
                    <Button size="sm" variant="ghost" className="h-6 px-2">
                      Try →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {showDurationPicker && selectedGame && (
            <div className="pt-4 border-t space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-2">Game Settings</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure {selectedGame.title} duration
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Game Duration: {gameDuration} minute{gameDuration !== 1 ? 's' : ''}
                  </Label>
                  <Slider
                    value={[gameDuration]}
                    onValueChange={(value) => setGameDuration(value[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 min</span>
                    <span>10 min</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleStartWithDuration} 
                    className="flex-1"
                    disabled={disabled}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Start Game
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowDurationPicker(false);
                      setSelectedGame(null);
                    }} 
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Games start instantly and need no external setup
            </p>
          </div>
        </div>
      </ResponsiveModal>
    </>
  );
};