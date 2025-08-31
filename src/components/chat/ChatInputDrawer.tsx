import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Send, AlertTriangle, Check, RotateCcw, Plus, X, Image, Gamepad2 } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { GiphyPicker } from './GiphyPicker';
import { MentionInput } from './MentionInput';
import { useModeration } from '@/hooks/useModeration';
import { useAuth } from '@/hooks/useAuth';
import { useMentions } from '@/hooks/useMentions';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useToast } from '@/hooks/use-toast';

interface ChatInputDrawerProps {
  groupId: string;
  onSendMessage: (content: string, type: 'text', mentions?: string[]) => Promise<boolean>;
  onSendGif: (gifUrl: string) => Promise<boolean>;
  onSendVoice: (audioBlob: Blob) => Promise<boolean>;
  onToolSelect?: (tool: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

const QUICK_TOOLS = [
  { id: 'gif', label: 'GIF', icon: Image, description: 'Share a GIF' },
  { id: 'wouldyourather', label: 'Would You Rather', icon: Gamepad2, description: 'Start a game' },
  { id: 'thisorthat', label: 'This or That', icon: Gamepad2, description: 'Quick poll game' },
  { id: 'poll', label: 'Poll', icon: Gamepad2, description: 'Create a poll' },
];

export const ChatInputDrawer = ({ 
  groupId,
  onSendMessage, 
  onSendGif, 
  onSendVoice, 
  onToolSelect, 
  disabled,
  loading
}: ChatInputDrawerProps) => {
  const [message, setMessage] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [retryMessage, setRetryMessage] = useState('');
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const { moderateContent, checkUserStatus } = useModeration();
  const { user } = useAuth();
  const { toast } = useToast();
  const { members, parseMentions } = useMentions(groupId);
  const { handleTyping, stopTyping } = useTypingIndicator(groupId, user?.id || '');

  // Mock user profile for now
  const userProfile = { username: user?.email?.split('@')[0] || 'User' };

  // Validate message content
  const isValidMessage = message.trim().length > 0 && message.trim().length <= 2000;

  useEffect(() => {
    // Close drawer when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsDrawerOpen(false);
      }
    };

    if (isDrawerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      stopTyping();
    };
  }, [isDrawerOpen, stopTyping]);

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
        setIsDrawerOpen(false);
        return;
      }
    }

    setIsChecking(true);
    setSendStatus('sending');
    
    try {
      // Generate a temporary message ID for moderation
      const tempMessageId = `temp-${Date.now()}-${Math.random()}`;
      
      // Run content moderation  
      const moderationResult = await moderateContent(message.trim(), tempMessageId, 'group');
      
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
        setIsDrawerOpen(false);
        
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
    } finally {
      setIsChecking(false);
    }
  };

  const handleRetry = async () => {
    if (retryMessage) {
      setMessage(retryMessage);
      setRetryMessage('');
      setSendStatus('idle');
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

  const handleToolSelect = (toolId: string) => {
    if (toolId === 'gif') {
      setShowGiphyPicker(true);
    } else if (onToolSelect) {
      onToolSelect(toolId);
    }
    setIsDrawerOpen(false);
  };

  const handleGifSelect = async (gifUrl: string) => {
    setShowGiphyPicker(false);
    setIsDrawerOpen(false);
    await onSendGif(gifUrl);
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

  return (
    <div className="relative border-t bg-background/80 backdrop-blur-sm p-2 sm:p-4 sticky bottom-0">
      {/* Quick Tools Drawer */}
      {isDrawerOpen && (
        <Card 
          ref={drawerRef}
          className="absolute bottom-full left-4 right-4 mb-2 z-50 bg-popover border shadow-lg animate-slide-in-up"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Quick Tools</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsDrawerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_TOOLS.map((tool) => (
                <Button
                  key={tool.id}
                  variant="ghost"
                  className="h-auto p-3 flex flex-col items-center gap-2 hover-scale"
                  onClick={() => handleToolSelect(tool.id)}
                >
                  <tool.icon className="h-5 w-5 text-primary" />
                  <div className="text-center">
                    <div className="text-xs font-medium">{tool.label}</div>
                    <div className="text-xs text-muted-foreground">{tool.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Giphy Picker */}
      {showGiphyPicker && (
        <div className="absolute bottom-full left-4 right-4 mb-2 z-50">
          <Card className="bg-popover border shadow-lg">
            <div className="p-2 flex items-center justify-between border-b">
              <span className="text-sm font-medium">Choose a GIF</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowGiphyPicker(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-2">
              <GiphyPicker 
                onGifSelect={handleGifSelect}
                disabled={disabled || isChecking}
                compact={true}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 flex gap-2 items-end">
          <div className="flex-1">
            <MentionInput
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onTyping={() => userProfile && handleTyping(userProfile.username)}
              members={members}
              placeholder="text message"
              disabled={disabled || isChecking}
              className={`min-h-[44px] max-h-[120px] resize-none rounded-2xl transition-all ${
                sendStatus === 'error' ? 'border-destructive' : 'border-input'
              }`}
            />
          </div>
          
          {/* Quick Tools Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-11 w-11 p-0 rounded-full transition-all hover-scale ${
              isDrawerOpen ? 'bg-primary text-primary-foreground' : ''
            }`}
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            disabled={disabled || isChecking}
          >
            {isDrawerOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSendText}
            disabled={disabled || !isValidMessage || isChecking}
            size="sm"
            variant={sendStatus === 'error' ? 'destructive' : 'default'}
            className="h-11 w-11 p-0 rounded-full transition-all hover-scale"
          >
            {getSendButtonIcon()}
          </Button>
        </div>
        
        {/* Voice Recorder */}
        <VoiceRecorder 
          onRecordingComplete={onSendVoice} 
          disabled={disabled || isChecking}
        />
      </div>
    </div>
  );
};