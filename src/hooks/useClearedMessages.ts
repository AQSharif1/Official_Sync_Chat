import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useClearedMessages = (groupId: string) => {
  const { user } = useAuth();
  const [clearedMessageIds, setClearedMessageIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load cleared messages from database
  const loadClearedMessages = useCallback(async () => {
    if (!user?.id || !groupId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_cleared_messages')
        .select('message_id')
        .eq('user_id', user.id)
        .eq('group_id', groupId);

      if (error) throw error;

      const messageIds = data?.map(item => item.message_id) || [];
      setClearedMessageIds(new Set(messageIds));
    } catch (error) {
      console.error('Error loading cleared messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, groupId]);

  // Clear messages (save to database)
  const clearMessages = useCallback(async (messageIds: string[]) => {
    if (!user?.id || !groupId || messageIds.length === 0) return;

    try {
      setLoading(true);
      
      // Insert cleared messages into database
      const clearedMessages = messageIds.map(messageId => ({
        user_id: user.id,
        group_id: groupId,
        message_id: messageId
      }));

      const { error } = await supabase
        .from('user_cleared_messages')
        .upsert(clearedMessages, { 
          onConflict: 'user_id,group_id,message_id',
          ignoreDuplicates: true 
        });

      if (error) throw error;

      // Update local state
      setClearedMessageIds(prev => {
        const newSet = new Set(prev);
        messageIds.forEach(id => newSet.add(id));
        return newSet;
      });

      return true;
    } catch (error) {
      console.error('Error clearing messages:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, groupId]);

  // Check if a message is cleared
  const isMessageCleared = useCallback((messageId: string) => {
    return clearedMessageIds.has(messageId);
  }, [clearedMessageIds]);

  // Load cleared messages on mount and when group changes
  useEffect(() => {
    loadClearedMessages();
  }, [loadClearedMessages]);

  return {
    clearedMessageIds,
    loading,
    clearMessages,
    isMessageCleared,
    loadClearedMessages
  };
};
