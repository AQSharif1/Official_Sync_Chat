import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Vote, Users, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { useGroupLifecycle } from '@/hooks/useGroupLifecycle';
import { useToast } from '@/hooks/use-toast';

interface GroupLifecycleBannerProps {
  groupId: string;
}

export const GroupLifecycleBanner = ({ groupId }: GroupLifecycleBannerProps) => {
  const { lifecycleData, loading, submitVote, requestExit } = useGroupLifecycle(groupId);
  const { toast } = useToast();
  const [submittingVote, setSubmittingVote] = useState(false);
  const [exitingGroup, setExitingGroup] = useState(false);

  if (loading || !lifecycleData) {
    return null;
  }

  const { 
    voteActive, 
    voteDeadline, 
    userVote, 
    voteResults, 
    daysRemaining, 
    hasExitWindow, 
    exitWindowExpires,
    isExtended,
    lifecycleStage 
  } = lifecycleData;

  const handleVote = async (choice: 'yes' | 'no') => {
    setSubmittingVote(true);
    const success = await submitVote(choice);
    if (success) {
      toast({
        title: "Vote Submitted",
        description: `You voted ${choice.toUpperCase()} to continue the group.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to submit vote. Please try again.",
        variant: "destructive"
      });
    }
    setSubmittingVote(false);
  };

  const handleExit = async () => {
    setExitingGroup(true);
    const success = await requestExit();
    if (success) {
      toast({
        title: "Left Group",
        description: "You have left the group and will be matched to a new one.",
      });
    } else {
      toast({
        title: "Error", 
        description: "Failed to leave group. Please try again.",
        variant: "destructive"
      });
    }
    setExitingGroup(false);
  };

  const formatTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  // Show voting interface
  if (voteActive && voteDeadline) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Vote className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Group Continuation Vote</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <Clock className="h-3 w-3 mr-1" />
              {formatTimeRemaining(voteDeadline)}
            </Badge>
          </div>
          <CardDescription>
            Would you like to keep this group together for another 30 days?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {voteResults && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress ({voteResults.total} of {voteResults.required} needed)</span>
                <span>{Math.round((voteResults.yes / voteResults.required) * 100)}%</span>
              </div>
              <Progress 
                value={(voteResults.yes / voteResults.required) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Yes: {voteResults.yes}</span>
                <span>No: {voteResults.no}</span>
              </div>
            </div>
          )}

          {!userVote ? (
            <div className="flex space-x-3">
              <Button 
                onClick={() => handleVote('yes')}
                disabled={submittingVote}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Yes, Continue
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleVote('no')}
                disabled={submittingVote}
                className="flex-1"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                No, Reshuffle
              </Button>
            </div>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                You voted <strong>{userVote.toUpperCase()}</strong> to {userVote === 'yes' ? 'continue' : 'reshuffle'} the group.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show exit window for users who voted NO but group was extended
  if (hasExitWindow && exitWindowExpires) {
    const timeLeft = formatTimeRemaining(exitWindowExpires);
    return (
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">Exit Window Available</CardTitle>
          </div>
          <CardDescription>
            The group was extended, but you can still leave within {timeLeft}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline"
            onClick={handleExit}
            disabled={exitingGroup}
            className="w-full"
          >
            {exitingGroup ? 'Leaving...' : 'Leave Group & Find New Match'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show extended group badge
  if (isExtended) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-primary/10 rounded-lg">
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          Extended Group ✨
        </Badge>
        <span className="text-sm text-muted-foreground">
          This group was extended by member vote
        </span>
        <div className="ml-auto flex items-center space-x-1 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{daysRemaining} days remaining</span>
        </div>
      </div>
    );
  }

  // Show regular countdown for new groups
  if (lifecycleStage === 'active' && daysRemaining > 0 && daysRemaining <= 7) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <Clock className="h-4 w-4 text-blue-600" />
        <span className="text-sm">
          Group lifecycle: {daysRemaining} days remaining
        </span>
      </div>
    );
  }

  return null;
};