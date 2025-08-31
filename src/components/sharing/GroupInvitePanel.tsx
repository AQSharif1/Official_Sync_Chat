import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Share2, Copy, Users, Clock } from 'lucide-react';

interface GroupInvitePanelProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

interface GroupInvite {
  id: string;
  invite_code: string;
  max_uses: number;
  current_uses: number;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
}

export const GroupInvitePanel = ({ groupId, groupName, onClose }: GroupInvitePanelProps) => {
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createInvite = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const inviteCode = generateInviteCode();
      
      const { data, error } = await supabase
        .from('group_invites' as any)
        .insert({
          group_id: groupId,
          inviter_id: user.id,
          invite_code: inviteCode,
          max_uses: 5
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create invite link",
          variant: "destructive"
        });
        return;
      }

      const inviteData = data as any;
      const newInvite: GroupInvite = {
        id: inviteData.id,
        invite_code: inviteData.invite_code,
        max_uses: inviteData.max_uses,
        current_uses: inviteData.current_uses,
        expires_at: new Date(inviteData.expires_at),
        is_active: inviteData.is_active,
        created_at: new Date(inviteData.created_at)
      };

      setInvites(prev => [newInvite, ...prev]);
      
      toast({
        title: "Invite Created!",
        description: "Share this code with friends to join your group"
      });
    } catch (error) {
      console.error('Error creating invite:', error);
      toast({
        title: "Error",
        description: "Failed to create invite link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (inviteCode: string) => {
    try {
      const inviteMessage = `Join my group "${groupName}" on SyncChat! Use invite code: ${inviteCode}`;
      await navigator.clipboard.writeText(inviteMessage);
      
      toast({
        title: "Copied!",
        description: "Invite message copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const shareViaAPI = async (inviteCode: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on SyncChat`,
          text: `Use invite code: ${inviteCode}`,
          url: window.location.origin
        });
      } catch (error) {
        // Silent error handling for production
      }
    } else {
      copyToClipboard(inviteCode);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed inset-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                <CardTitle>Invite Friends</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share {groupName} with your friends
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button 
              onClick={createInvite} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create New Invite'}
            </Button>

            <div className="space-y-3">
              {invites.length > 0 ? (
                invites.map(invite => (
                  <Card key={invite.id} className="border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-lg font-bold">
                          {invite.invite_code}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={invite.is_active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {invite.is_active ? 'Active' : 'Expired'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{invite.current_uses}/{invite.max_uses}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{Math.ceil((invite.expires_at.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}d left</span>
                        </div>
                      </div>
                      
                      {invite.is_active && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => copyToClipboard(invite.invite_code)}
                            className="flex-1"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => shareViaAPI(invite.invite_code)}
                            className="flex-1"
                          >
                            <Share2 className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No active invites. Create one to get started!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};