import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DailyPrompt {
  id: string;
  prompt_text: string;
  prompt_type: string;
  expires_at: Date;
  created_at: Date;
}

export const useDailyPrompts = () => {
  const [prompts, setPrompts] = useState<DailyPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivePrompts();
  }, []);

  const fetchActivePrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_prompts' as any)
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching daily prompts:', error);
        return;
      }

      setPrompts(data?.map((prompt: any) => ({
        id: prompt.id,
        prompt_text: prompt.prompt_text,
        prompt_type: prompt.prompt_type,
        expires_at: new Date(prompt.expires_at),
        created_at: new Date(prompt.created_at)
      })) || []);
    } catch (error) {
      console.error('Error fetching daily prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTodaysPrompt = (): DailyPrompt | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysPrompts = prompts.filter(prompt => {
      const promptDate = new Date(prompt.created_at);
      promptDate.setHours(0, 0, 0, 0);
      return promptDate.getTime() === today.getTime();
    });

    return todaysPrompts.length > 0 ? todaysPrompts[0] : null;
  };

  return {
    prompts,
    loading,
    getTodaysPrompt,
    refresh: fetchActivePrompts
  };
};