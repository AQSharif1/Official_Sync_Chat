import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sparkles, Clock, Lightbulb, Trophy } from 'lucide-react';

interface EmojiGuess {
  userId: string;
  username: string;
  guess: string;
  timestamp: Date;
  isCorrect?: boolean;
}

interface EmojiRiddle {
  id: string;
  emojis: string;
  answer: string;
  hint: string;
  funFact: string;
  guesses: EmojiGuess[];
  solvedBy?: string;
  solvedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface EmojiRiddleProps {
  riddle: EmojiRiddle;
  currentUserId: string;
  currentUsername: string;
  onGuess: (riddleId: string, guess: string) => void;
}

export const EmojiRiddleGame = ({ riddle, currentUserId, currentUsername, onGuess }: EmojiRiddleProps) => {
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  const hasGuessed = riddle.guesses.some(g => g.userId === currentUserId);
  const isSolved = !!riddle.solvedBy;
  const userGuesses = riddle.guesses.filter(g => g.userId === currentUserId);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const timeRemaining = riddle.expiresAt.getTime() - now.getTime();
      
      if (timeRemaining <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const minutes = Math.floor(timeRemaining / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [riddle.expiresAt]);

  const handleSubmitGuess = () => {
    if (guess.trim() && !isSolved) {
      onGuess(riddle.id, guess.trim());
      setGuess('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitGuess();
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-600" />
            <CardTitle className="text-sm text-yellow-600">Emoji Riddle</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {timeLeft}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {riddle.guesses.length} guesses
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Emoji Display */}
        <div className="text-center">
          <div className="text-4xl mb-4 p-6 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            {riddle.emojis}
          </div>
          <p className="text-sm text-muted-foreground">What do these emojis represent?</p>
        </div>

        {/* Solved State */}
        {isSolved && (
          <div className="text-center space-y-2">
            <Badge variant="default" className="text-sm">
              <Trophy className="h-3 w-3 mr-1" />
              Solved by {riddle.solvedBy}!
            </Badge>
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Answer: {riddle.answer}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                💡 {riddle.funFact}
              </p>
            </div>
          </div>
        )}

        {/* Guess Input */}
        {!isSolved && timeLeft !== 'Expired' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Type your guess..."
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-sm"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSubmitGuess}
                disabled={!guess.trim()}
              >
                Guess
              </Button>
            </div>
          </div>
        )}

        {/* Hint */}
        {!isSolved && riddle.guesses.length >= 2 && (
          <div className="text-center">
            <Badge variant="outline" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              Hint: {riddle.hint}
            </Badge>
          </div>
        )}

        {/* User's Previous Guesses */}
        {userGuesses.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Your guesses:</p>
            <div className="flex flex-wrap gap-1">
              {userGuesses.map((userGuess, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {userGuess.guess}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Guesses */}
        {riddle.guesses.length > 0 && !isSolved && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Recent guesses:</p>
            <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
              {riddle.guesses.slice(-3).reverse().map((g, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{g.username}:</span>
                  <span>{g.guess}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isSolved && riddle.guesses.length === 0 && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 text-center">
            <Sparkles className="h-4 w-4 mx-auto mb-1" />
            <p>Look at the emojis and guess what they represent!</p>
            <p className="mt-1">Could be a movie, book, phrase, or concept.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Sample riddles for the bot
export const EMOJI_RIDDLES = [
  {
    emojis: "🦁👑🏰",
    answer: "The Lion King",
    hint: "Disney movie about royalty",
    funFact: "The Lion King was the highest-grossing traditionally animated film until Frozen!"
  },
  {
    emojis: "🕷️👨🏠",
    answer: "Spider-Man",
    hint: "Superhero with web powers",
    funFact: "Spider-Man first appeared in comics in 1962 and was created by Stan Lee!"
  },
  {
    emojis: "⭐🛸💫",
    answer: "Star Wars",
    hint: "Space saga with lightsabers",
    funFact: "The first Star Wars movie was initially rejected by several studios!"
  },
  {
    emojis: "🍕🐢🥷",
    answer: "Teenage Mutant Ninja Turtles",
    hint: "Four reptilian heroes",
    funFact: "The TMNT were originally created as a parody of comic book tropes!"
  },
  {
    emojis: "🏃‍♀️🍫🏭",
    answer: "Charlie and the Chocolate Factory",
    hint: "Sweet adventure story",
    funFact: "Roald Dahl wrote this after working for a chocolate company!"
  },
  {
    emojis: "❄️👸🏰",
    answer: "Frozen",
    hint: "Disney movie about sisterly love",
    funFact: "Let It Go was originally written as a villain song!"
  },
  {
    emojis: "🧙‍♂️💍🌋",
    answer: "Lord of the Rings",
    hint: "Fantasy epic about destroying jewelry",
    funFact: "Tolkien invented entire languages for this story!"
  },
  {
    emojis: "🦈🏊‍♀️🩸",
    answer: "Jaws",
    hint: "Classic thriller about ocean danger",
    funFact: "The mechanical shark barely worked during filming!"
  }
];