import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from './useChatMessages';

interface UserProfile {
  id: string;
  username: string;
  personality: string[];
  genres: string[];
  mood: number;
  mood_emoji?: string;
}

interface GroupInfo {
  id: string;
  name: string;
  vibe_label: string;
  current_members: number;
  max_members: number;
  lifecycle_stage: string;
}

interface AppState {
  user: UserProfile | null;
  group: GroupInfo | null;
  chat: ChatMessage[];
  loading: boolean;
  error: string | null;
}

export const useAppState = () => {
  const { user: authUser } = useAuth();
  const [state, setState] = useState<AppState>({
    user: null,
    group: null,
    chat: [],
    loading: false,
    error: null
  });

  // Load initial data when user logs in
  useEffect(() => {
    if (authUser) {
      loadInitialData();
    }
  }, [authUser]);

  const loadInitialData = async () => {
    if (!authUser) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Load user profile and group info in parallel
      const [profileResult, groupResult] = await Promise.all([
        loadUserProfile(),
        loadUserGroup()
      ]);

      const user = profileResult;
      const group = groupResult;

      // Load recent messages if user has a group
      let chat: ChatMessage[] = [];
      if (group) {
        chat = await loadRecentMessages(group.id);
      }

      setState({
        user,
        group,
        chat,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading initial data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load app data'
      }));
    }
  };

  const loadUserProfile = async (): Promise<UserProfile | null> => {
    if (!authUser) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (error) throw error;

    return {
      id: data.user_id,
      username: data.username,
      personality: data.personality || [],
      genres: data.genres || [],
      mood: data.mood || 5,
      mood_emoji: data.mood_emoji
    };
  };

  const loadUserGroup = async (): Promise<GroupInfo | null> => {
    if (!authUser) return null;

    // Get user's current group
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', authUser.id)
      .single();

    if (memberError || !memberData) return null;

    // Get group details
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', memberData.group_id)
      .single();

    if (groupError) throw groupError;

    return {
      id: groupData.id,
      name: groupData.name,
      vibe_label: groupData.vibe_label,
      current_members: groupData.current_members,
      max_members: groupData.max_members,
      lifecycle_stage: groupData.lifecycle_stage
    };
  };

  const loadRecentMessages = async (groupId: string): Promise<ChatMessage[]> => {
    // Get recent messages with proper JOIN to profiles table
    const { data: messagesData, error: messagesError } = await supabase
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
        profiles!inner(
          user_id,
          username,
          full_name,
          avatar_url,
          mood_emoji
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (messagesError) throw messagesError;

    if (!messagesData || messagesData.length === 0) return [];

    // Transform messages and reverse to chronological order
    return messagesData
      .map(msg => {
        const profile = msg.profiles;
        const displayName = profile?.full_name || profile?.username || 'Unknown User';
        
        return {
          id: msg.id,
          content: msg.content,
          messageType: msg.message_type as 'text' | 'gif' | 'voice',
          gifUrl: msg.gif_url,
          voiceAudioUrl: msg.voice_audio_url,
          voiceTranscription: msg.voice_transcription,
          username: displayName,
          timestamp: new Date(msg.created_at),
          userId: msg.user_id,
          reactions: []
        };
      })
      .reverse();
  };

  const updateChatMessages = (messages: ChatMessage[]) => {
    setState(prev => ({ ...prev, chat: messages }));
  };

  const appendMessage = (message: ChatMessage) => {
    setState(prev => ({ 
      ...prev, 
      chat: [...prev.chat, message] 
    }));
  };

  const updateGroupInfo = (groupInfo: Partial<GroupInfo>) => {
    setState(prev => ({
      ...prev,
      group: prev.group ? { ...prev.group, ...groupInfo } : null
    }));
  };

  return {
    ...state,
    loadInitialData,
    updateChatMessages,
    appendMessage,
    updateGroupInfo
  };
};