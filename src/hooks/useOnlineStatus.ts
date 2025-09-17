import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface OnlineUser {
  userId: string;
  username: string;
  isOnline: boolean;
  lastSeen: Date;
  showOnlineStatus: boolean;
}

export const useOnlineStatus = (groupId: string) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
  const [isOnline, setIsOnline] = useState(true);
  const lastActivityRef = useRef<Date>(new Date());
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track user activity to determine online status
  const updateActivity = useCallback(() => {
    lastActivityRef.current = new Date();
    
    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    // Set user as online
    setIsOnline(true);
    
    // Update last seen in database
    if (user?.id) {
      supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(() => {});
    }
    
    // Set timeout to mark as offline after 5 minutes of inactivity
    activityTimeoutRef.current = setTimeout(() => {
      setIsOnline(false);
    }, 5 * 60 * 1000); // 5 minutes
  }, [user?.id]);

  // Set up activity tracking
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [updateActivity]);

  // Heartbeat to keep online status active
  useEffect(() => {
    if (!user?.id) return;

    const sendHeartbeat = async () => {
      if (isOnline) {
        try {
          await supabase
            .from('profiles')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('user_id', user.id);
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }
    };

    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [user?.id, isOnline]);

  // Load online users for the group
  const loadOnlineUsers = useCallback(async () => {
    if (!groupId) return;

    try {
      // Get all group members
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          profiles!inner(
            user_id,
            username,
            full_name,
            show_online_status,
            last_seen_at
          )
        `)
        .eq('group_id', groupId);

      if (membersError) {
        console.error('Error loading group members:', membersError);
        return;
      }

      const now = new Date();
      const onlineUsersMap = new Map<string, OnlineUser>();

      groupMembers?.forEach((member: any) => {
        const profile = member.profiles;
        if (!profile) return;

        const lastSeen = new Date(profile.last_seen_at);
        const isUserOnline = profile.show_online_status && 
          (now.getTime() - lastSeen.getTime()) < 5 * 60 * 1000; // 5 minutes threshold

        onlineUsersMap.set(profile.user_id, {
          userId: profile.user_id,
          username: profile.full_name || profile.username || 'Unknown',
          isOnline: isUserOnline,
          lastSeen: lastSeen,
          showOnlineStatus: profile.show_online_status
        });
      });

      setOnlineUsers(onlineUsersMap);
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  }, [groupId]);

  // Set up real-time updates for online status
  useEffect(() => {
    if (!groupId) return;

    // Load initial data
    loadOnlineUsers();

    // Set up real-time subscription for profile updates
    const channel = supabase
      .channel(`online-status-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const updatedProfile = payload.new as any;
          const now = new Date();
          const lastSeen = new Date(updatedProfile.last_seen_at);
          const isUserOnline = updatedProfile.show_online_status && 
            (now.getTime() - lastSeen.getTime()) < 5 * 60 * 1000;

          setOnlineUsers(prev => {
            const newMap = new Map(prev);
            newMap.set(updatedProfile.user_id, {
              userId: updatedProfile.user_id,
              username: updatedProfile.full_name || updatedProfile.username || 'Unknown',
              isOnline: isUserOnline,
              lastSeen: lastSeen,
              showOnlineStatus: updatedProfile.show_online_status
            });
            return newMap;
          });
        }
      )
      .subscribe();

    // Refresh online users every minute
    const refreshInterval = setInterval(loadOnlineUsers, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [groupId, loadOnlineUsers]);

  // Get online status for a specific user
  const getUserOnlineStatus = useCallback((userId: string): OnlineUser | null => {
    return onlineUsers.get(userId) || null;
  }, [onlineUsers]);

  // Get all online users
  const getOnlineUsers = useCallback((): OnlineUser[] => {
    return Array.from(onlineUsers.values()).filter(user => user.isOnline);
  }, [onlineUsers]);

  // Get online count
  const getOnlineCount = useCallback((): number => {
    return getOnlineUsers().length;
  }, [getOnlineUsers]);

  return {
    isOnline,
    onlineUsers: getOnlineUsers(),
    onlineCount: getOnlineCount(),
    getUserOnlineStatus,
    updateActivity
  };
};


