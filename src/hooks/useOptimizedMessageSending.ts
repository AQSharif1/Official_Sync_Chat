import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { useInputValidation } from './useInputValidation';

interface OptimizedMessageSendingConfig {
  enableOptimisticUpdates: boolean;
  enableProfileCaching: boolean;
  enableBatchProcessing: boolean;
  maxRetries: number;
}

const DEFAULT_CONFIG: OptimizedMessageSendingConfig = {
  enableOptimisticUpdates: true,
  enableProfileCaching: true,
  enableBatchProcessing: true,
  maxRetries: 3,
};

export const useOptimizedMessageSending = (config: Partial<OptimizedMessageSendingConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { user } = useAuth();
  const { toast } = useToast();
  const { validateMessageContent, checkRateLimit, sanitizeInput } = useInputValidation();
  
  const [isSending, setIsSending] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<Map<string, any>>(new Map());
  const profileCache = useRef<Map<string, string>>(new Map());
  const messageQueue = useRef<Array<() => Promise<void>>>([]);
  const isProcessingQueue = useRef(false);

  // Optimistic message ID generator
  const generateOptimisticId = useCallback(() => {
    return `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Profile caching
  const getCachedProfile = useCallback(async (userId: string): Promise<string> => {
    if (finalConfig.enableProfileCaching && profileCache.current.has(userId)) {
      return profileCache.current.get(userId)!;
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', userId)
        .single();

      const username = data?.username || 'Unknown User';
      
      if (finalConfig.enableProfileCaching) {
        profileCache.current.set(userId, username);
      }

      return username;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return 'Unknown User';
    }
  }, [finalConfig.enableProfileCaching]);

  // Process message queue
  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current || messageQueue.current.length === 0) return;

    isProcessingQueue.current = true;

    while (messageQueue.current.length > 0) {
      const messageProcessor = messageQueue.current.shift();
      if (messageProcessor) {
        try {
          await messageProcessor();
        } catch (error) {
          console.error('Error processing message:', error);
        }
      }
    }

    isProcessingQueue.current = false;
  }, []);

  // Optimized message sending with parallel operations
  const sendMessageOptimized = useCallback(async (
    content: string,
    messageType: 'text' | 'gif' | 'voice',
    groupId: string,
    additionalData?: {
      gifUrl?: string;
      voiceAudioUrl?: string;
      voiceTranscription?: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Quick validation without blocking
    const sanitized = sanitizeInput(content);
    const validation = validateMessageContent(sanitized);
    
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const optimisticId = generateOptimisticId();
    const messageData = {
      id: optimisticId,
      content: sanitized,
      messageType,
      ...additionalData,
      userId: user.id,
      timestamp: new Date(),
      isOptimistic: true,
    };

    // Optimistic update
    if (finalConfig.enableOptimisticUpdates) {
      setPendingMessages(prev => new Map(prev.set(optimisticId, messageData)));
    }

    // Add to processing queue
    const processMessage = async () => {
      try {
        // Parallel operations
        const [rateLimitCheck, profileFetch] = await Promise.all([
          checkRateLimit(),
          getCachedProfile(user.id)
        ]);

        if (!rateLimitCheck) {
          throw new Error('Rate limit exceeded');
        }

        // Send message to server
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            content: sanitized,
            message_type: messageType,
            group_id: groupId,
            user_id: user.id,
            gif_url: additionalData?.gifUrl,
            voice_audio_url: additionalData?.voiceAudioUrl,
            voice_transcription: additionalData?.voiceTranscription,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Remove optimistic message and add real message
        if (finalConfig.enableOptimisticUpdates) {
          setPendingMessages(prev => {
            const newMap = new Map(prev);
            newMap.delete(optimisticId);
            return newMap;
          });
        }

        return { success: true, messageId: data.id };
      } catch (error) {
        console.error('Error sending message:', error);
        
        // Remove optimistic message on error
        if (finalConfig.enableOptimisticUpdates) {
          setPendingMessages(prev => {
            const newMap = new Map(prev);
            newMap.delete(optimisticId);
            return newMap;
          });
        }

        return { success: false, error: error.message };
      }
    };

    messageQueue.current.push(processMessage);
    processQueue();

    return { success: true, messageId: optimisticId };
  }, [user, finalConfig, validateMessageContent, checkRateLimit, sanitizeInput, getCachedProfile, generateOptimisticId, processQueue]);

  // Batch send multiple messages
  const sendBatchMessages = useCallback(async (
    messages: Array<{
      content: string;
      messageType: 'text' | 'gif' | 'voice';
      additionalData?: any;
    }>,
    groupId: string
  ): Promise<{ success: boolean; results: Array<{ success: boolean; messageId?: string; error?: string }> }> => {
    if (!finalConfig.enableBatchProcessing) {
      // Fallback to individual sends
      const results = await Promise.all(
        messages.map(msg => sendMessageOptimized(msg.content, msg.messageType, groupId, msg.additionalData))
      );
      return { success: results.every(r => r.success), results };
    }

    // Batch processing
    const batchData = messages.map(msg => ({
      content: sanitizeInput(msg.content),
      message_type: msg.messageType,
      group_id: groupId,
      user_id: user?.id,
      gif_url: msg.additionalData?.gifUrl,
      voice_audio_url: msg.additionalData?.voiceAudioUrl,
      voice_transcription: msg.additionalData?.voiceTranscription,
    }));

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(batchData)
        .select();

      if (error) {
        throw error;
      }

      return {
        success: true,
        results: data.map((msg) => ({
          success: true,
          messageId: msg.id
        }))
      };
    } catch (error) {
      console.error('Error sending batch messages:', error);
      return {
        success: false,
        results: messages.map(() => ({ success: false, error: String(error) }))
      };
    }
  }, [finalConfig.enableBatchProcessing, sendMessageOptimized, sanitizeInput, user]);

  // Clear cache
  const clearCache = useCallback(() => {
    profileCache.current.clear();
    setPendingMessages(new Map());
    messageQueue.current = [];
  }, []);

  return {
    sendMessageOptimized,
    sendBatchMessages,
    isSending,
    pendingMessages: Array.from(pendingMessages.values()),
    clearCache,
  };
}; 