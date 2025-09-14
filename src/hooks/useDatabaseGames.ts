import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface DatabaseGame {
  id: string;
  group_id: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
}

export interface ThisOrThatGame extends DatabaseGame {
  question: string;
  option_a: string;
  option_b: string;
}

export interface EmojiRiddleGame extends DatabaseGame {
  emojis: string;
  answer: string;
  hint?: string;
  fun_fact?: string;
}

export interface TruthLieGame extends DatabaseGame {
  statement_1: string;
  statement_2: string;
  statement_3: string;
  lie_statement_number: number;
}

export const useDatabaseGames = (groupId: string) => {
  const { user } = useAuth();
  const [thisOrThatGames, setThisOrThatGames] = useState<ThisOrThatGame[]>([]);
  const [emojiRiddleGames, setEmojiRiddleGames] = useState<EmojiRiddleGame[]>([]);
  const [truthLieGames, setTruthLieGames] = useState<TruthLieGame[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all active games for the group
  const loadGames = useCallback(async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      
      // Load This or That games
      const { data: totGames, error: totError } = await supabase
        .from('this_or_that_games')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (totError) throw totError;

      // Load Emoji Riddle games
      const { data: emojiGames, error: emojiError } = await supabase
        .from('emoji_riddle_games')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (emojiError) throw emojiError;

      // Load Truth Lie games
      const { data: truthGames, error: truthError } = await supabase
        .from('truth_lie_games')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (truthError) throw truthError;

      setThisOrThatGames(totGames || []);
      setEmojiRiddleGames(emojiGames || []);
      setTruthLieGames(truthGames || []);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Create This or That game
  const createThisOrThatGame = useCallback(async (question: string, optionA: string, optionB: string) => {
    if (!user?.id || !groupId) {
      console.error('Missing user ID or group ID for game creation');
      return null;
    }

    // Validate required fields
    if (!question?.trim() || !optionA?.trim() || !optionB?.trim()) {
      console.error('Invalid game data: missing required fields', { question, optionA, optionB });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('this_or_that_games')
        .insert({
          group_id: groupId,
          created_by: user.id,
          question: question.trim(),
          option_a: optionA.trim(),
          option_b: optionB.trim(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating This or That game:', error);
        throw error;
      }
      
      setThisOrThatGames(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating This or That game:', error);
      return null;
    }
  }, [user?.id, groupId]);

  // Create Emoji Riddle game
  const createEmojiRiddleGame = useCallback(async (emojis: string, answer: string, hint?: string, funFact?: string) => {
    if (!user?.id || !groupId) return null;

    try {
      const { data, error } = await supabase
        .from('emoji_riddle_games')
        .insert({
          group_id: groupId,
          created_by: user.id,
          emojis,
          answer,
          hint,
          fun_fact: funFact,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        })
        .select()
        .single();

      if (error) throw error;
      
      setEmojiRiddleGames(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating Emoji Riddle game:', error);
      return null;
    }
  }, [user?.id, groupId]);

  // Create Truth Lie game
  const createTruthLieGame = useCallback(async (statements: string[], lieStatementNumber: number) => {
    if (!user?.id || !groupId || statements.length !== 3) return null;

    try {
      const { data, error } = await supabase
        .from('truth_lie_games')
        .insert({
          group_id: groupId,
          created_by: user.id,
          statement_1: statements[0],
          statement_2: statements[1],
          statement_3: statements[2],
          lie_statement_number: lieStatementNumber,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        })
        .select()
        .single();

      if (error) throw error;
      
      setTruthLieGames(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating Truth Lie game:', error);
      return null;
    }
  }, [user?.id, groupId]);

  // Load games on mount and when group changes
  useEffect(() => {
    loadGames();
  }, [loadGames]);

  return {
    thisOrThatGames,
    emojiRiddleGames,
    truthLieGames,
    loading,
    createThisOrThatGame,
    createEmojiRiddleGame,
    createTruthLieGame,
    loadGames
  };
};

