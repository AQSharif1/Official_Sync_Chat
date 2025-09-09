import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  MessageCircle, 
  Search, 
  Crown, 
  Lock, 
  Users,
  X,
  Plus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export const DMModal = ({ open, onOpenChange, groupId }: DMModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupMembers, setGroupMembers] = useState<Array<{ id: string; username: string; user_id: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const { toast } = useToast();

  // Load group members when modal opens
  useEffect(() => {
    if (open && user && groupId) {
      loadGroupMembers();
    }
  }, [open, user, groupId]);

  const loadGroupMembers = async () => {
    if (!user || !groupId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get all members in the group (excluding current user)
      const { data: members, error: dbError } = await supabase
        .from('group_members')
        .select(`
          id,
          user_id,
          profiles!inner(username)
        `)
        .eq('group_id', groupId)
        .eq('status', 'active')
        .neq('user_id', user.id);

      if (dbError) {
        console.error('Database error loading group members:', dbError);
        setError(`Database error: ${dbError.message}`);
        return;
      }
      
      if (members) {
        setGroupMembers(members.map(m => ({
          id: m.id,
          user_id: m.user_id,
          username: m.profiles.username
        })));
      }
      
    } catch (error) {
      console.error('Error loading group members:', error);
      setError(`Failed to load group members: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Error",
        description: "Failed to load group members.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartDM = async (memberId: string, username: string) => {
    if (!isPremium) {
      toast({
        title: "Premium Required",
        description: "Direct messaging is available exclusively for premium subscribers.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a reconnection request (DM request)
      const { error: dmError } = await supabase
        .from('reconnection_requests')
        .insert({
          sender_id: user?.id,
          recipient_id: memberId,
          status: 'pending',
          message: `Hi ${username}! I'd like to start a direct conversation with you.`
        });

      if (dmError) {
        throw dmError;
      }

      // Update user engagement to track DM usage
      const { error: engagementError } = await supabase.rpc('update_user_engagement', {
        p_user_id: user?.id,
        p_activity_type: 'reconnect'
      });

      if (engagementError) {
        console.error('Error updating engagement:', engagementError);
      }

      toast({
        title: "DM Request Sent!",
        description: `Request sent to ${username}. You'll be notified if they accept.`,
      });
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error starting DM:', error);
      toast({
        title: "Error",
        description: "Failed to send DM request.",
        variant: "destructive",
      });
    }
  };

  // Filter members based on search
  const filteredMembers = groupMembers.filter(member =>
    member.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show error state if there's an error
  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-3 mb-4">
              <Lock className="h-8 w-8 text-red-500" />
              <DialogTitle className="text-xl">Error Loading DMs</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 text-center">
            <p className="text-red-500">
              {error}
            </p>
            
            <Button 
              className="w-full" 
              onClick={() => {
                setError(null);
                loadGroupMembers();
              }}
            >
              Retry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If user doesn't have premium access, show upgrade prompt
  if (!isPremium && !premiumLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-3 mb-4">
              <Lock className="h-8 w-8 text-primary" />
              <DialogTitle className="text-xl">Premium Feature</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 text-center">
            <p className="text-muted-foreground">
              Direct messaging is available exclusively for premium subscribers.
            </p>
            
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2 justify-center">
                <Crown className="h-5 w-5 text-primary" />
                <span className="font-medium">Premium Benefits</span>
              </div>
              <ul className="text-sm space-y-1 text-left">
                <li>• Send DM requests to group members</li>
                <li>• 1-on-1 private conversations</li>
                <li>• No daily limits</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => window.open('/success', '_blank')}
              >
                Upgrade to Premium
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-6 w-6 text-primary" />
              <DialogTitle className="text-xl">Direct Messages</DialogTitle>
              <div className="flex items-center gap-1 text-xs text-primary">
                <Crown className="h-3 w-3" />
                <span>Premium</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search group members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Group Members List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p>Loading group members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No group members found</p>
              <p className="text-sm">Join a group to start sending DMs</p>
            </div>
          ) : (
            filteredMembers.map((member) => (
              <Card key={member.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{member.username}</h4>
                    <p className="text-sm text-muted-foreground">Group member</p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartDM(member.user_id, member.username)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Send DM
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
