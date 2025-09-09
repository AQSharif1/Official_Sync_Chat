import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Clock, Eye, EyeOff } from 'lucide-react';
import { useEngagement } from '@/hooks/useEngagement';

interface TruthLieStatement {
  id: string;
  text: string;
  isLie: boolean;
}

interface TruthLieGuess {
  userId: string;
  username: string;
  guessedStatementId: string;
  timestamp: Date;
}

interface TruthLieGame {
  id: string;
  createdBy: string;
  createdByUsername: string;
  statements: TruthLieStatement[];
  guesses: TruthLieGuess[];
  revealedAt?: Date;
  isActive: boolean;
  expiresAt: Date;
}

interface TruthLieGameProps {
  game: TruthLieGame;
  currentUserId: string;
  currentUsername: string;
  onGuess: (gameId: string, statementId: string) => void;
}

export const TruthLieGame = ({ game, currentUserId, currentUsername, onGuess }: TruthLieGameProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const { trackActivity } = useEngagement();
  
  const hasGuessed = game.guesses.some(guess => guess.userId === currentUserId);
  const userGuess = game.guesses.find(guess => guess.userId === currentUserId);
  const isCreator = game.createdBy === currentUserId;
  const isRevealed = !!game.revealedAt;
  const lieStatement = game.statements.find(s => s.isLie);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const timeRemaining = game.expiresAt.getTime() - now.getTime();
      
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
  }, [game.expiresAt]);

  const getStatementVotes = (statementId: string) => {
    return game.guesses.filter(guess => guess.guessedStatementId === statementId);
  };

  return (
    <Card className="w-full max-w-lg mx-auto bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-orange-600" />
            <CardTitle className="text-sm text-orange-600">Two Truths and a Lie</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {timeLeft}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {game.guesses.length} guesses
            </Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          by {game.createdByUsername}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {game.statements.map((statement, index) => {
            const votes = getStatementVotes(statement.id);
            const isUserGuess = userGuess?.guessedStatementId === statement.id;
            const isCorrectLie = isRevealed && statement.isLie;
            const isWrongGuess = isRevealed && isUserGuess && !statement.isLie;

            return (
              <Button
                key={statement.id}
                variant={isUserGuess ? "default" : "outline"}
                className={`w-full justify-start text-left h-auto p-4 ${
                  isCorrectLie ? 'bg-red-100 border-red-300 dark:bg-red-950/50 dark:border-red-800' :
                  isWrongGuess ? 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600' : ''
                }`}
                onClick={() => {
                  if (!hasGuessed && !isRevealed) {
                    onGuess(game.id, statement.id);
                    // Karma tracking is handled in GroupChat component
                  }
                }}
                disabled={hasGuessed || isRevealed || isCreator}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {index + 1}. {statement.text}
                    </span>
                    {isRevealed && statement.isLie && (
                      <Badge variant="destructive" className="text-xs">
                        LIE
                      </Badge>
                    )}
                  </div>
                  
                  {isRevealed && votes.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Guessed by: {votes.map(v => v.username).join(', ')}
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        {hasGuessed && !isRevealed && (
          <div className="text-center">
            <Badge variant="secondary" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              You guessed: Statement {game.statements.findIndex(s => s.id === userGuess?.guessedStatementId) + 1}
            </Badge>
          </div>
        )}

        {isRevealed && (
          <div className="text-center space-y-2">
            <Badge variant="destructive" className="text-sm">
              The lie was: "{lieStatement?.text}"
            </Badge>
            {userGuess && (
              <Badge variant={lieStatement?.id === userGuess.guessedStatementId ? "default" : "secondary"} className="text-xs">
                {lieStatement?.id === userGuess.guessedStatementId ? "🎉 You got it right!" : "😅 Better luck next time!"}
              </Badge>
            )}
          </div>
        )}

        {isCreator && !isRevealed && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 text-center">
            <EyeOff className="h-4 w-4 mx-auto mb-1" />
            <p>Wait for others to guess. Results will be revealed automatically.</p>
          </div>
        )}

        {!isCreator && !hasGuessed && !isRevealed && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 text-center">
            <MessageSquare className="h-4 w-4 mx-auto mb-1" />
            <p>Which statement do you think is the lie?</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface CreateTruthLieProps {
  onCreateGame: (statements: string[]) => void;
  onCancel: () => void;
}

export const CreateTruthLie = ({ onCreateGame, onCancel }: CreateTruthLieProps) => {
  const [statements, setStatements] = useState(['', '', '']);
  const [lieIndex, setLieIndex] = useState<number | null>(null);

  const updateStatement = (index: number, value: string) => {
    const newStatements = [...statements];
    newStatements[index] = value;
    setStatements(newStatements);
  };

  const handleSubmit = () => {
    const validStatements = statements.filter(s => s.trim());
    if (validStatements.length === 3 && lieIndex !== null) {
      const submissionData = statements.map((statement, index) => ({
        text: statement.trim(),
        isLie: index === lieIndex
      }));
      onCreateGame(submissionData.map(s => s.text));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Create Two Truths and a Lie
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Write 3 statements about yourself - 2 truths and 1 lie
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {statements.map((statement, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium">Statement {index + 1}</label>
                <Button
                  variant={lieIndex === index ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setLieIndex(lieIndex === index ? null : index)}
                  className="h-6 text-xs"
                >
                  {lieIndex === index ? "LIE" : "Mark as lie"}
                </Button>
              </div>
              <Textarea
                placeholder={`Tell us something about yourself...`}
                value={statement}
                onChange={(e) => updateStatement(index, e.target.value)}
                className="text-sm min-h-[60px]"
                rows={2}
              />
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          <p className="font-medium mb-1">💡 Tips:</p>
          <p>• Make the lie believable</p>
          <p>• Keep all statements interesting</p>
          <p>• Mark which one is the lie</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={statements.some(s => !s.trim()) || lieIndex === null}
            className="flex-1"
          >
            Start Game
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};