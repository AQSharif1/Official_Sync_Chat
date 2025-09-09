import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { GiphyPicker } from './GiphyPicker';
import { ChatToolsPanel } from './ChatToolsPanel';
import { GameQuickPicker } from './GameQuickPicker';
import { Volume2 } from 'lucide-react';
import { useVoiceRoom } from '@/contexts/VoiceRoomContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { validateChatMessage } from '@/lib/security';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSendMessage: (content: string, type: 'text') => Promise<boolean>;
  onSendGif: (gifUrl: string) => Promise<boolean>;
  onSendVoice: (audioBlob: Blob) => Promise<boolean>;
  onToolSelect?: (tool: string) => void;
  disabled?: boolean;
  loading?: boolean;
  groupId?: string;
  groupName?: string;
}

export const ChatInput = ({ onSendMessage, onSendGif, onSendVoice, onToolSelect, disabled, loading, groupId, groupName }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const { toast } = useToast();
  const { joinVoiceRoom, leaveVoiceRoom, isConnected } = useVoiceRoom();

  const handleSendText = async () => {
    if (message.trim() && !sendingMessage) {
      // Validate and sanitize the message
      const validation = validateChatMessage(message);
      
      if (!validation.isValid) {
        toast({
          title: "Invalid Message",
          description: validation.error || "Message contains invalid content",
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
          return;
        }
      }
      
      setSendingMessage(true);
      const success = await onSendMessage(validation.sanitizedMessage, 'text');
      if (success) {
        setMessage('');
      }
      setSendingMessage(false);
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
    <div className="border-t bg-background/80 backdrop-blur-sm p-4 sticky bottom-0">
      <div className="flex gap-2 items-end max-w-6xl mx-auto">
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="text message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled || sendingMessage || loading}
            className="min-h-[40px] max-h-[120px] resize-none rounded-2xl border-2 focus:border-primary/50 transition-colors"
            rows={1}
          />
          {sendingMessage && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoadingSpinner size="sm" />
              Sending message...
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1">
            <ChatToolsPanel 
              onToolSelect={handleToolSelect}
              isOpen={showToolsPanel}
              onToggle={() => setShowToolsPanel(!showToolsPanel)}
            />
            <GameQuickPicker onGameSelect={handleToolSelect} disabled={disabled} />
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (groupId && groupName) {
                  if (isConnected) {
                    await leaveVoiceRoom();
                  } else {
                    await joinVoiceRoom(groupId, groupName);
                  }
                }
              }}
              disabled={disabled || !groupId || !groupName}
              className={`hover-scale ${isConnected ? 'bg-green-100 border-green-300 text-green-700' : ''}`}
              title="Voice Room"
            >
              <Volume2 className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            <GiphyPicker onGifSelect={onSendGif} disabled={disabled || sendingMessage} />
            <VoiceRecorder onRecordingComplete={onSendVoice} disabled={disabled || sendingMessage} />
          </div>
          
          <Button
            onClick={handleSendText}
            disabled={disabled || !message.trim() || sendingMessage || loading}
            size="sm"
            className="h-10 w-10 p-0 rounded-full hover-scale shadow-elegant"
          >
            {sendingMessage ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};