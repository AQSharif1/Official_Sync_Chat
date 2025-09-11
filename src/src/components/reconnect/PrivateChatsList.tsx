import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Crown, Lock } from 'lucide-react';
import { useReconnectDM, type PrivateChat } from '@/hooks/useReconnectDM';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';

interface PrivateChatsListProps {
  onChatSelect: (chat: PrivateChat) => void;
}

export const PrivateChatsList = ({ onChatSelect }: PrivateChatsListProps) => {
  const { user } = useAuth();
  const { privateChats, canAccessDM, isPremium } = useReconnectDM();
  const { createCheckout } = usePremium();

  if (!user) return null;

  // If user doesn't have premium access, show upgrade prompt
  if (!canAccessDM) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Lock className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Premium Feature</h3>
            <p className="text-muted-foreground">
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
        </div>
      </Card>
    );
  }

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (privateChats.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Private Chats</h3>
        <p className="text-muted-foreground">
          Send DM requests to start private conversations with past groupmates.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-primary mt-2">
          <Crown className="h-3 w-3" />
          <span>Premium: Unlimited DM requests</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Private Chats</h2>
        <div className="flex items-center gap-2 text-xs text-primary">
          <Crown className="h-3 w-3" />
          <span>Premium: Unlimited DM requests</span>
        </div>
      </div>
      {privateChats.map((chat) => {
        const isUser1 = user.id === chat.user1_id;
        const otherUserAlias = isUser1 ? chat.user2_alias : chat.user1_alias;
        const isFavorited = isUser1 ? chat.is_user1_favorited : chat.is_user2_favorited;
        const isBlocked = isUser1 ? chat.is_user1_blocked : chat.is_user2_blocked;
        const isMuted = isUser1 ? chat.is_user1_muted : chat.is_user2_muted;

        if (isBlocked) return null; // Don't show blocked chats

        return (
          <Card
            key={chat.id}
            className="p-4 cursor-pointer transition-all hover:shadow-md border-l-4 border-l-primary/20"
            onClick={() => onChatSelect(chat)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{otherUserAlias}</h3>
                  {isFavorited && (
                    <Heart className="h-4 w-4 text-red-500 fill-current" />
                  )}
                  {isMuted && (
                    <Badge variant="outline" className="text-xs">
                      Muted
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Started {formatTime(chat.created_at)}
                </p>
              </div>
              
              <Button variant="ghost" size="sm">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};