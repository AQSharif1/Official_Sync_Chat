import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useClearedMessages = (groupId: string) => {
  const { user } = useAuth();
  const [clearedMessageIds, setClearedMessageIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

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

  // Clear all cleared messages for user (called on logout)
  const clearAllClearedMessages = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_cleared_messages')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setClearedMessageIds(new Set());
    } catch (error) {
      console.error('Error clearing all cleared messages:', error);
    }
  }, [user?.id]);

  // Load cleared messages on mount and when group changes
  useEffect(() => {
    if (user?.id && groupId) {
      // Check if this is a new session
      const currentSessionId = user.id + '_' + Date.now();
      const isNewSession = sessionIdRef.current !== currentSessionId;
      
      if (isNewSession) {
        // Clear previous session's cleared messages
        setClearedMessageIds(new Set());
        sessionIdRef.current = currentSessionId;
      }
      
      loadClearedMessages();
    }
  }, [loadClearedMessages, user?.id, groupId]);

  // Clear cleared messages when user logs out
  useEffect(() => {
    if (!user?.id) {
      setClearedMessageIds(new Set());
      sessionIdRef.current = null;
    }
  }, [user?.id]);

  // Listen for logout events
  useEffect(() => {
    const handleLogout = () => {
      setClearedMessageIds(new Set());
      sessionIdRef.current = null;
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  return {
    clearedMessageIds,
    loading,
    clearMessages,
    isMessageCleared,
    loadClearedMessages,
    clearAllClearedMessages
  };
};


