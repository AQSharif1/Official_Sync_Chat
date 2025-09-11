import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  userId: string;
  username: string;
  timestamp: number;
}

export const useTypingIndicator = (groupId: string, currentUserId: string) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);

  // Set up realtime subscription for typing indicators
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase.channel(`typing-${groupId}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users: TypingUser[] = [];
        
        Object.keys(newState).forEach(userId => {
          if (userId !== currentUserId) {
            const presences = newState[userId] as any[];
            if (presences.length > 0) {
              const latest = presences[0];
              if (latest.typing && Date.now() - latest.timestamp < 3000) {
                users.push({
                  userId,
                  username: latest.username,
                  timestamp: latest.timestamp
                });
              }
            }
          }
        });
        
        setTypingUsers(users);
      })
      .subscribe();

    // Clean up old typing indicators
    const cleanup = setInterval(() => {
      setTypingUsers(prev => 
        prev.filter(user => Date.now() - user.timestamp < 3000)
      );
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanup);
    };
  }, [groupId, currentUserId]);

  const startTyping = async (username: string) => {
    if (isTypingRef.current) return;
    
    isTypingRef.current = true;
    const channel = supabase.channel(`typing-${groupId}`);
    
    await channel.track({
      typing: true,
      username,
      timestamp: Date.now()
    });
  };

  const stopTyping = async () => {
    if (!isTypingRef.current) return;
    
    isTypingRef.current = false;
    const channel = supabase.channel(`typing-${groupId}`);
    
    await channel.untrack();
  };

  const handleTyping = (username: string) => {
    startTyping(username);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  return {
    typingUsers,
    handleTyping,
    stopTyping
  };
};