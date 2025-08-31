import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Smile, Heart, ThumbsUp, Clock } from 'lucide-react';

interface ThisOrThatOption {
  id: string;
  text: string;
  emoji: string;
  votes: number;
  voters: string[];
}

interface ThisOrThatPrompt {
  id: string;
  question: string;
  options: ThisOrThatOption[];
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface ThisOrThatProps {
  prompt: ThisOrThatPrompt;
  currentUserId: string;
  onVote: (promptId: string, optionId: string) => void;
}

export const ThisOrThat = ({ prompt, currentUserId, onVote }: ThisOrThatProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  const totalVotes = prompt.options.reduce((sum, option) => sum + option.votes, 0);
  const hasVoted = prompt.options.some(option => option.voters.includes(currentUserId));
  const userChoice = prompt.options.find(option => option.voters.includes(currentUserId));

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const timeRemaining = prompt.expiresAt.getTime() - now.getTime();
      
      if (timeRemaining <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [prompt.expiresAt]);

  const getOptionPercentage = (votes: number) => {
    return totalVotes > 0 ? (votes / totalVotes) * 100 : 50;
  };

  return (
    <Card className="w-full max-w-lg mx-auto bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smile className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm text-blue-600">This or That</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {timeLeft}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {totalVotes} votes
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">{prompt.question}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {prompt.options.map((option, index) => {
            const percentage = getOptionPercentage(option.votes);
            const isSelected = option.voters.includes(currentUserId);
            const isWinning = hasVoted && option.votes >= Math.max(...prompt.options.map(o => o.votes));

            return (
              <div key={option.id} className="space-y-2">
                <Button
                  variant={isSelected ? "default" : "outline"}
                  className={`w-full h-24 flex flex-col items-center justify-center text-center ${
                    isWinning && hasVoted ? 'ring-2 ring-primary/50' : ''
                  }`}
                  onClick={() => !hasVoted && onVote(prompt.id, option.id)}
                  disabled={hasVoted || timeLeft === 'Expired'}
                >
                  <div className="text-2xl mb-1">{option.emoji}</div>
                  <div className="text-sm font-medium">{option.text}</div>
                  {hasVoted && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {option.votes} ({Math.round(percentage)}%)
                    </div>
                  )}
                </Button>

                {hasVoted && (
                  <Progress 
                    value={percentage} 
                    className="h-2" 
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center text-lg font-bold text-muted-foreground">
          VS
        </div>

        {hasVoted && (
          <div className="text-center">
            <Badge variant="secondary" className="text-xs">
              You chose: {userChoice?.emoji} {userChoice?.text}
            </Badge>
          </div>
        )}

        {!hasVoted && timeLeft !== 'Expired' && (
          <div className="text-center text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <Heart className="h-4 w-4 mx-auto mb-1" />
            <p>Make your choice and see what the group thinks!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Sample prompts for daily This or That
export const THIS_OR_THAT_PROMPTS = [
  {
    question: "Which would you choose?",
    options: [
      { text: "Coffee", emoji: "☕" },
      { text: "Tea", emoji: "🍵" }
    ]
  },
  {
    question: "What's your preference?",
    options: [
      { text: "Beach", emoji: "🏖️" },
      { text: "Mountains", emoji: "🏔️" }
    ]
  },
  {
    question: "Pick your superpower:",
    options: [
      { text: "Flying", emoji: "🦅" },
      { text: "Invisibility", emoji: "👻" }
    ]
  },
  {
    question: "Ideal weather:",
    options: [
      { text: "Sunny", emoji: "☀️" },
      { text: "Rainy", emoji: "🌧️" }
    ]
  },
  {
    question: "Entertainment choice:",
    options: [
      { text: "Movies", emoji: "🎬" },
      { text: "Books", emoji: "📚" }
    ]
  },
  {
    question: "Social setting:",
    options: [
      { text: "Party", emoji: "🎉" },
      { text: "Quiet Night", emoji: "🕯️" }
    ]
  },
  {
    question: "Travel style:",
    options: [
      { text: "Adventure", emoji: "🎒" },
      { text: "Luxury", emoji: "🏖️" }
    ]
  },
  {
    question: "Food preference:",
    options: [
      { text: "Pizza", emoji: "🍕" },
      { text: "Burger", emoji: "🍔" }
    ]
  }
];