import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, Pin, MoreHorizontal, EyeOff } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChatMessage } from '@/hooks/useChatMessages';
import { useAuth } from '@/hooks/useAuth';
import { useUserMood } from '@/hooks/useUserMood';
import { useSimpleOnlineStatus } from '@/hooks/useSimpleOnlineStatus';
import { MessageModerationMenu } from './MessageModerationMenu';
import { FlagIndicator } from './FlagIndicator';

import { supabase } from '@/integrations/supabase/client';
import { useEngagement } from '@/hooks/useEngagement';

interface MessageBubbleProps {
  message: ChatMessage;
  chatType?: 'group' | 'private';
  onReaction?: (messageId: string, emoji: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string, content: string, username: string, messageType: 'text' | 'gif' | 'voice', gifUrl?: string, voiceAudioUrl?: string) => void;
  onHideMessage?: (messageId: string) => void;
  currentUserId?: string;
  groupId?: string;
}

interface FlaggedMessage {
  id: string;
  flag_reason: string;
  confidence_score: number;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export const MessageBubble = ({ 
  message, 
  chatType = 'group', 
  onReaction, 
  onReact,
  onPin, 
  onHideMessage,
  currentUserId,
  groupId
}: MessageBubbleProps) => {
  // Use either onReaction or onReact prop
  const handleReaction = onReaction || onReact;
  const { user } = useAuth();
  const { getUserDisplayName } = useUserMood();
  const { getUserOnlineStatus } = useSimpleOnlineStatus(groupId || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [flaggedMessage, setFlaggedMessage] = useState<FlaggedMessage | null>(null);
  const [displayName, setDisplayName] = useState(message.username);
  const [userKarma, setUserKarma] = useState<number>(0);
  const [isHidden, setIsHidden] = useState(false);
  const isOwnMessage = user?.id === message.userId;
  
  // Get online status for the message author
  const userOnlineStatus = getUserOnlineStatus(message.userId);

  // Check if message is flagged and load user display name
  useEffect(() => {
    const checkIfFlagged = async () => {
      try {
        const { data, error } = await supabase
          .from('flagged_messages' as any)
          .select('id, flag_reason, confidence_score')
          .eq('message_id', message.id)
          .eq('chat_type', chatType)
          .maybeSingle();
        
        if (error) {
          console.error('Error checking flag status:', error);
          return;
        }
        
        if (data) {
          setFlaggedMessage({
            id: (data as any).id,
            flag_reason: (data as any).flag_reason,
            confidence_score: (data as any).confidence_score
          });
        }
      } catch (error) {
        console.error('Error checking flag status:', error);
      }
    };

    const loadDisplayName = async () => {
      if (message.userId) {
        const name = await getUserDisplayName(message.username, message.userId);
        setDisplayName(name);
      }
    };

    const loadUserKarma = async () => {
      try {
        const { data, error } = await supabase
          .from('user_engagement')
          .select('achievement_points')
          .eq('user_id', message.userId)
          .maybeSingle();

        if (data && !error) {
          setUserKarma(data.achievement_points || 0);
        }
      } catch (error) {
        // User might not have engagement data yet
        setUserKarma(0);
      }
    };

    checkIfFlagged();
    loadDisplayName();
    loadUserKarma();
  }, [message.id, message.username, message.userId, chatType, getUserDisplayName]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handlePlayVoice = () => {
    if (!message.voiceAudioUrl) return;

    if (isPlaying && audioElement) {
      // Pause the audio
      audioElement.pause();
      setIsPlaying(false);
    } else {
      // Create new audio or resume existing
      let audio = audioElement;
      if (!audio) {
        audio = new Audio(message.voiceAudioUrl);
        setAudioElement(audio);
        audio.onended = () => {
          setIsPlaying(false);
          setAudioElement(null);
        };
        audio.onerror = () => {
          setIsPlaying(false);
          setAudioElement(null);
        };
      }
      
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
        setAudioElement(null);
      });
    }
  };

  const handlePinMessage = () => {
    if (onPin) {
      onPin(
        message.id, 
        message.content || '', 
        message.username, 
        message.messageType,
        message.gifUrl,
        message.voiceAudioUrl
      );
    }
  };

  const handleHideMessage = () => {
    setIsHidden(true);
    if (onHideMessage) {
      onHideMessage(message.id);
    }
  };

  const renderTextWithMentions = (text: string) => {
    if (!currentUserId || !text) return <span>{text}</span>;
    
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add highlighted mention as separate element
      parts.push(
        <span 
          key={match.index} 
          className="bg-primary/20 text-primary font-medium px-1 rounded"
        >
          {match[0]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return <>{parts}</>;
  };

  const renderMessageContent = () => {
    switch (message.messageType) {
      case 'text':
        return (
          <div className="text-sm leading-relaxed break-words">
            {renderTextWithMentions(message.content || '')}
          </div>
        );
      
      case 'gif':
        return (
          <div className="rounded-lg overflow-hidden max-w-xs">
            <img
              src={message.gifUrl}
              alt="GIF"
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        );
      
      case 'voice':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
              <Button
                onClick={handlePlayVoice}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Voice message</span>
            </div>
            {message.voiceTranscription && (
              <p className="text-sm text-muted-foreground italic">
                "{message.voiceTranscription}"
              </p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  // Don't render if message is hidden
  if (isHidden) {
    return null;
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`max-w-[70%] ${isOwnMessage ? 'ml-auto' : 'mr-auto'} relative`}>
        {/* Username and timestamp */}
        <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {displayName}
            </span>
            {/* Online status indicator */}
            {!isOwnMessage && userOnlineStatus && (
              <div className="flex items-center gap-1">
                {userOnlineStatus.isOnline ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Online" />
                ) : (
                  <div className="w-2 h-2 bg-gray-400 rounded-full" title={`Last seen ${userOnlineStatus.lastSeen.toLocaleTimeString()}`} />
                )}
              </div>
            )}
          </div>
          {userKarma > 0 && (
            <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
              {userKarma} ⭐
            </Badge>
          )}
          {flaggedMessage && (
            <FlagIndicator 
              reason={flaggedMessage.flag_reason}
              confidence={flaggedMessage.confidence_score}
            />
          )}
          <span className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>

          {!isOwnMessage && (
            <MessageModerationMenu
              messageId={message.id}
              authorId={message.userId}
              chatType={chatType}
            />
          )}
          
          {/* Message actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {onPin && (
                <DropdownMenuItem onClick={handlePinMessage}>
                  <Pin className="h-4 w-4 mr-2" />
                  Pin Message
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleHideMessage}>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Message bubble */}
        <Card 
          className={`p-3 ${
            isOwnMessage 
              ? 'bg-primary text-primary-foreground ml-2' 
              : 'bg-card mr-2'
          } rounded-2xl ${
            isOwnMessage 
              ? 'rounded-br-md' 
              : 'rounded-bl-md'
          } shadow-sm cursor-pointer transition-all hover:shadow-md`}
          onClick={() => setShowReactions(!showReactions)}
        >
          {renderMessageContent()}
        </Card>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex gap-1 mt-1 ${isOwnMessage ? 'justify-end mr-2' : 'justify-start ml-2'}`}>
            {message.reactions.map((reaction) => (
              <Button
                key={reaction.emoji}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs rounded-full bg-secondary/50 hover:bg-secondary"
                onClick={() => handleReaction && handleReaction(message.id, reaction.emoji)}
              >
                {reaction.emoji} {reaction.count}
              </Button>
            ))}
          </div>
        )}

        {/* Reaction picker */}
        {showReactions && (
          <div className={`flex gap-1 mt-2 p-2 bg-popover border rounded-lg shadow-md ${isOwnMessage ? 'mr-2' : 'ml-2'}`}>
            {REACTION_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:bg-secondary"
                onClick={() => {
                  handleReaction && handleReaction(message.id, emoji);
                  setShowReactions(false);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};