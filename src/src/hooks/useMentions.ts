import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GroupMember {
  userId: string;
  username: string;
}

export const useMentions = (groupId: string) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupId) {
      fetchGroupMembers();
    }
  }, [groupId]);

  const fetchGroupMembers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          user_id,
          profiles:profiles(username)
        `)
        .eq('group_id', groupId);

      if (error) throw error;

      const membersList = data?.map(member => ({
        userId: member.user_id,
        username: (member.profiles as any)?.username || 'Unknown User'
      })) || [];

      setMembers(membersList);
    } catch (error) {
      console.error('Error fetching group members:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseMentions = (text: string): { text: string; mentions: string[] } => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const username = match[1];
      const member = members.find(m => m.username.toLowerCase() === username.toLowerCase());
      if (member) {
        mentions.push(member.userId);
      }
    }

    return { text, mentions };
  };

  const highlightMentions = (text: string, currentUserId: string): string => {
    const currentUser = members.find(m => m.userId === currentUserId);
    if (!currentUser) return text;

    const mentionRegex = new RegExp(`@${currentUser.username}\\b`, 'gi');
    return text.replace(mentionRegex, `<span class="bg-primary/20 text-primary font-medium px-1 rounded">$&</span>`);
  };

  const searchMembers = (query: string): GroupMember[] => {
    if (!query) return [];
    return members.filter(member => 
      member.username.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  };

  return {
    members,
    loading,
    parseMentions,
    highlightMentions,
    searchMembers
  };
};