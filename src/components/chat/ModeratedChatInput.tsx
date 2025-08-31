import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, AlertTriangle } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { GiphyPicker } from './GiphyPicker';
import { ChatToolsPanel } from './ChatToolsPanel';
import { useModeration } from '@/hooks/useModeration';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ModeratedChatInputProps {
  onSendMessage: (content: string, type: 'text') => void;
  onSendGif: (gifUrl: string) => void;
  onSendVoice: (audioBlob: Blob) => void;
  onToolSelect?: (tool: string) => void;
  chatType: 'group' | 'private';
  disabled?: boolean;
}

export const ModeratedChatInput = ({ 
  onSendMessage, 
  onSendGif, 
  onSendVoice, 
  onToolSelect, 
  chatType,
  disabled 
}: ModeratedChatInputProps) => {
  const [message, setMessage] = useState('');
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { moderateContent, checkUserStatus } = useModeration();
  const { user } = useAuth();

  const handleSendText = async () => {
    if (!message.trim() || !user) return;

    // Check if user is locked out
    const userStatus = await checkUserStatus(user.id);
    if (userStatus.isLockedOut) {
      toast.error('You are temporarily locked out from sending messages');
      return;
    }

    // Check for slash commands
    if (message.startsWith('/') && onToolSelect) {
      const command = message.slice(1).toLowerCase();
      const validCommands = ['poll', 'playlist', 'addsong', 'wouldyourather', 'truthslie', 'thisorthat', 'emojiriddle'];
      
      if (validCommands.includes(command)) {
        onToolSelect(command);
        setMessage('');
        return;
      }
    }

    setIsChecking(true);
    
    try {
      // Generate a temporary message ID for moderation
      const tempMessageId = `temp-${Date.now()}-${Math.random()}`;
      
      // Run content moderation
      const moderationResult = await moderateContent(message.trim(), tempMessageId, chatType);
      
      if (moderationResult.flagged) {
        // Handle flagged content
        if (moderationResult.escalation) {
          const { status, newCount } = moderationResult.escalation;
          
          if (status === 'warned') {
            toast.error(`Warning: Your message contains inappropriate content. This is your ${newCount} offense.`);
          } else if (status === 'shadow_muted') {
            toast.error(`Your message has been blocked. You are shadow muted for 24 hours due to ${newCount} violations.`);
          } else if (status === 'locked_out') {
            toast.error(`Your account is locked for 7 days due to ${newCount} violations.`);
          }
        } else {
          toast.error('Your message contains inappropriate content and cannot be sent.');
        }
        
        // Don't send the message
        setMessage('');
        return;
      }

      // If moderation passes or isn't flagged, send the message
      onSendMessage(message.trim(), 'text');
      setMessage('');
      
    } catch (error) {
      console.error('Moderation check failed:', error);
      // Fail open - allow message if moderation fails
      onSendMessage(message.trim(), 'text');
      setMessage('');
    } finally {
      setIsChecking(false);
    }
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

  return (
    <div className="border-t bg-background p-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="text message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled || isChecking}
            className="min-h-[40px] max-h-[120px] resize-none rounded-2xl"
            rows={1}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <ChatToolsPanel 
            onToolSelect={handleToolSelect}
            isOpen={showToolsPanel}
            onToggle={() => setShowToolsPanel(!showToolsPanel)}
          />
          <GiphyPicker onGifSelect={onSendGif} disabled={disabled || isChecking} />
          <VoiceRecorder onRecordingComplete={onSendVoice} disabled={disabled || isChecking} />
          <Button
            onClick={handleSendText}
            disabled={disabled || !message.trim() || isChecking}
            size="sm"
            className="h-10 w-10 p-0 rounded-full"
          >
            {isChecking ? (
              <AlertTriangle className="h-4 w-4 animate-pulse" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};