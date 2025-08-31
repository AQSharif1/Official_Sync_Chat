import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Gamepad2, ArrowRight, RotateCcw } from 'lucide-react';

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
  onGameSelect: (gameType: string) => void;
  disabled?: boolean;
}

export const GameQuickPicker = ({ onGameSelect, disabled }: GameQuickPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GamePrompt | null>(null);

  const handleGameSelect = (game: GamePrompt) => {
    setSelectedGame(game);
    const gameTypeMap = {
      'two-truths': 'truthslie',
      'this-or-that': 'thisorthat',
      'emoji-riddle': 'emojiriddle'
    };
    
    onGameSelect(gameTypeMap[game.type]);
    setIsOpen(false);
    setSelectedGame(null);
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
        onOpenChange={setIsOpen}
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

          {selectedGame && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Another {selectedGame.title}
              </Button>
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