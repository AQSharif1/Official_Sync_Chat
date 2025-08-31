import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, X, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface GroupMember {
  user_id: string;
  username: string;
  joined_at: string;
}

interface GroupMembersListProps {
  groupId: string;
  memberCount: number;
}

export const GroupMembersList = ({ groupId, memberCount }: GroupMembersListProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchMembers = async () => {
    if (!isOpen) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          user_id,
          joined_at,
          profiles!inner(username)
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const membersWithUsernames = data?.map(item => ({
        user_id: item.user_id,
        username: (item.profiles as any)?.username || 'Unknown User',
        joined_at: item.joined_at
      })) || [];

      setMembers(membersWithUsernames);
    } catch (error) {
      console.error('Error fetching group members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [isOpen, groupId]);

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <Users className="w-4 h-4" />
          <span className="text-sm">
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Group Members ({memberCount})
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{member.username}</span>
                        {member.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                        {index === 0 && (
                          <div title="First to join">
                            <Crown className="w-3 h-3 text-yellow-500" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Joined {formatJoinDate(member.joined_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="text-center text-xs text-muted-foreground mt-4">
          Members are ordered by join date
        </div>
      </DialogContent>
    </Dialog>
  );
};