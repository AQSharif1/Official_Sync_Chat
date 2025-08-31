import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ModerationAction {
  id: string;
  targetUserId: string;
  actionType: 'block' | 'mute';
  createdAt: Date;
}

export interface UserReport {
  messageId: string;
  chatType: 'group' | 'private';
  reason: string;
  additionalContext?: string;
}

export const useModeration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const moderateContent = async (content: string, messageId: string, chatType: 'group' | 'private') => {
    if (!user) return { flagged: false };

    try {
      const { data, error } = await supabase.functions.invoke('content-moderation', {
        body: {
          content,
          messageId,
          userId: user.id,
          chatType
        }
      });

      if (error) {
        console.error('Moderation error:', error);
        return { flagged: false };
      }

      return data;
    } catch (error) {
      console.error('Moderation request failed:', error);
      return { flagged: false };
    }
  };

  const blockUser = async (targetUserId: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_moderation_actions' as any)
        .insert({
          user_id: user.id,
          target_user_id: targetUserId,
          action_type: 'block'
        });

      if (error) {
        console.error('Error blocking user:', error);
        return false;
      }

      return true;
    } finally {
      setLoading(false);
    }
  };

  const muteUser = async (targetUserId: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_moderation_actions' as any)
        .insert({
          user_id: user.id,
          target_user_id: targetUserId,
          action_type: 'mute'
        });

      if (error) {
        console.error('Error muting user:', error);
        return false;
      }

      return true;
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (targetUserId: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_moderation_actions' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('target_user_id', targetUserId)
        .eq('action_type', 'block');

      if (error) {
        console.error('Error unblocking user:', error);
        return false;
      }

      return true;
    } finally {
      setLoading(false);
    }
  };

  const unmuteUser = async (targetUserId: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_moderation_actions' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('target_user_id', targetUserId)
        .eq('action_type', 'mute');

      if (error) {
        console.error('Error unmuting user:', error);
        return false;
      }

      return true;
    } finally {
      setLoading(false);
    }
  };

  const reportMessage = async (report: UserReport) => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_reports' as any)
        .insert({
          reporter_id: user.id,
          reported_message_id: report.messageId,
          chat_type: report.chatType,
          report_reason: report.reason,
          additional_context: report.additionalContext
        });

      if (error) {
        console.error('Error reporting message:', error);
        return false;
      }

      return true;
    } finally {
      setLoading(false);
    }
  };

  const checkUserStatus = async (userId: string) => {
    try {
      const { data: shadowMuted } = await supabase
        .rpc('is_user_shadow_muted' as any, { user_id_param: userId });
      
      const { data: lockedOut } = await supabase
        .rpc('is_user_locked_out' as any, { user_id_param: userId });

      return {
        isShadowMuted: shadowMuted,
        isLockedOut: lockedOut
      };
    } catch (error) {
      console.error('Error checking user status:', error);
      return {
        isShadowMuted: false,
        isLockedOut: false
      };
    }
  };

  return {
    loading,
    moderateContent,
    blockUser,
    muteUser,
    unblockUser,
    unmuteUser,
    reportMessage,
    checkUserStatus
  };
};