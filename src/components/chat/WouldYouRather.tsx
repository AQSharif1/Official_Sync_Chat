import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageCircle, Users, Clock, Lightbulb } from 'lucide-react';

interface WouldYouRatherOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

interface WouldYouRatherPrompt {
  id: string;
  question: string;
  options: WouldYouRatherOption[];
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface WouldYouRatherProps {
  prompt: WouldYouRatherPrompt;
  currentUserId: string;
  onVote: (promptId: string, optionId: string) => void;
}

export const WouldYouRather = ({ prompt, currentUserId, onVote }: WouldYouRatherProps) => {
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

      const minutes = Math.floor(timeRemaining / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
      
      if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [prompt.expiresAt]);

  const getOptionPercentage = (votes: number) => {
    return totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
  };

  return (
    <Card className="w-full max-w-lg mx-auto bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm text-primary">Would You Rather?</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {timeLeft}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {totalVotes}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {prompt.options.map((option, index) => {
            const percentage = getOptionPercentage(option.votes);
            const isSelected = option.voters.includes(currentUserId);
            const isWinning = hasVoted && option.votes === Math.max(...prompt.options.map(o => o.votes));

            return (
              <div key={option.id} className="space-y-2">
                <Button
                  variant={isSelected ? "default" : "outline"}
                  className={`w-full justify-start text-left h-auto p-4 ${
                    isWinning && hasVoted ? 'ring-2 ring-primary/50' : ''
                  }`}
                  onClick={() => !hasVoted && onVote(prompt.id, option.id)}
                  disabled={hasVoted || timeLeft === 'Expired'}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Option {String.fromCharCode(65 + index)}: {option.text}
                      </span>
                      {hasVoted && (
                        <span className="text-xs text-muted-foreground">
                          {option.votes} ({Math.round(percentage)}%)
                        </span>
                      )}
                    </div>
                    
                    {hasVoted && (
                      <Progress 
                        value={percentage} 
                        className="h-2" 
                      />
                    )}
                  </div>
                </Button>
              </div>
            );
          })}
        </div>

        {hasVoted && (
          <div className="text-center">
            <Badge variant="secondary" className="text-xs">
              You chose: {userChoice?.text}
            </Badge>
          </div>
        )}

        {!hasVoted && timeLeft !== 'Expired' && (
          <div className="text-center text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <Lightbulb className="h-4 w-4 mx-auto mb-1" />
            <p>Make your choice! Results will be revealed after you vote.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Sample prompts for the daily bot
export const WOULD_YOU_RATHER_PROMPTS = [
  {
    question: "Would you rather...",
    options: [
      "Have the ability to time travel to the past",
      "Have the ability to time travel to the future"
    ]
  },
  {
    question: "Would you rather...",
    options: [
      "Always be 10 minutes late",
      "Always be 20 minutes early"
    ]
  },
  {
    question: "Would you rather...",
    options: [
      "Be able to speak every language fluently",
      "Be able to play every musical instrument perfectly"
    ]
  },
  {
    question: "Would you rather...",
    options: [
      "Live in a world without music",
      "Live in a world without movies"
    ]
  },
  {
    question: "Would you rather...",
    options: [
      "Have unlimited money but only 5 years to live",
      "Live forever but be poor"
    ]
  },
  {
    question: "Would you rather...",
    options: [
      "Always know when someone is lying to you",
      "Always get away with lying"
    ]
  },
  {
    question: "Would you rather...",
    options: [
      "Be the smartest person in the room",
      "Be the funniest person in the room"
    ]
  },
  {
    question: "Would you rather...",
    options: [
      "Have the power of invisibility",
      "Have the power to read minds"
    ]
  }
];