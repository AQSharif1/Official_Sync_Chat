import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePremium } from './usePremium';

export interface ReconnectionRequest {
  id: string;
  requester_id: string;
  target_user_id: string;
  group_id: string;
  created_at: Date;
}

export interface PrivateChat {
  id: string;
  user1_id: string;
  user2_id: string;
  user1_alias: string;
  user2_alias: string;
  is_user1_favorited: boolean;
  is_user2_favorited: boolean;
  is_user1_blocked: boolean;
  is_user2_blocked: boolean;
  is_user1_muted: boolean;
  is_user2_muted: boolean;
  created_at: Date;
  updated_at: Date;
}

export const useReconnectDM = () => {
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const [requests, setRequests] = useState<ReconnectionRequest[]>([]);
  const [privateChats, setPrivateChats] = useState<PrivateChat[]>([]);
  const [loading, setLoading] = useState(false);

  // Check if user can access DM features
  const canAccessDM = () => {
    return user && isPremium;
  };

  const fetchRequests = async () => {
    if (!canAccessDM()) return;
    
    const { data, error } = await supabase
      .from('reconnection_requests' as any)
      .select('*')
      .or(`requester_id.eq.${user.id},target_user_id.eq.${user.id}`);
    
    if (error) {
      console.error('Error fetching reconnection requests:', error);
      return;
    }
    
    setRequests(data?.map((req: any) => ({
      ...req,
      created_at: new Date(req.created_at)
    })) || []);
  };

  const fetchPrivateChats = async () => {
    if (!canAccessDM()) return;
    
    const { data, error } = await supabase
      .from('private_chats' as any)
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching private chats:', error);
      return;
    }
    
    setPrivateChats(data?.map((chat: any) => ({
      ...chat,
      created_at: new Date(chat.created_at),
      updated_at: new Date(chat.updated_at)
    })) || []);
  };

  const sendReconnectionRequest = async (targetUserId: string, groupId: string) => {
    if (!canAccessDM()) {
      throw new Error('Premium subscription required to send DM requests');
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('reconnection_requests' as any)
        .insert({
          requester_id: user.id,
          target_user_id: targetUserId,
          group_id: groupId
        });
      
      if (error) {
        console.error('Error sending reconnection request:', error);
        throw error;
      }
      
      // Update user engagement (premium users have unlimited reconnects)
      await supabase.rpc('update_user_engagement', {
        p_user_id: user.id,
        p_activity_type: 'reconnect'
      });
      
      await fetchRequests();
      await fetchPrivateChats(); // Refresh in case a mutual match was created
      return true;
    } catch (error) {
      console.error('Error sending reconnection request:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (chatId: string, isFavorited: boolean) => {
    if (!canAccessDM()) return false;
    
    const { data: chat } = await supabase
      .from('private_chats' as any)
      .select('*')
      .eq('id', chatId)
      .single();
    
    if (!chat) return false;
    
    const isUser1 = (chat as any).user1_id === user.id;
    const updateField = isUser1 ? 'is_user1_favorited' : 'is_user2_favorited';
    
    const { error } = await supabase
      .from('private_chats' as any)
      .update({ [updateField]: isFavorited })
      .eq('id', chatId);
    
    if (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
    
    await fetchPrivateChats();
    return true;
  };

  const blockUser = async (chatId: string) => {
    if (!canAccessDM()) return false;
    
    const { data: chat } = await supabase
      .from('private_chats' as any)
      .select('*')
      .eq('id', chatId)
      .single();
    
    if (!chat) return false;
    
    const isUser1 = (chat as any).user1_id === user.id;
    const updateField = isUser1 ? 'is_user1_blocked' : 'is_user2_blocked';
    
    const { error } = await supabase
      .from('private_chats' as any)
      .update({ [updateField]: true })
      .eq('id', chatId);
    
    if (error) {
      console.error('Error blocking user:', error);
      return false;
    }
    
    await fetchPrivateChats();
    return true;
  };

  const muteUser = async (chatId: string, isMuted: boolean) => {
    if (!canAccessDM()) return false;
    
    const { data: chat } = await supabase
      .from('private_chats' as any)
      .select('*')
      .eq('id', chatId)
      .single();
    
    if (!chat) return false;
    
    const isUser1 = (chat as any).user1_id === user.id;
    const updateField = isUser1 ? 'is_user1_muted' : 'is_user2_muted';
    
    const { error } = await supabase
      .from('private_chats' as any)
      .update({ [updateField]: isMuted })
      .eq('id', chatId);
    
    if (error) {
      console.error('Error muting user:', error);
      return false;
    }
    
    await fetchPrivateChats();
    return true;
  };

  useEffect(() => {
    if (canAccessDM()) {
      fetchRequests();
      fetchPrivateChats();
    }
  }, [user, isPremium]);

  return {
    requests,
    privateChats,
    loading: loading || premiumLoading,
    canAccessDM: canAccessDM(),
    isPremium,
    sendReconnectionRequest,
    toggleFavorite,
    blockUser,
    muteUser,
    refetch: () => {
      if (canAccessDM()) {
        fetchRequests();
        fetchPrivateChats();
      }
    }
  };
};