import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowRight, Crown, Lock } from 'lucide-react';
import { useReconnectDM } from '@/hooks/useReconnectDM';
import { useToast } from '@/hooks/use-toast';
import { usePremium } from '@/hooks/usePremium';
import { PremiumLimitModal } from '@/components/premium/PremiumLimitModal';

interface GroupMember {
  id: string;
  username: string;
  user_id: string;
}

interface ReconnectSelectionProps {
  groupId: string;
  groupName: string;
  members: GroupMember[];
  onClose: () => void;
}

export const ReconnectSelection = ({ groupId, groupName, members, onClose }: ReconnectSelectionProps) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { sendReconnectionRequest, loading, canAccessDM, isPremium } = useReconnectDM();
  const { toast } = useToast();
  const { createCheckout } = usePremium();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const handleUserSelect = (userId: string) => {
    if (!canAccessDM) {
      setShowPremiumModal(true);
      return;
    }

    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else if (selectedUsers.length < 2) {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSendRequests = async () => {
    if (!canAccessDM) {
      setShowPremiumModal(true);
      return;
    }

    if (selectedUsers.length !== 2) return;

    try {
      const results = await Promise.all(
        selectedUsers.map(userId => sendReconnectionRequest(userId, groupId))
      );

      if (results.every(result => result)) {
        toast({
          title: "DM requests sent!",
          description: "You'll be notified if both users accept.",
        });
        onClose();
      } else {
        toast({
          title: "Error",
          description: "Failed to send some requests. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send DM requests.",
        variant: "destructive",
      });
    }
  };

  // If user doesn't have premium access, show upgrade prompt
  if (!canAccessDM) {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <div className="space-y-6 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Premium Feature</h3>
            <p className="text-sm text-muted-foreground">
              Direct messaging is available exclusively for premium subscribers.
            </p>
          </div>
          
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2 justify-center">
              <Crown className="h-5 w-5 text-primary" />
              <span className="font-medium">Premium Benefits</span>
            </div>
            <ul className="text-sm space-y-1 text-left">
              <li>• Unlimited DM requests</li>
              <li>• 1-on-1 private conversations</li>
              <li>• No daily limits</li>
              <li>• Enhanced privacy features</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => createCheckout('monthly')}
            >
              Upgrade to Monthly ($9.99/mo)
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => createCheckout('yearly')}
            >
              Upgrade to Yearly ($79.99/yr)
            </Button>
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => createCheckout('monthly', true)}
            >
              Try 3-Day Free Trial
            </Button>
          </div>

          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={onClose}
          >
            Maybe Later
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 max-w-md mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Direct Message with {groupName}</span>
            </div>
            <h3 className="text-lg font-semibold">Choose 2 people to message</h3>
            <p className="text-sm text-muted-foreground">
              If both users also choose you, a private chat will be created.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-primary">
              <Crown className="h-3 w-3" />
              <span>Premium: Unlimited DM requests</span>
            </div>
          </div>

          {/* Selection Count */}
          <div className="text-center">
            <Badge variant={selectedUsers.length === 2 ? "default" : "secondary"}>
              {selectedUsers.length}/2 selected
            </Badge>
          </div>

          {/* Member List */}
          <div className="space-y-2">
            {members.map((member) => (
              <Card
                key={member.id}
                className={`p-3 cursor-pointer transition-all ${
                  selectedUsers.includes(member.user_id)
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                } ${selectedUsers.length >= 2 && !selectedUsers.includes(member.user_id) ? 'opacity-50' : ''}`}
                onClick={() => handleUserSelect(member.user_id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{member.username}</span>
                  {selectedUsers.includes(member.user_id) && (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendRequests}
              disabled={selectedUsers.length !== 2 || loading}
              className="flex-1"
            >
              {loading ? (
                "Sending..."
              ) : (
                <>
                  Send DM Requests
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <PremiumLimitModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        feature="reconnect"
        currentUsage={0}
        limit={0}
      />
    </>
  );
};