import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface OnlineUser {
  user_id: string;
  username: string;
  last_seen_at: string;
  isOnline: boolean;
  showOnlineStatus: boolean;
}

export const useSimpleOnlineStatus = (groupId: string) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
  const [isOnline, setIsOnline] = useState(false);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Update user's online status in database
  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('profiles')
        .update({
          last_seen_at: new Date().toISOString(),
          is_online: isOnline
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }, [user?.id]);

  // Set user as offline
  const setOffline = useCallback(async () => {
    setIsOnline(false);
    await updateOnlineStatus(false);
  }, [updateOnlineStatus]);

  // Set user as online
  const setOnline = useCallback(async () => {
    if (!user?.id) return;
    setIsOnline(true);
    await updateOnlineStatus(true);
  }, [updateOnlineStatus, user?.id]);

  // Fetch online users for the group
  const fetchOnlineUsers = useCallback(async () => {
    if (!groupId || !user?.id || !isMountedRef.current) return;

    try {
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select(`
          user_id,
          profiles(
            username,
            last_seen_at,
            is_online,
            show_online_status
          )
        `)
        .eq('group_id', groupId);

      if (groupMembers) {
        const onlineUsersMap = new Map<string, OnlineUser>();
        
        groupMembers.forEach(member => {
          if (member.profiles) {
            const profile = member.profiles as any;
            const isUserOnline = profile.is_online && profile.show_online_status;
            
            onlineUsersMap.set(member.user_id, {
              user_id: member.user_id,
              username: profile.username,
              last_seen_at: profile.last_seen_at,
              isOnline: isUserOnline,
              showOnlineStatus: profile.show_online_status
            });

            // Set current user's status
            if (member.user_id === user.id) {
              setIsOnline(isUserOnline);
            }
          }
        });

        setOnlineUsers(onlineUsersMap);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  }, [groupId, user?.id]);

  // Get online status for a specific user
  const getUserOnlineStatus = useCallback((userId: string) => {
    const onlineUser = onlineUsers.get(userId);
    if (!onlineUser) {
      return {
        isOnline: false,
        lastSeen: new Date(),
        showOnlineStatus: false
      };
    }
    return {
      isOnline: onlineUser.isOnline,
      lastSeen: new Date(onlineUser.last_seen_at),
      showOnlineStatus: onlineUser.showOnlineStatus
    };
  }, [onlineUsers]);

  // Get total online count
  const getOnlineCount = useCallback(() => {
    let count = 0;
    onlineUsers.forEach(user => {
      if (user.isOnline) count++;
    });
    return count;
  }, [onlineUsers]);

  // Initialize
  useEffect(() => {
    if (groupId && user?.id) {
      // Set user online initially
      setOnline();
      
      // Fetch online users
      fetchOnlineUsers();
      
      // Set up periodic updates (every 2 minutes)
      updateIntervalRef.current = setInterval(fetchOnlineUsers, 2 * 60 * 1000);
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [groupId, user?.id]); // FIXED: Remove setOnline and fetchOnlineUsers dependencies

  // Handle user logout
  useEffect(() => {
    if (!user?.id) {
      setIsOnline(false);
      setOnlineUsers(new Map());
    }
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    isOnline,
    onlineUsers,
    getOnlineCount,
    getUserOnlineStatus,
    setOnline,
    setOffline,
  };
};
