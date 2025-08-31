import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from './useChatMessages';
import { useToast } from '@/hooks/use-toast';

interface UseRealtimeChatProps {
  groupId: string | null;
  onNewMessage: (message: ChatMessage) => void;
  onReactionUpdate: () => void;
}

export const useRealtimeChat = ({ groupId, onNewMessage, onReactionUpdate }: UseRealtimeChatProps) => {
  const { toast } = useToast();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!groupId) return;

    // Set up real-time subscription for the group
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
        async (payload) => {
          // Fetch the complete message with user info using optimized query
          const messageData = payload.new;
          
          try {
            // Get complete message data with profile and reactions in single query
            const { data: completeMessage } = await supabase
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
                  username
                ),
                message_reactions (
                  emoji,
                  user_id
                )
              `)
              .eq('id', messageData.id)
              .single();

            if (completeMessage) {
              // Group reactions by emoji for this message
              const messageReactions = completeMessage.message_reactions || [];
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

              const newMessage: ChatMessage = {
                id: completeMessage.id,
                content: completeMessage.content,
                messageType: completeMessage.message_type,
                gifUrl: completeMessage.gif_url,
                voiceAudioUrl: completeMessage.voice_audio_url,
                voiceTranscription: completeMessage.voice_transcription,
                username: completeMessage.profiles?.username || 'Unknown User',
                timestamp: new Date(completeMessage.created_at),
                userId: completeMessage.user_id,
                reactions: reactionGroups
              };

              onNewMessage(newMessage);

              // Show toast for messages from other users
              const currentUser = (await supabase.auth.getUser()).data.user;
              if (currentUser && completeMessage.user_id !== currentUser.id) {
                toast({
                  title: "New message",
                  description: `${newMessage.username}: ${
                    newMessage.messageType === 'text' 
                      ? newMessage.content?.slice(0, 50) + (newMessage.content && newMessage.content.length > 50 ? '...' : '')
                      : newMessage.messageType === 'gif' 
                      ? 'Sent a GIF'
                      : 'Sent a voice message'
                  }`,
                  duration: 3000,
                });
              }
            }
          } catch (error) {
            console.error('Error processing new message:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        () => {
          onReactionUpdate();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time chat subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          toast({
            title: "Connection issue",
            description: "Having trouble connecting to chat. Messages may be delayed.",
            variant: "destructive"
          });
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [groupId, onNewMessage, onReactionUpdate]);

  return {
    isConnected: subscriptionRef.current?.state === 'joined'
  };
};