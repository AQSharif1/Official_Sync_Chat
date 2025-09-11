import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { GiphyPicker } from './GiphyPicker';
import { ChatToolsPanel } from './ChatToolsPanel';
import { MentionInput } from './MentionInput';
import { useModeration } from '@/hooks/useModeration';
import { useAuth } from '@/hooks/useAuth';
import { useMentions } from '@/hooks/useMentions';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useToast } from '@/hooks/use-toast';

interface EnhancedChatInputProps {
  groupId: string;
  onSendMessage: (content: string, type: 'text', mentions?: string[]) => Promise<boolean>;
  onSendGif: (gifUrl: string) => Promise<boolean>;
  onSendVoice: (audioBlob: Blob) => Promise<boolean>;
  onToolSelect?: (tool: string) => void;
  chatType: 'group' | 'private';
  disabled?: boolean;
  userProfile?: { username: string };
}

export const EnhancedChatInput = ({ 
  groupId,
  onSendMessage, 
  onSendGif, 
  onSendVoice, 
  onToolSelect, 
  chatType,
  disabled,
  userProfile
}: EnhancedChatInputProps) => {
  const [message, setMessage] = useState('');
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [retryMessage, setRetryMessage] = useState('');

  const { moderateContent, checkUserStatus } = useModeration();
  const { user } = useAuth();
  const { toast } = useToast();
  const { members, parseMentions, searchMembers } = useMentions(groupId);
  const { handleTyping, stopTyping } = useTypingIndicator(groupId, user?.id || '');

  // Validate message content
  const isValidMessage = message.trim().length > 0 && message.trim().length <= 2000;

  useEffect(() => {
    // Stop typing when component unmounts or message is sent
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  const handleInputChange = (value: string) => {
    setMessage(value);
    setSendStatus('idle');
    
    // Trigger typing indicator
    if (value.trim() && userProfile) {
      handleTyping(userProfile.username);
    } else {
      stopTyping();
    }
  };

  const handleSendText = async () => {
    if (!message.trim() || !user || !userProfile) return;

    // Check if user is locked out
    const userStatus = await checkUserStatus(user.id);
    if (userStatus.isLockedOut) {
      toast({
        title: "Message Blocked",
        description: "You are temporarily locked out from sending messages",
        variant: "destructive",
      });
      return;
    }

    // Check for slash commands
    if (message.startsWith('/') && onToolSelect) {
      const command = message.slice(1).toLowerCase();
      const validCommands = ['poll', 'playlist', 'addsong', 'wouldyourather', 'truthslie', 'thisorthat', 'emojiriddle'];
      
      if (validCommands.includes(command)) {
        onToolSelect(command);
        setMessage('');
        stopTyping();
        return;
      }
    }

    setIsChecking(true);
    setSendStatus('sending');
    
    try {
      // Generate a temporary message ID for moderation
      const tempMessageId = `temp-${Date.now()}-${Math.random()}`;
      
      // Run content moderation
      const moderationResult = await moderateContent(message.trim(), tempMessageId, chatType);
      
      if (moderationResult.flagged) {
        handleModerationFailure(moderationResult);
        setMessage('');
        stopTyping();
        return;
      }

      // Parse mentions
      const { text, mentions } = parseMentions(message.trim());

      // Optimistic update - show message immediately
      const success = await onSendMessage(text, 'text', mentions);
      
      if (success) {
        setSendStatus('success');
        setMessage('');
        stopTyping();
        
        // Clear success status after a brief moment
        setTimeout(() => setSendStatus('idle'), 1000);
      } else {
        setSendStatus('error');
        setRetryMessage(message);
        toast({
          title: "Message Failed",
          description: "Tap to retry sending your message.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </Button>
          ),
        });
      }
      
    } catch (error) {
      console.error('Moderation check failed:', error);
      setSendStatus('error');
      setRetryMessage(message);
      toast({
        title: "Message Failed",
        description: "Failed to send message. Tap to retry.",
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </Button>
        ),
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleRetry = async () => {
    if (retryMessage) {
      setMessage(retryMessage);
      setRetryMessage('');
      setSendStatus('idle');
      // Auto-send the retry message
      setTimeout(() => handleSendText(), 100);
    }
  };

  const handleModerationFailure = (moderationResult: any) => {
    if (moderationResult.escalation) {
      const { status, newCount } = moderationResult.escalation;
      
      if (status === 'warned') {
        toast({
          title: "Content Warning",
          description: `Your message contains inappropriate content. This is your ${newCount} offense.`,
          variant: "destructive",
        });
      } else if (status === 'shadow_muted') {
        toast({
          title: "Message Blocked",
          description: `You are shadow muted for 24 hours due to ${newCount} violations.`,
          variant: "destructive",
        });
      } else if (status === 'locked_out') {
        toast({
          title: "Account Locked",
          description: `Your account is locked for 7 days due to ${newCount} violations.`,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Content Blocked",
        description: "Your message contains inappropriate content and cannot be sent.",
        variant: "destructive",
      });
    }
    
    setSendStatus('error');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleToolSelect = (tool: string) => {
    if (onToolSelect) {
      onToolSelect(tool);
    }
  };

  const getSendButtonIcon = () => {
    switch (sendStatus) {
      case 'sending':
        return <AlertTriangle className="h-4 w-4 animate-pulse" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Send className="h-4 w-4" />;
    }
  };

  const getSendButtonVariant = () => {
    switch (sendStatus) {
      case 'error':
        return 'destructive' as const;
      case 'success':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-2">
          <MentionInput
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onTyping={() => userProfile && handleTyping(userProfile.username)}
            members={members}
            placeholder="text message"
            disabled={disabled || isChecking}
            className={`min-h-[40px] max-h-[120px] resize-none rounded-2xl ${
              sendStatus === 'error' ? 'border-destructive' : ''
            }`}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <ChatToolsPanel 
            onToolSelect={handleToolSelect}
            isOpen={showToolsPanel}
            onToggle={() => setShowToolsPanel(!showToolsPanel)}
          />
          <GiphyPicker 
            onGifSelect={onSendGif} 
            disabled={disabled || isChecking} 
          />
          <VoiceRecorder 
            onRecordingComplete={onSendVoice} 
            disabled={disabled || isChecking} 
          />
          <Button
            onClick={handleSendText}
            disabled={disabled || !isValidMessage || isChecking}
            size="sm"
            variant={getSendButtonVariant()}
            className="h-10 w-10 p-0 rounded-full transition-all"
          >
            {getSendButtonIcon()}
          </Button>
        </div>
      </div>
    </div>
  );
};