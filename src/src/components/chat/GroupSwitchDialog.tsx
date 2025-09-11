import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Crown, Users } from 'lucide-react';
import { useGroupSwitching } from '@/hooks/useGroupSwitching';

interface GroupSwitchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onSwitchSuccess: (newGroupId: string, newGroupData: any) => void;
}

export const GroupSwitchDialog = ({ 
  isOpen, 
  onClose, 
  groupId, 
  groupName, 
  onSwitchSuccess 
}: GroupSwitchDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { canSwitch, remainingSwitches, switchLimit, performGroupSwitch } = useGroupSwitching();

  const handleConfirmSwitch = async () => {
    setIsLoading(true);
    try {
      const result = await performGroupSwitch(groupId);
      if (result.success && result.newGroupId) {
        onSwitchSuccess(result.newGroupId, result.newGroupData);
        onClose();
      }
    } catch (error) {
      console.error('Error during group switch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isPremium = switchLimit > 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <DialogTitle>Leave Group Chat?</DialogTitle>
          </div>
          <DialogDescription className="space-y-3 pt-2">
            <p>
              Are you sure you want to leave <strong>"{groupName}"</strong>? 
              You'll be randomly matched to another group with similar preferences.
            </p>
            
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Group switches available:</span>
                <div className="flex items-center gap-2">
                  <Badge variant={remainingSwitches > 0 ? "default" : "destructive"}>
                    {remainingSwitches} of {switchLimit}
                  </Badge>
                  {isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {isPremium 
                  ? "Premium members get 5 group switches per month" 
                  : "Regular members get 1 group switch per month"
                }
              </p>
              
              {!canSwitch && (
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>No switches remaining this month</span>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Stay in Group
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirmSwitch}
            disabled={!canSwitch || isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Finding New Group...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Switch Groups
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};