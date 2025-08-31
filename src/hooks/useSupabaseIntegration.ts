import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface SupabaseMemory {
  groupId: string | null;
  groupJoinDate: string | null;
  userId: string | null;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  group_id: string;
  created_at: string;
  username?: string;
}

export const useSupabaseIntegration = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  const [memory, setMemory] = useState<SupabaseMemory>({
    groupId: null,
    groupJoinDate: null,
    userId: null
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Handle user login flow
  useEffect(() => {
    if (user && session) {
      handleUserLogin();
    }
  }, [user, session]);

  const handleUserLogin = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setMemory(prev => ({ ...prev, userId: user.id }));
      
      // Check if user profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) {
        console.log('No profile found - user needs to complete onboarding');
        // Don't create profile here - let onboarding handle it
        // This prevents conflicts with the onboarding flow
      }
    } catch (error) {
      console.error('User login error:', error);
      toast({
        title: "Error",
        description: "Failed to initialize user profile.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check if user is already in a group
      const { data: existingMembership } = await supabase
        .from('group_members')
        .select('group_id, joined_at')
        .eq('user_id', user.id)
        .single();
      
      if (existingMembership) {
        setMemory(prev => ({
          ...prev,
          groupId: existingMembership.group_id,
          groupJoinDate: existingMembership.joined_at
        }));
        return existingMembership.group_id;
      }
      
      // Use the RPC function to find available groups
      const { data: availableGroups } = await supabase.rpc('get_available_groups', {
        p_limit: 1
      });
      
      let groupId: string;
      
      if (availableGroups && Array.isArray(availableGroups) && availableGroups.length > 0) {
        groupId = availableGroups[0].id;
      } else {
        // Create new group
        const { data: newGroup, error } = await supabase
          .from('groups')
          .insert({
            name: `Group ${Date.now()}`,
            vibe_label: 'General Chat',
            current_members: 0,
            max_members: 10
          })
          .select('id')
          .single();
        
        if (error) throw error;
        groupId = newGroup.id;
      }
      
      // Add user to group
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id
        });
      
      if (memberError) throw memberError;
      
      // Update group member count
      await supabase.rpc('update_group_member_count', { p_group_id: groupId });
      
      const joinDate = new Date().toISOString();
      setMemory(prev => ({
        ...prev,
        groupId,
        groupJoinDate: joinDate
      }));
      
      toast({
        title: "Joined Group!",
        description: "You've been added to a chat group."
      });
      
      return groupId;
    } catch (error) {
      console.error('Setup complete error:', error);
      toast({
        title: "Error",
        description: "Failed to join a group.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!user || !memory.groupId) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          group_id: memory.groupId,
          user_id: user.id,
          content,
          message_type: 'text'
        });
      
      if (error) throw error;
      
      // Reload messages after sending
      await loadChat();
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive"
      });
    }
  };

  const loadChat = async () => {
    if (!memory.groupId) return;
    
    try {
      const { data: chatMessages, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          user_id,
          group_id,
          created_at,
          profiles!inner(username)
        `)
        .eq('group_id', memory.groupId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const formattedMessages: Message[] = chatMessages.map(msg => ({
        id: msg.id,
        content: msg.content || '',
        user_id: msg.user_id,
        group_id: msg.group_id,
        created_at: msg.created_at,
        username: (msg.profiles as any)?.username || 'Unknown'
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Load chat error:', error);
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    setMemory({
      groupId: null,
      groupJoinDate: null,
      userId: null
    });
    setMessages([]);
  };

  // Listen for logout events
  useEffect(() => {
    const handleAuthLogout = () => {
      handleLogout();
    };
    
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  // Set up real-time message updates
  useEffect(() => {
    if (!memory.groupId) return;
    
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${memory.groupId}`
        },
        () => {
          loadChat(); // Reload messages when new ones arrive
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [memory.groupId]);

  // Load chat when group is set
  useEffect(() => {
    if (memory.groupId) {
      loadChat();
    }
  }, [memory.groupId]);

  return {
    memory,
    messages,
    loading,
    handleSetupComplete,
    sendMessage,
    loadChat,
    handleLogout
  };
};