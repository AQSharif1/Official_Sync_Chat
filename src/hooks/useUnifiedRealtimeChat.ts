import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface UseUnifiedRealtimeChatProps {
  groupId: string;
  onNewMessage: (message: ChatMessage) => void;
  onReactionUpdate: () => void;
  onOnlineUsersUpdate: (users: Map<string, OnlineUser>) => void;
}

export const useUnifiedRealtimeChat = ({ 
  groupId, 
  onNewMessage, 
  onReactionUpdate,
  onOnlineUsersUpdate 
}: UseUnifiedRealtimeChatProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  
  // Refs for stable references
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelayRef = useRef(1000);
  
  // Window focus handling
  const isWindowFocused = useRef(true);
  const shouldReconnect = useRef(true);

  // Profile cache for performance
  const profileCache = useRef<Map<string, any>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cleanup function
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      console.log('🧹 Cleaning up unified real-time subscription');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Fetch profile with caching
  const fetchProfile = useCallback(async (userId: string) => {
    // Check cache first
    const cached = profileCache.current.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.profile;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', userId)
        .single();

      if (profile) {
        // Cache the profile
        profileCache.current.set(userId, {
          profile,
          timestamp: Date.now()
        });
        return profile;
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }

    return { username: 'Unknown User', avatar_url: null };
  }, []);

  // Handle new message
  const handleNewMessage = useCallback(async (payload: any) => {
    const messageData = payload.new;
    
    try {
      const profile = await fetchProfile(messageData.user_id);
      
      const newMessage: ChatMessage = {
        id: messageData.id,
        content: messageData.content,
        messageType: messageData.message_type,
        gifUrl: messageData.gif_url,
        voiceAudioUrl: messageData.voice_audio_url,
        voiceTranscription: messageData.voice_transcription,
        username: profile.username,
        timestamp: new Date(messageData.created_at),
        userId: messageData.user_id,
        reactions: []
      };
      
      onNewMessage(newMessage);
    } catch (error) {
      console.error('Error processing new message:', error);
      // Fallback with minimal data
      const newMessage: ChatMessage = {
        id: messageData.id,
        content: messageData.content,
        messageType: messageData.message_type,
        gifUrl: messageData.gif_url,
        voiceAudioUrl: messageData.voice_audio_url,
        voiceTranscription: messageData.voice_transcription,
        username: 'Loading...',
        timestamp: new Date(messageData.created_at),
        userId: messageData.user_id,
        reactions: []
      };
      onNewMessage(newMessage);
    }
  }, [fetchProfile, onNewMessage]);

  // Handle online status updates
  const handleOnlineStatusUpdate = useCallback(async (payload: any) => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, last_seen_at, show_online_status')
        .in('user_id', Object.keys(payload.presence || {}));

      const onlineUsers = new Map<string, OnlineUser>();
      
      profiles?.forEach(profile => {
        const presence = payload.presence[profile.user_id];
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

  // Connection management
  const connect = useCallback(async () => {
    if (!groupId || !user || !shouldReconnect.current) return;
    
    // Clean up existing connection
    cleanup();
    
    console.log('🔌 Connecting to unified real-time chat...');
    setConnectionStatus('connecting');
    
    try {
      const channel = supabase.channel(`unified-chat-${groupId}`, {
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
          console.log('📡 Unified subscription status:', status);
          
          switch (status) {
            case 'SUBSCRIBED':
              setConnectionStatus('connected');
              setIsConnected(true);
              reconnectAttemptsRef.current = 0;
              reconnectDelayRef.current = 1000;
              console.log('✅ Unified real-time chat connected');
              break;
            case 'CHANNEL_ERROR':
              setConnectionStatus('error');
              setIsConnected(false);
              console.error('❌ Unified real-time chat error');
              break;
            case 'TIMED_OUT':
              setConnectionStatus('disconnected');
              setIsConnected(false);
              console.warn('⏰ Unified real-time chat timed out');
              break;
            default:
              setConnectionStatus('connecting');
              setIsConnected(false);
          }
        });

      channelRef.current = channel;
      
      // Track presence
      await channel.track({
        user_id: user.id,
        online_at: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error setting up unified real-time chat:', error);
      setConnectionStatus('error');
      setIsConnected(false);
    }
  }, [groupId, user, cleanup, handleNewMessage, onReactionUpdate, handleOnlineStatusUpdate]);

  // Reconnection logic with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (!shouldReconnect.current || reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('🛑 Max reconnection attempts reached or reconnection disabled');
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = Math.min(reconnectDelayRef.current * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
    
    console.log(`🔄 Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (shouldReconnect.current && isWindowFocused.current) {
        connect();
      }
    }, delay);
  }, [connect]);

  // Window focus handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      isWindowFocused.current = isVisible;
      
      if (isVisible && shouldReconnect.current && !isConnected) {
        console.log('👁️ Window focused, attempting reconnection');
        connect();
      } else if (!isVisible) {
        console.log('👁️ Window hidden, pausing reconnection attempts');
        // Don't disconnect, just pause reconnection attempts
      }
    };

    const handleFocus = () => {
      isWindowFocused.current = true;
      if (shouldReconnect.current && !isConnected) {
        console.log('🎯 Window focused, attempting reconnection');
        connect();
      }
    };

    const handleBlur = () => {
      isWindowFocused.current = false;
      // Don't disconnect on blur, just pause reconnection
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [connect, isConnected]);

  // Connection monitoring
  useEffect(() => {
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      if (isWindowFocused.current && shouldReconnect.current) {
        attemptReconnect();
      }
    }
  }, [connectionStatus, attemptReconnect]);

  // Handle user logout - disconnect immediately
  useEffect(() => {
    if (!user?.id) {
      console.log('User logged out, disconnecting real-time chat');
      shouldReconnect.current = false;
      cleanup();
    }
  }, [user?.id, cleanup]);

  // Initial connection
  useEffect(() => {
    if (groupId && user?.id) {
      shouldReconnect.current = true;
      connect();
    }

    return () => {
      shouldReconnect.current = false;
      cleanup();
    };
  }, [groupId, user?.id, connect, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnect.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected,
    connectionStatus,
    reconnect: connect,
    disconnect: cleanup
  };
};
