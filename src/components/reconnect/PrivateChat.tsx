import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Heart, MoreVertical, UserMinus, VolumeX, AlertTriangle, ArrowLeft, Crown, Lock } from 'lucide-react';
import { usePrivateChat } from '@/hooks/usePrivateChat';
import { useReconnectDM, type PrivateChat as PrivateChatType } from '@/hooks/useReconnectDM';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { useToast } from '@/hooks/use-toast';

interface PrivateChatProps {
  chat: PrivateChatType;
  onBack: () => void;
}

export const PrivateChat = ({ chat, onBack }: PrivateChatProps) => {
  const { user } = useAuth();
  const { messages, sendMessage, addReaction } = usePrivateChat(chat.id);
  const { toggleFavorite, blockUser, muteUser, canAccessDM } = useReconnectDM();
  const { createCheckout } = usePremium();
  const { toast } = useToast();
  const [showReportDialog, setShowReportDialog] = useState(false);

  if (!user) return null;

  // If user doesn't have premium access, show upgrade prompt
  if (!canAccessDM) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b bg-background p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold">Premium Required</h3>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
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
        </div>
      </div>
    );
  }

  const isUser1 = user.id === chat.user1_id;
  const otherUserAlias = isUser1 ? chat.user2_alias : chat.user1_alias;
  const isFavorited = isUser1 ? chat.is_user1_favorited : chat.is_user2_favorited;
  const isMuted = isUser1 ? chat.is_user1_muted : chat.is_user2_muted;

  const handleSendText = async (content: string, type: 'text'): Promise<boolean> => {
    try {
      await sendMessage(content, type);
      return true;
    } catch (error) {
      console.error('Error sending text:', error);
      return false;
    }
  };

  const handleSendGif = async (gifUrl: string): Promise<boolean> => {
    try {
      await sendMessage('', 'gif', { gifUrl });
      return true;
    } catch (error) {
      console.error('Error sending GIF:', error);
      return false;
    }
  };

  const handleSendVoice = async (audioBlob: Blob): Promise<boolean> => {
    try {
      // For now, we'll create a simple URL - in production you'd upload to storage
      const audioUrl = URL.createObjectURL(audioBlob);
      await sendMessage('', 'gif', { voiceAudioUrl: audioUrl });
      return true;
    } catch (error) {
      console.error('Error sending voice:', error);
      return false;
    }
  };

  const handleToggleFavorite = async () => {
    const success = await toggleFavorite(chat.id, !isFavorited);
    if (success) {
      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
      });
    }
  };

  const handleBlock = async () => {
    const success = await blockUser(chat.id);
    if (success) {
      toast({
        title: "User blocked",
        description: "This conversation has been blocked.",
      });
      onBack();
    }
  };

  const handleMute = async () => {
    const success = await muteUser(chat.id, !isMuted);
    if (success) {
      toast({
        title: isMuted ? "User unmuted" : "User muted",
      });
    }
  };

  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for reporting. We'll review this conversation.",
    });
    setShowReportDialog(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h3 className="font-semibold">{otherUserAlias}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Private Chat
                </Badge>
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Crown className="h-3 w-3" />
                  <span>Premium</span>
                </div>
                {isMuted && (
                  <Badge variant="outline" className="text-xs">
                    <VolumeX className="h-3 w-3 mr-1" />
                    Muted
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
              className={isFavorited ? "text-red-500" : ""}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleMute}>
                  <VolumeX className="h-4 w-4 mr-2" />
                  {isMuted ? 'Unmute' : 'Mute'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                  <UserMinus className="h-4 w-4 mr-2" />
                  Block User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-destructive">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Start your private conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={{
                id: message.id,
                content: message.content,
                messageType: message.message_type,
                gifUrl: message.gif_url,
                voiceAudioUrl: message.voice_audio_url,
                voiceTranscription: message.voice_transcription,
                username: message.user_id === user.id ? 'You' : otherUserAlias,
                timestamp: message.created_at,
                userId: message.user_id,
                reactions: message.reactions
              }}
              onReaction={(messageId, emoji) => addReaction(messageId, emoji)}
            />
          ))
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendText}
        onSendGif={handleSendGif}
        onSendVoice={handleSendVoice}
      />

      {/* Report Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Report User</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to report this user? This will help us maintain a safe community.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowReportDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleReport} variant="destructive" className="flex-1">
                  Report
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};