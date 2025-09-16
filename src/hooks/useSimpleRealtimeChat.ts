import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  content?: string;
  messageType: 'text' | 'gif' | 'voice';
  gifUrl?: string;
  voiceAudioUrl?: string;
  voiceTranscription?: string;
  username: string;
  timestamp: Date;
  userId: string;
  reactions: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
}

interface OnlineUser {
  user_id: string;
  username: string;
  last_seen_at: string;
  isOnline: boolean;
  showOnlineStatus: boolean;
}

interface UseSimpleRealtimeChatProps {
  groupId: string;
  onNewMessage: (message: ChatMessage) => void;
  onReactionUpdate: () => void;
  onOnlineUsersUpdate: (users: Map<string, OnlineUser>) => void;
}

export const useSimpleRealtimeChat = ({ 
  groupId, 
  onNewMessage, 
  onReactionUpdate,
  onOnlineUsersUpdate 
}: UseSimpleRealtimeChatProps) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      console.log('🧹 Cleaning up real-time subscription');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Handle new message
  const handleNewMessage = useCallback(async (payload: any) => {
    if (!isMountedRef.current) return;
    
    const messageData = payload.new;
    
    try {
      // Get username from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', messageData.user_id)
        .single();
      
      const newMessage: ChatMessage = {
        id: messageData.id,
        content: messageData.content,
        messageType: messageData.message_type,
        gifUrl: messageData.gif_url,
        voiceAudioUrl: messageData.voice_audio_url,
        voiceTranscription: messageData.voice_transcription,
        username: profile?.username || 'Unknown User',
        timestamp: new Date(messageData.created_at),
        userId: messageData.user_id,
        reactions: []
      };
      
      onNewMessage(newMessage);
    } catch (error) {
      console.error('Error processing new message:', error);
    }
  }, [onNewMessage]);

  // Handle online status updates
  const handleOnlineStatusUpdate = useCallback(async (payload: any) => {
    if (!isMountedRef.current) return;
    
    try {
      const presenceState = payload.presence || {};
      const userIds = Object.keys(presenceState);
      
      if (userIds.length === 0) {
        onOnlineUsersUpdate(new Map());
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, last_seen_at, show_online_status, is_online')
        .in('user_id', userIds);

      const onlineUsers = new Map<string, OnlineUser>();
      
      profiles?.forEach(profile => {
        const presence = presenceState[profile.user_id];
        const isOnline = presence && presence.length > 0;
        
        onlineUsers.set(profile.user_id, {
          user_id: profile.user_id,
          username: profile.username,
          last_seen_at: profile.last_seen_at,
          isOnline: isOnline && profile.show_online_status,
          showOnlineStatus: profile.show_online_status
        });
      });

      onOnlineUsersUpdate(onlineUsers);
    } catch (error) {
      console.error('Error processing online status update:', error);
    }
  }, [onOnlineUsersUpdate]);

  // Connect to real-time
  const connect = useCallback(() => {
    if (!groupId || !user?.id || channelRef.current) return;
    
    console.log('🔌 Connecting to real-time chat...');
    
    const channel = supabase.channel(`chat-${groupId}`, {
      config: {
        presence: { key: user.id }
      }
    });

    // Set up event handlers
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `group_id=eq.${groupId}`
      }, handleNewMessage)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: `group_id=eq.${groupId}`
      }, onReactionUpdate)
      .on('presence', { event: 'sync' }, handleOnlineStatusUpdate)
      .on('presence', { event: 'join' }, handleOnlineStatusUpdate)
      .on('presence', { event: 'leave' }, handleOnlineStatusUpdate)
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log('✅ Real-time chat connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          console.log('❌ Real-time chat disconnected');
        }
      });

    channelRef.current = channel;
    
    // Track presence
    channel.track({
      user_id: user.id,
      online_at: new Date().toISOString()
    });
  }, [groupId, user?.id, handleNewMessage, onReactionUpdate, handleOnlineStatusUpdate]);

  // Initialize connection
  useEffect(() => {
    if (groupId && user?.id) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [groupId, user?.id]); // FIXED: Remove connect and cleanup dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []); // FIXED: Remove cleanup dependency

  return {
    isConnected,
    reconnect: connect,
    disconnect: cleanup
  };
};
