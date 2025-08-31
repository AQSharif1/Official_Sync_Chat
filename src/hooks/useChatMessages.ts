import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  content?: string;
  messageType: 'text' | 'gif' | 'voice';
  gifUrl?: string;
  voiceAudioUrl?: string;
  voiceTranscription?: string;
  username: string;
  timestamp: Date;
  userId: string;
  reactions?: { emoji: string; count: number; userIds: string[] }[];
}

export const useChatMessages = (groupId: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('Fetching messages for group:', groupId);
      
      // Single optimized query with JOINs for better performance
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          message_type,
          gif_url,
          voice_audio_url,
          voice_transcription,
          created_at,
          user_id,
          profiles (
            username,
            mood_emoji
          ),
          message_reactions (
            emoji,
            user_id
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(50); // Limit chat history to last 50 messages for performance

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      console.log('Messages fetched:', data?.length || 0);

      // Transform to ChatMessage format with optimized data processing
      const transformedMessages: ChatMessage[] = data?.map(msg => {
        // Group reactions by emoji for this message
        const messageReactions = msg.message_reactions || [];
        const reactionGroups = messageReactions.reduce((acc: any[], reaction) => {
          const existing = acc.find(r => r.emoji === reaction.emoji);
          if (existing) {
            existing.count += 1;
            existing.userIds.push(reaction.user_id);
          } else {
            acc.push({
              emoji: reaction.emoji,
              count: 1,
              userIds: [reaction.user_id]
            });
          }
          return acc;
        }, []);

        return {
          id: msg.id,
          content: msg.content,
          messageType: msg.message_type as 'text' | 'gif' | 'voice',
          gifUrl: msg.gif_url,
          voiceAudioUrl: msg.voice_audio_url,
          voiceTranscription: msg.voice_transcription,
          username: msg.profiles?.username || 'Unknown User',
          timestamp: new Date(msg.created_at),
          userId: msg.user_id,
          reactions: reactionGroups
        };
      }) || [];

      console.log('Transformed messages:', transformedMessages.length);
      setMessages(transformedMessages);
      
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const setupRealtimeSubscription = useCallback(() => {
    console.log('Setting up real-time subscription for group:', groupId);
    
    const channelName = `chat-${groupId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('🆕 NEW MESSAGE RECEIVED:', payload.new);
          // Refetch messages to get the new one with proper formatting
          setTimeout(() => fetchMessages(), 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions'
        },
        (payload) => {
          console.log('👍 NEW REACTION:', payload.new);
          setTimeout(() => fetchMessages(), 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions'
        },
        (payload) => {
          console.log('👎 REACTION REMOVED:', payload.old);
          setTimeout(() => fetchMessages(), 100);
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up subscription:', channelName);
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchMessages]);

  useEffect(() => {
    if (groupId) {
      console.log('🚀 Setting up chat for group:', groupId);
      fetchMessages();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [groupId, fetchMessages, setupRealtimeSubscription]);

  const addMessage = async (messageData: {
    content?: string;
    messageType: 'text' | 'gif' | 'voice';
    gifUrl?: string;
    voiceAudioUrl?: string;
    voiceTranscription?: string;
  }): Promise<boolean> => {
    if (!user) {
      console.error('No user found when trying to send message');
      return false;
    }

    try {
      console.log('📤 SENDING MESSAGE:', messageData);
      
      const messageToInsert = {
        content: messageData.content,
        message_type: messageData.messageType,
        gif_url: messageData.gifUrl,
        voice_audio_url: messageData.voiceAudioUrl,
        voice_transcription: messageData.voiceTranscription,
        user_id: user.id,
        group_id: groupId
      };

      console.log('💾 Inserting into database:', messageToInsert);

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageToInsert)
        .select();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Message inserted successfully:', data);
      
      // Track karma activity for the message
      try {
        await supabase.rpc('track_karma_activity', {
          p_user_id: user.id,
          p_group_id: groupId,
          p_activity_type: 'message',
          p_points: 2,
          p_description: 'Sent a message'
        });
      } catch (karmaError) {
        console.warn('Failed to track karma for message:', karmaError);
      }
      
      // Don't refetch here - let real-time handle it
      return true;
      
    } catch (error) {
      console.error('💥 Error adding message:', error);
      toast.error('Failed to send message');
      return false;
    }
  };

  const addReaction = async (messageId: string, emoji: string): Promise<boolean> => {
    if (!user) return false;

    try {
      console.log('Adding reaction:', { messageId, emoji, userId: user.id });
      
      // Get the message to find the group_id for karma tracking
      const { data: messageData } = await supabase
        .from('chat_messages')
        .select('group_id')
        .eq('id', messageId)
        .single();
      
      // Check if user already reacted with this emoji
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
        console.log('Reaction removed');
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
        console.log('Reaction added');
        
        // Track karma activity for the reaction
        if (messageData?.group_id) {
          try {
            await supabase.rpc('track_karma_activity', {
              p_user_id: user.id,
              p_group_id: messageData.group_id,
              p_activity_type: 'reaction',
              p_points: 1,
              p_description: 'Gave a reaction'
            });
          } catch (karmaError) {
            console.warn('Failed to track karma for reaction:', karmaError);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast.error('Failed to add reaction');
      return false;
    }
  };

  return {
    messages,
    loading,
    addMessage,
    addReaction,
    refetch: fetchMessages
  };
};