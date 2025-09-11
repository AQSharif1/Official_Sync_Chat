import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatMessage {
  id: string;
  content: string;
  message_type: string;
  gif_url?: string;
  voice_audio_url?: string;
  voice_transcription?: string;
  user_id: string;
  group_id: string;
  created_at: string;
  updated_at: string;
  username?: string;
  mood_emoji?: string;
  reactions?: MessageReaction[];
}

interface MessageReaction {
  id: string;
  emoji: string;
  user_id: string;
  message_id: string;
  created_at: string;
}

/**
 * Optimized chat messages hook with smart caching and real-time management
 * Replaces the complex memory management with a clean, efficient system
 */
export const useOptimizedChatMessages = (groupId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup and optimization
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastFetchTime = useRef<number>(0);
  const messageCache = useRef<Map<string, ChatMessage[]>>(new Map());
  
  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  // Cleanup function for real-time subscriptions
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Optimized message fetching with caching
  const fetchMessages = useCallback(async (forceRefresh = false) => {
    if (!groupId || !user?.id) return;

    const now = Date.now();
    const cacheKey = `${groupId}-${user.id}`;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh && messageCache.current.has(cacheKey)) {
      const cachedData = messageCache.current.get(cacheKey);
      const timeSinceLastFetch = now - lastFetchTime.current;
      
      if (cachedData && timeSinceLastFetch < CACHE_DURATION) {

        setMessages(cachedData);
        return cachedData;
      }
    }

    try {
      setLoading(true);
      setError(null);


      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          message_type,
          gif_url,
          voice_audio_url,
          voice_transcription,
          user_id,
          group_id,
          created_at,
          updated_at
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;

      // Get user profiles for all message senders
      const userIds = [...new Set(messagesData?.map(m => m.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, mood_emoji')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const { data: reactionsData, error: reactionsError } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messagesData?.map(m => m.id) || []);

      if (reactionsError) throw reactionsError;

      // Transform and enrich messages
      const enrichedMessages: ChatMessage[] = (messagesData || []).map(msg => {
        const profile = profilesData?.find(p => p.user_id === msg.user_id);
        return {
          ...msg,
          username: profile?.username,
          mood_emoji: profile?.mood_emoji,
          reactions: reactionsData?.filter(r => r.message_id === msg.id) || []
        };
      });

      // Update cache
      messageCache.current.set(cacheKey, enrichedMessages);
      lastFetchTime.current = now;
      
      setMessages(enrichedMessages);
      return enrichedMessages;

    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
      return [];
    } finally {
      setLoading(false);
    }
  }, [groupId, user?.id]);

  // Setup optimized real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!groupId || !user?.id) return;

    // Clean up existing subscription
    cleanup();

    
    
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
        (payload) => {

          
          // Optimistically add the new message
          setMessages(prev => {
            const newMessage = payload.new as ChatMessage;
            const exists = prev.find(m => m.id === newMessage.id);
            if (exists) return prev;
            
            return [...prev, newMessage].slice(-50); // Keep last 50 messages
          });
          
          // Update cache
          const cacheKey = `${groupId}-${user.id}`;
          const cachedMessages = messageCache.current.get(cacheKey);
          if (cachedMessages) {
            const updatedCache = [...cachedMessages, payload.new as ChatMessage].slice(-50);
            messageCache.current.set(cacheKey, updatedCache);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions'
        },
        () => {
          // Refresh messages to get updated reactions
  
          fetchMessages(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions'
        },
        () => {
          // Refresh messages to get updated reactions
  
          fetchMessages(true);
        }
      )
      .subscribe((status) => {

      });

    channelRef.current = channel;
  }, [groupId, user?.id, cleanup, fetchMessages]);

  // Add a new message
  const addMessage = useCallback(async (content: string, messageType = 'text', gifUrl?: string) => {
    if (!groupId || !user?.id || !content.trim()) return false;

    try {
  
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          content: content.trim(),
          message_type: messageType,
          gif_url: gifUrl,
          user_id: user.id,
          group_id: groupId
        });

      if (error) throw error;
      
      // Message will be added via real-time subscription
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      return false;
    }
  }, [groupId, user?.id]);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id) return false;

    try {
  
      
      // Check if reaction already exists
      const { data: existingReaction } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existingReaction) {
        // Remove existing reaction
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);
          
        if (error) throw error;
      } else {
        // Add new reaction
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji
          });
          
        if (error) throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error managing reaction:', error);
      setError('Failed to add reaction');
      return false;
    }
  }, [user?.id]);

  // Initial fetch and subscription setup
  useEffect(() => {
    if (groupId && user?.id) {
      fetchMessages();
      setupRealtimeSubscription();
    }

    return cleanup;
  }, [groupId, user?.id, fetchMessages, setupRealtimeSubscription, cleanup]);

  // Clear cache when user changes
  useEffect(() => {
    if (!user?.id) {
      messageCache.current.clear();
      setMessages([]);
    }
  }, [user?.id]);

  return {
    messages,
    loading,
    error,
    addMessage,
    addReaction,
    refetch: () => fetchMessages(true),
    clearCache: () => {
      messageCache.current.clear();
      lastFetchTime.current = 0;
    }
  };
};