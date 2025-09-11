import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGroupNameManagement } from '@/hooks/useGroupNameManagement';
import { Edit3, Vote, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface GroupNameManagementProps {
  groupId: string;
  currentName: string;
}

export const GroupNameManagement = ({ groupId, currentName }: GroupNameManagementProps) => {
  const {
    generateUniqueGroupName,
    proposeNameChange,
    submitVote,
    currentProposal,
    voteResult,
    canProposeNameChange,
    hasVoted,
    isVoteActive,
    loading
  } = useGroupNameManagement(groupId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [proposedName, setProposedName] = useState('');
  const [useRandomName, setUseRandomName] = useState(false);
  const [voteUIVisible, setVoteUIVisible] = useState(true);

  const handleGenerateRandomName = async () => {
    const randomName = await generateUniqueGroupName();
    if (randomName) {
      setProposedName(randomName);
      setUseRandomName(true);
    }
  };

  const handleProposeNameChange = async () => {
    if (!proposedName.trim()) return;
    
    await proposeNameChange(proposedName);
    setIsDialogOpen(false);
    setProposedName('');
    setUseRandomName(false);
  };

  const handleVote = async (choice: 'yes' | 'no') => {
    await submitVote(choice);
  };

  const formatTimeRemaining = (deadline: string) => {
    const remaining = new Date(deadline).getTime() - new Date().getTime();
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

// Active voting UI
  if (currentProposal && isVoteActive && voteUIVisible) {
    return (
      <div className="space-y-2">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vote className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Group Name Vote</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTimeRemaining(currentProposal.vote_deadline)}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVoteUIVisible(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <CardDescription>
              Proposed new name: <span className="font-semibold text-foreground">"{currentProposal.proposed_name}"</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {voteResult && (
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>👍 {voteResult.yes_votes}</span>
                <span>👎 {voteResult.no_votes}</span>
                <span>Need: {voteResult.majority_needed}</span>
              </div>
            )}
            
            {!hasVoted ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleVote('yes')}
                  disabled={loading}
                  size="sm"
                  variant="default"
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Yes
                </Button>
                <Button
                  onClick={() => handleVote('no')}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  No
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="w-full justify-center">
                You voted {hasVoted ? 'YES' : 'NO'}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show collapsed vote UI when hidden
  if (currentProposal && isVoteActive && !voteUIVisible) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setVoteUIVisible(true)}
        className="text-xs"
      >
        Show Vote Panel
      </Button>
    );
  }

  // Request name change UI
  if (canProposeNameChange) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Edit3 className="h-4 w-4" />
            Request Name Change
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Propose Group Name Change</DialogTitle>
            <DialogDescription>
              Suggest a new name for "{currentName}". All members will vote on the proposal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proposed-name">New Group Name</Label>
              <Input
                id="proposed-name"
                value={proposedName}
                onChange={(e) => {
                  setProposedName(e.target.value);
                  setUseRandomName(false);
                }}
                placeholder="Enter new group name..."
                maxLength={50}
              />
            </div>
            <div className="text-center">
              <span className="text-sm text-muted-foreground">or</span>
            </div>
            <Button
              onClick={handleGenerateRandomName}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Generate Random Name
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={handleProposeNameChange}
              disabled={!proposedName.trim() || loading}
              className="w-full"
            >
              Propose Name Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // No action available (name already changed)
  return (
    <Badge variant="secondary" className="text-xs">
      Name Already Changed
    </Badge>
  );
};