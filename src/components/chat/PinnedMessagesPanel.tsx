import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Pin, X, Volume2, Play } from 'lucide-react';
import { PinnedMessage } from '@/hooks/usePinnedMessages';

interface PinnedMessagesPanelProps {
  pinnedMessages: PinnedMessage[];
  onUnpin: (pinnedMessageId: string) => void;
  className?: string;
}

export const PinnedMessagesPanel = ({ 
  pinnedMessages, 
  onUnpin, 
  className = "" 
}: PinnedMessagesPanelProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderPinnedContent = (message: PinnedMessage) => {
    switch (message.messageType) {
      case 'text':
        return (
          <p className="text-sm text-foreground line-clamp-2">
            {message.content}
          </p>
        );
      
      case 'gif':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">GIF</Badge>
            <span>Shared a GIF</span>
          </div>
        );
      
      case 'voice':
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Volume2 className="h-4 w-4" />
            <span>Voice message</span>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (pinnedMessages.length === 0) return null;

  return (
    <Card className={`border-b rounded-none ${className}`}>
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Pinned Messages</span>
          <Badge variant="secondary" className="text-xs">
            {pinnedMessages.length}
          </Badge>
        </div>
      </div>
      
      <ScrollArea className="max-h-32">
        <div className="p-2 space-y-2">
          {pinnedMessages.map((message) => (
            <div
              key={message.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-background hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {message.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.pinnedAt)}
                  </span>
                </div>
                {renderPinnedContent(message)}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => onUnpin(message.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};