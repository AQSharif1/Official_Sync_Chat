import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from './useChatMessages';
import { useToast } from '@/hooks/use-toast';

interface UseOptimizedRealtimeChatProps {
  groupId: string | null;
  onNewMessage: (message: ChatMessage) => void;
  onReactionUpdate: () => void;
  enableProfileCaching?: boolean;
  enableBatchProcessing?: boolean;
}

export const useOptimizedRealtimeChat = ({ 
  groupId, 
  onNewMessage, 
  onReactionUpdate,
  enableProfileCaching = true,
  enableBatchProcessing = true
}: UseOptimizedRealtimeChatProps) => {
  const { toast } = useToast();
  const subscriptionRef = useRef<any>(null);
  const profileCache = useRef<Map<string, string>>(new Map());
  const messageQueue = useRef<ChatMessage[]>([]);
  const processingTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // Batch process messages
  const processMessageQueue = useCallback(async () => {
    if (messageQueue.current.length === 0) return;

    const messagesToProcess = [...messageQueue.current];
    messageQueue.current = [];

    if (enableBatchProcessing && messagesToProcess.length > 1) {
      // Batch fetch profiles
      const userIds = [...new Set(messagesToProcess.map(msg => msg.userId))];
      const uncachedUserIds = userIds.filter(id => !profileCache.current.has(id));

      if (uncachedUserIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username')
            .in('user_id', uncachedUserIds);

          if (profiles) {
            profiles.forEach(profile => {
              profileCache.current.set(profile.user_id, profile.username);
            });
          }
        } catch (error) {
          console.error('Error batch fetching profiles:', error);
        }
      }

      // Process all messages with cached profiles
      messagesToProcess.forEach(message => {
        const username = profileCache.current.get(message.userId) || 'Unknown User';
        const processedMessage: ChatMessage = {
          ...message,
          username,
        };
        onNewMessage(processedMessage);
      });
    } else {
      // Process messages individually
      for (const message of messagesToProcess) {
        const username = profileCache.current.get(message.userId) || 'Unknown User';
        const processedMessage: ChatMessage = {
          ...message,
          username,
        };
        onNewMessage(processedMessage);
      }
    }
  }, [enableBatchProcessing, onNewMessage]);

  // Debounced message processing
  const scheduleMessageProcessing = useCallback(() => {
    if (processingTimeout.current) {
      clearTimeout(processingTimeout.current);
    }

    processingTimeout.current = setTimeout(() => {
      processMessageQueue();
    }, 50); // 50ms debounce
  }, [processMessageQueue]);

  // Optimized message handler
  const handleNewMessage = useCallback(async (payload: any) => {
    const messageData = payload.new;
    
    // Create message object immediately
    const newMessage: ChatMessage = {
      id: messageData.id,
      content: messageData.content,
      messageType: messageData.message_type,
      gifUrl: messageData.gif_url,
      voiceAudioUrl: messageData.voice_audio_url,
      voiceTranscription: messageData.voice_transcription,
      username: 'Loading...', // Placeholder
      timestamp: new Date(messageData.created_at),
      userId: messageData.user_id,
      reactions: []
    };

    // Add to queue for batch processing
    messageQueue.current.push(newMessage);
    scheduleMessageProcessing();

    // Show toast for messages from other users (non-blocking)
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (currentUser && messageData.user_id !== currentUser.id) {
      // Use cached profile if available for immediate toast
      const cachedUsername = profileCache.current.get(messageData.user_id);
      const displayName = cachedUsername || 'Someone';
      
      toast({
        title: "New message",
        description: `${displayName}: ${
          newMessage.messageType === 'text' 
            ? newMessage.content?.slice(0, 50) + (newMessage.content && newMessage.content.length > 50 ? '...' : '')
            : newMessage.messageType === 'gif' 
            ? 'Sent a GIF'
            : 'Sent a voice message'
        }`,
        duration: 3000,
      });
    }
  }, [scheduleMessageProcessing, toast]);

  // Optimized reaction handler
  const handleReactionUpdate = useCallback(() => {
    // Debounce reaction updates to prevent spam
    if (processingTimeout.current) {
      clearTimeout(processingTimeout.current);
    }

    processingTimeout.current = setTimeout(() => {
      onReactionUpdate();
    }, 100);
  }, [onReactionUpdate]);

  // Connection management
  const handleConnectionStatus = useCallback((status: string) => {
    switch (status) {
      case 'SUBSCRIBED':
        setConnectionStatus('connected');
        setIsConnected(true);
        console.log('Real-time chat subscription active');
        break;
      case 'CHANNEL_ERROR':
        setConnectionStatus('error');
        setIsConnected(false);
        toast({
          title: "Connection issue",
          description: "Having trouble connecting to chat. Messages may be delayed.",
          variant: "destructive"
        });
        break;
      case 'TIMED_OUT':
        setConnectionStatus('disconnected');
        setIsConnected(false);
        toast({
          title: "Connection lost",
          description: "Connection to chat timed out. Reconnecting...",
          variant: "destructive"
        });
        break;
      default:
        setConnectionStatus('connecting');
        setIsConnected(false);
    }
  }, [toast]);

  // Setup real-time subscription
  useEffect(() => {
    if (!groupId) return;

    setConnectionStatus('connecting');

    const channel = supabase
      .channel(`chat-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${groupId}`
        },
        handleNewMessage
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        handleReactionUpdate
      )
      .subscribe(handleConnectionStatus);

    subscriptionRef.current = channel;

    // Pre-fetch active user profiles for better performance
    const preloadProfiles = async () => {
      try {
        const { data: recentMessages } = await supabase
          .from('chat_messages')
          .select('user_id')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (recentMessages) {
          const userIds = [...new Set(recentMessages.map(msg => msg.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username')
            .in('user_id', userIds);

          if (profiles) {
            profiles.forEach(profile => {
              profileCache.current.set(profile.user_id, profile.username);
            });
          }
        }
      } catch (error) {
        console.error('Error preloading profiles:', error);
      }
    };

    preloadProfiles();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (processingTimeout.current) {
        clearTimeout(processingTimeout.current);
      }
    };
  }, [groupId, handleNewMessage, handleReactionUpdate, handleConnectionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingTimeout.current) {
        clearTimeout(processingTimeout.current);
      }
      profileCache.current.clear();
      messageQueue.current = [];
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    clearCache: () => {
      profileCache.current.clear();
      messageQueue.current = [];
    },
    getCachedProfile: (userId: string) => profileCache.current.get(userId),
  };
}; 