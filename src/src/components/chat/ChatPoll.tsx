import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Plus, X } from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

interface ChatPollProps {
  poll: Poll;
  currentUserId: string;
  onVote: (pollId: string, optionId: string) => void;
  onClosePoll: (pollId: string) => void;
}

export const ChatPoll = ({ poll, currentUserId, onVote, onClosePoll }: ChatPollProps) => {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const hasVoted = poll.options.some(option => option.voters.includes(currentUserId));
  const userVote = poll.options.find(option => option.voters.includes(currentUserId));

  return (
    <Card className="w-full max-w-md mx-auto bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Poll</CardTitle>
          </div>
          {poll.createdBy === currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClosePoll(poll.id)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <p className="text-sm font-medium">{poll.question}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{totalVotes} votes</span>
          {hasVoted && (
            <Badge variant="secondary" className="text-xs">
              You voted: {userVote?.text}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {poll.options.map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          const isSelected = option.voters.includes(currentUserId);

          return (
            <div key={option.id} className="space-y-1">
              <Button
                variant={isSelected ? "default" : "outline"}
                className="w-full justify-start text-left h-auto p-3"
                onClick={() => !hasVoted && onVote(poll.id, option.id)}
                disabled={hasVoted}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{option.text}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.votes}
                    </span>
                  </div>
                  {totalVotes > 0 && (
                    <Progress 
                      value={percentage} 
                      className="h-1" 
                    />
                  )}
                </div>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

interface CreatePollProps {
  onCreatePoll: (question: string, options: string[]) => void;
  onCancel: () => void;
}

export const CreatePoll = ({ onCreatePoll, onCancel }: CreatePollProps) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    const validOptions = options.filter(opt => opt.trim());
    if (question.trim() && validOptions.length >= 2) {
      onCreatePoll(question.trim(), validOptions);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Create Poll
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-1 block">Question</label>
          <Input
            placeholder="What's your question?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-2 block">Options</label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="text-sm"
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                    className="h-9 w-9 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {options.length < 6 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={addOption}
              className="mt-2 h-8 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Option
            </Button>
          )}
        </div>

        <div className="flex gap-2 pt-2">
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
            disabled={!question.trim() || options.filter(opt => opt.trim()).length < 2}
            className="flex-1"
          >
            Create Poll
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};