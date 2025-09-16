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

export const useOptimizedOnlineStatus = (groupId: string) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
  const [isOnline, setIsOnline] = useState(false); // Start as offline until user is confirmed logged in
  const [userOnlineStatus, setUserOnlineStatus] = useState<OnlineUser | null>(null);
  
  // Refs for stable references
  const lastUpdateRef = useRef<Date>(new Date());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyOffline = useRef(false);
  
  // Update interval - much less frequent (every 2 minutes instead of constant updates)
  const UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutes
  const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes for heartbeat

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
      
      console.log(`📡 Updated online status: ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }, [user?.id]);

  // Set user as manually offline
  const setOffline = useCallback(async () => {
    isManuallyOffline.current = true;
    setIsOnline(false);
    await updateOnlineStatus(false);
  }, [updateOnlineStatus]);

  // Set user as online (only when logged in and not manually offline)
  const setOnline = useCallback(async () => {
    if (!user?.id) {
      console.log('Cannot set online: user not logged in');
      return;
    }
    isManuallyOffline.current = false;
    setIsOnline(true);
    await updateOnlineStatus(true);
  }, [updateOnlineStatus, user?.id]);

  // Fetch online users for the group
  const fetchOnlineUsers = useCallback(async () => {
    if (!groupId || !user?.id) return;

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, last_seen_at, show_online_status, is_online')
        .in('user_id', await getGroupMemberIds());

      if (profiles) {
        const onlineUsersMap = new Map<string, OnlineUser>();
        
        profiles.forEach(profile => {
          const isUserOnline = profile.is_online && profile.show_online_status;
          const lastSeen = new Date(profile.last_seen_at);
          
          onlineUsersMap.set(profile.user_id, {
            user_id: profile.user_id,
            username: profile.username,
            last_seen_at: profile.last_seen_at,
            isOnline: isUserOnline,
            showOnlineStatus: profile.show_online_status
          });

          // Set current user's online status
          if (profile.user_id === user.id) {
            setUserOnlineStatus({
              user_id: profile.user_id,
              username: profile.username,
              last_seen_at: profile.last_seen_at,
              isOnline: isUserOnline,
              showOnlineStatus: profile.show_online_status
            });
          }
        });

        setOnlineUsers(onlineUsersMap);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  }, [groupId, user?.id]);

  // Get group member IDs
  const getGroupMemberIds = useCallback(async (): Promise<string[]> => {
    try {
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);
      
      return members?.map(m => m.user_id) || [];
    } catch (error) {
      console.error('Error fetching group members:', error);
      return [];
    }
  }, [groupId]);

  // Get online status for a specific user
  const getUserOnlineStatus = useCallback((userId: string): OnlineUser | null => {
    return onlineUsers.get(userId) || null;
  }, [onlineUsers]);

  // Get online count
  const getOnlineCount = useCallback((): number => {
    let count = 0;
    onlineUsers.forEach(user => {
      if (user.isOnline) count++;
    });
    return count;
  }, [onlineUsers]);

  // Heartbeat to keep user online (only if logged in and not manually offline)
  useEffect(() => {
    if (!user?.id || isManuallyOffline.current) return;

    const heartbeat = async () => {
      await updateOnlineStatus(true);
    };

    // Initial heartbeat
    heartbeat();

    // Set up periodic heartbeat
    heartbeatIntervalRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [user?.id, updateOnlineStatus]);

  // Handle user logout - set offline immediately
  useEffect(() => {
    if (!user?.id) {
      console.log('User logged out, setting offline status');
      setIsOnline(false);
      setUserOnlineStatus(null);
      // Clear any pending timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }
  }, [user?.id]);

  // Periodic online users update (much less frequent)
  useEffect(() => {
    if (!groupId) return;

    // Initial fetch
    fetchOnlineUsers();

    // Set up periodic updates
    updateTimeoutRef.current = setInterval(fetchOnlineUsers, UPDATE_INTERVAL);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [groupId, fetchOnlineUsers]);

  // Set user as online by default when logged in (if not manually offline)
  useEffect(() => {
    if (user?.id && !isManuallyOffline.current) {
      console.log('User logged in, setting online status');
      setOnline();
    }
  }, [user?.id, setOnline]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  return {
    onlineUsers,
    isOnline,
    userOnlineStatus,
    getOnlineCount,
    getUserOnlineStatus,
    setOnline,
    setOffline,
    refreshOnlineUsers: fetchOnlineUsers
  };
};
