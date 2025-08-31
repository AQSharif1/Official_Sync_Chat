import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PrivateMessage {
  id: string;
  private_chat_id: string;
  user_id: string;
  content?: string;
  message_type: 'text' | 'gif' | 'voice';
  gif_url?: string;
  voice_audio_url?: string;
  voice_transcription?: string;
  created_at: Date;
  reactions?: { emoji: string; count: number; userIds: string[] }[];
}

export const usePrivateChat = (chatId: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    if (!chatId) return;
    
    setLoading(true);
    const { data: messagesData, error: messagesError } = await supabase
      .from('private_messages' as any)
      .select('*')
      .eq('private_chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      setLoading(false);
      return;
    }

    // Fetch reactions for each message
    const messageIds = messagesData?.map((msg: any) => msg.id) || [];
    let reactionsData: any[] = [];
    
    if (messageIds.length > 0) {
      const { data: reactions } = await supabase
        .from('private_message_reactions' as any)
        .select('*')
        .in('message_id', messageIds);
      
      reactionsData = reactions || [];
    }

    // Group reactions by message
    const messageReactions = reactionsData.reduce((acc: any, reaction: any) => {
      if (!acc[reaction.message_id]) {
        acc[reaction.message_id] = {};
      }
      if (!acc[reaction.message_id][reaction.emoji]) {
        acc[reaction.message_id][reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          userIds: []
        };
      }
      acc[reaction.message_id][reaction.emoji].count++;
      acc[reaction.message_id][reaction.emoji].userIds.push(reaction.user_id);
      return acc;
    }, {});

    const processedMessages = messagesData?.map((msg: any) => ({
      ...msg,
      created_at: new Date(msg.created_at),
      reactions: messageReactions[msg.id] ? Object.values(messageReactions[msg.id]) : []
    })) || [];

    setMessages(processedMessages);
    setLoading(false);
  };

  const sendMessage = async (content: string, type: 'text' | 'gif' | 'voice', metadata?: { gifUrl?: string; voiceAudioUrl?: string; voiceTranscription?: string }) => {
    if (!user || !chatId) return false;

    const messageData: any = {
      private_chat_id: chatId,
      user_id: user.id,
      message_type: type,
    };

    if (type === 'text') {
      messageData.content = content;
    } else if (type === 'gif' && metadata?.gifUrl) {
      messageData.gif_url = metadata.gifUrl;
    } else if (type === 'voice' && metadata?.voiceAudioUrl) {
      messageData.voice_audio_url = metadata.voiceAudioUrl;
      if (metadata.voiceTranscription) {
        messageData.voice_transcription = metadata.voiceTranscription;
      }
    }

    const { error } = await supabase
      .from('private_messages' as any)
      .insert(messageData);

    if (error) {
      console.error('Error sending message:', error);
      return false;
    }

    await fetchMessages();
    return true;
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return false;

    // Check if user already reacted with this emoji
    const { data: existingReaction } = await supabase
      .from('private_message_reactions' as any)
      .select('*')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single();

    if (existingReaction) {
      // Remove reaction
      await supabase
        .from('private_message_reactions' as any)
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      // Add reaction
      await supabase
        .from('private_message_reactions' as any)
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });
    }

    await fetchMessages();
    return true;
  };

  useEffect(() => {
    if (chatId) {
      fetchMessages();
    }
  }, [chatId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!chatId) return;

    const messageChannel = supabase
      .channel(`private_messages_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_messages',
          filter: `private_chat_id=eq.${chatId}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    const reactionChannel = supabase
      .channel(`private_reactions_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_message_reactions'
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(reactionChannel);
    };
  }, [chatId]);

  return {
    messages,
    loading,
    sendMessage,
    addReaction,
    refetch: fetchMessages
  };
};