import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface PinnedMessage {
  id: string;
  messageId: string;
  content: string;
  username: string;
  pinnedBy: string;
  pinnedAt: Date;
  messageType: 'text' | 'gif' | 'voice';
  gifUrl?: string;
  voiceAudioUrl?: string;
}

export const usePinnedMessages = (groupId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupId) {
      fetchPinnedMessages();
      setupRealtimeSubscription();
    }
  }, [groupId]);

  const fetchPinnedMessages = async () => {
    try {
      setLoading(true);
      
      // Since we don't have a pinned_messages table yet, we'll simulate it
      // In a real implementation, you'd create this table via migration
      setPinnedMessages([]);
    } catch (error) {
      console.error('Error fetching pinned messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // Real-time subscription would go here once the table exists
    return () => {};
  };

  const pinMessage = async (messageId: string, content: string, username: string, messageType: 'text' | 'gif' | 'voice', gifUrl?: string, voiceAudioUrl?: string) => {
    if (!user) return false;

    try {
      // For now, simulate pinning by adding to local state
      // In real implementation, this would insert into pinned_messages table
      const newPinnedMessage: PinnedMessage = {
        id: `pinned-${Date.now()}`,
        messageId,
        content,
        username,
        pinnedBy: user.id,
        pinnedAt: new Date(),
        messageType,
        gifUrl,
        voiceAudioUrl
      };

      setPinnedMessages(prev => [...prev, newPinnedMessage]);
      
      toast({
        title: "Message Pinned",
        description: "Message has been pinned to the top of the chat.",
      });

      return true;
    } catch (error) {
      console.error('Error pinning message:', error);
      toast({
        title: "Pin Failed",
        description: "Failed to pin message. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const unpinMessage = async (pinnedMessageId: string) => {
    if (!user) return false;

    try {
      setPinnedMessages(prev => prev.filter(msg => msg.id !== pinnedMessageId));
      
      toast({
        title: "Message Unpinned",
        description: "Message has been removed from pinned messages.",
      });

      return true;
    } catch (error) {
      console.error('Error unpinning message:', error);
      toast({
        title: "Unpin Failed",
        description: "Failed to unpin message. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    pinnedMessages,
    loading,
    pinMessage,
    unpinMessage
  };
};