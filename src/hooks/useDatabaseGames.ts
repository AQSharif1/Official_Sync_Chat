import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedKarma } from '@/hooks/useEnhancedKarma';

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
  const { trackKarmaActivity } = useEnhancedKarma();
  const [thisOrThatGames, setThisOrThatGames] = useState<ThisOrThatGame[]>([]);
  const [emojiRiddleGames, setEmojiRiddleGames] = useState<EmojiRiddleGame[]>([]);
  const [truthLieGames, setTruthLieGames] = useState<TruthLieGame[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all active games for the group
  const loadGames = useCallback(async () => {
    if (!groupId || !user?.id) return;

    try {
      setLoading(true);
      
      // First, get cleared games for this user
      const { data: clearedGames, error: clearedError } = await supabase
        .from('user_cleared_messages')
        .select('message_id')
        .eq('user_id', user.id)
        .eq('group_id', groupId);

      if (clearedError) throw clearedError;
      
      const clearedGameIds = clearedGames?.map(c => c.message_id) || [];
      
      // Load This or That games with votes (excluding cleared ones)
      let totQuery = supabase
        .from('this_or_that_games')
        .select(`
          *,
          this_or_that_votes (
            user_id,
            choice
          )
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());
      
      // Only add the NOT IN filter if there are cleared games
      if (clearedGameIds.length > 0) {
        totQuery = totQuery.not('id', 'in', `(${clearedGameIds.join(',')})`);
      }
      
      const { data: totGames, error: totError } = await totQuery.order('created_at', { ascending: false });

      if (totError) throw totError;

      // Load Emoji Riddle games with guesses (excluding cleared ones)
      let emojiQuery = supabase
        .from('emoji_riddle_games')
        .select(`
          *,
          emoji_riddle_guesses (
            user_id,
            guess,
            created_at
          )
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());
      
      // Only add the NOT IN filter if there are cleared games
      if (clearedGameIds.length > 0) {
        emojiQuery = emojiQuery.not('id', 'in', `(${clearedGameIds.join(',')})`);
      }
      
      const { data: emojiGames, error: emojiError } = await emojiQuery.order('created_at', { ascending: false });

      if (emojiError) throw emojiError;

      // Load Truth Lie games with guesses (excluding cleared ones)
      let truthQuery = supabase
        .from('truth_lie_games')
        .select(`
          *,
          truth_lie_guesses (
            user_id,
            guessed_lie_number,
            is_correct,
            created_at
          )
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());
      
      // Only add the NOT IN filter if there are cleared games
      if (clearedGameIds.length > 0) {
        truthQuery = truthQuery.not('id', 'in', `(${clearedGameIds.join(',')})`);
      }
      
      const { data: truthGames, error: truthError } = await truthQuery.order('created_at', { ascending: false });

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
  const createThisOrThatGame = useCallback(async (question: string, optionA: string, optionB: string, durationMinutes: number = 5) => {
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
          expires_at: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating This or That game:', error);
        throw error;
      }
      
      // Track karma for game creation
      await trackKarmaActivity('game_participation', 2, 'Created This or That game', 1.0, groupId);
      
      setThisOrThatGames(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating This or That game:', error);
      return null;
    }
  }, [user?.id, groupId, trackKarmaActivity]);

  // Create Emoji Riddle game
  const createEmojiRiddleGame = useCallback(async (emojis: string, answer: string, hint?: string, funFact?: string, durationMinutes: number = 5) => {
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
          expires_at: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      // Track karma for game creation
      await trackKarmaActivity('game_participation', 2, 'Created Emoji Riddle game', 1.0, groupId);
      
      setEmojiRiddleGames(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating Emoji Riddle game:', error);
      return null;
    }
  }, [user?.id, groupId, trackKarmaActivity]);

  // Create Truth Lie game
  const createTruthLieGame = useCallback(async (statements: string[], lieStatementNumber: number, durationMinutes: number = 5) => {
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
          expires_at: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      // Track karma for game creation
      await trackKarmaActivity('game_participation', 2, 'Created Two Truths and a Lie game', 1.0, groupId);
      
      setTruthLieGames(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating Truth Lie game:', error);
      return null;
    }
  }, [user?.id, groupId, trackKarmaActivity]);

  // Vote on This or That game
  const voteThisOrThat = useCallback(async (gameId: string, optionId: string) => {
    if (!user?.id || !groupId) return false;

    try {
      const { error } = await supabase
        .from('this_or_that_votes')
        .insert({
          game_id: gameId,
          user_id: user.id,
          choice: optionId
        });

      if (error) throw error;

      // Track karma for game participation
      await trackKarmaActivity('game_participation', 2, 'Voted on This or That game', 1.0, groupId);

      // Reload games to get updated vote counts
      await loadGames();
      return true;
    } catch (error) {
      console.error('Error voting on This or That:', error);
      return false;
    }
  }, [user?.id, groupId, loadGames, trackKarmaActivity]);

  // Submit guess for Emoji Riddle game
  const submitRiddleGuess = useCallback(async (gameId: string, guess: string) => {
    if (!user?.id || !groupId) return false;

    try {
      const { error } = await supabase
        .from('emoji_riddle_guesses')
        .insert({
          game_id: gameId,
          user_id: user.id,
          guess: guess.trim()
        });

      if (error) throw error;

      // Track karma for game participation
      await trackKarmaActivity('game_participation', 2, 'Guessed Emoji Riddle', 1.0, groupId);

      // Reload games to get updated guesses
      await loadGames();
      return true;
    } catch (error) {
      console.error('Error submitting riddle guess:', error);
      return false;
    }
  }, [user?.id, groupId, loadGames, trackKarmaActivity]);

  // Submit guess for Truth Lie game
  const submitTruthLieGuess = useCallback(async (gameId: string, guessedLieNumber: number) => {
    if (!user?.id || !groupId) return false;

    try {
      // First get the correct lie number for this game
      const { data: game, error: gameError } = await supabase
        .from('truth_lie_games')
        .select('lie_statement_number')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      const isCorrect = guessedLieNumber === game.lie_statement_number;

      const { error } = await supabase
        .from('truth_lie_guesses')
        .insert({
          game_id: gameId,
          user_id: user.id,
          guessed_lie_number: guessedLieNumber,
          is_correct: isCorrect
        });

      if (error) throw error;

      // Track karma for game participation (and bonus for correct guess)
      const karmaPoints = isCorrect ? 5 : 2; // 5 points for correct, 2 for participation
      const karmaDescription = isCorrect ? 'Correctly guessed Two Truths and a Lie' : 'Guessed Two Truths and a Lie';
      await trackKarmaActivity(isCorrect ? 'game_win' : 'game_participation', karmaPoints, karmaDescription, 1.0, groupId);

      // Reload games to get updated guesses
      await loadGames();
      return true;
    } catch (error) {
      console.error('Error submitting truth lie guess:', error);
      return false;
    }
  }, [user?.id, groupId, loadGames, trackKarmaActivity]);

  // End/cleanup a game by setting is_active to false
  const endGame = useCallback(async (gameType: 'thisorthat' | 'emojiriddle' | 'twoTruths', gameId: string) => {
    if (!groupId) return false;

    try {
      let tableName = '';
      switch (gameType) {
        case 'thisorthat':
          tableName = 'this_or_that_games';
          break;
        case 'emojiriddle':
          tableName = 'emoji_riddle_games';
          break;
        case 'twoTruths':
          tableName = 'truth_lie_games';
          break;
        default:
          return false;
      }

      const { error } = await supabase
        .from(tableName)
        .update({ is_active: false })
        .eq('id', gameId)
        .eq('group_id', groupId);

      if (error) throw error;

      // Update local state
      switch (gameType) {
        case 'thisorthat':
          setThisOrThatGames(prev => prev.filter(game => game.id !== gameId));
          break;
        case 'emojiriddle':
          setEmojiRiddleGames(prev => prev.filter(game => game.id !== gameId));
          break;
        case 'twoTruths':
          setTruthLieGames(prev => prev.filter(game => game.id !== gameId));
          break;
      }

      return true;
    } catch (error) {
      console.error('Error ending game:', error);
      return false;
    }
  }, [groupId]);

  // Permanently delete game data (for cleanup after game ends)
  const deleteGameData = useCallback(async (gameType: 'thisorthat' | 'emojiriddle' | 'twoTruths', gameId: string) => {
    if (!groupId) return false;

    try {
      // Delete related data first (votes, guesses)
      switch (gameType) {
        case 'thisorthat':
          // Delete votes first
          await supabase
            .from('this_or_that_votes')
            .delete()
            .eq('game_id', gameId);
          
          // Then delete the game
          await supabase
            .from('this_or_that_games')
            .delete()
            .eq('id', gameId)
            .eq('group_id', groupId);
          break;
          
        case 'emojiriddle':
          // Delete guesses first
          await supabase
            .from('emoji_riddle_guesses')
            .delete()
            .eq('game_id', gameId);
          
          // Then delete the game
          await supabase
            .from('emoji_riddle_games')
            .delete()
            .eq('id', gameId)
            .eq('group_id', groupId);
          break;
          
        case 'twoTruths':
          // Delete guesses first
          await supabase
            .from('truth_lie_guesses')
            .delete()
            .eq('game_id', gameId);
          
          // Then delete the game
          await supabase
            .from('truth_lie_games')
            .delete()
            .eq('id', gameId)
            .eq('group_id', groupId);
          break;
      }

      // Update local state
      switch (gameType) {
        case 'thisorthat':
          setThisOrThatGames(prev => prev.filter(game => game.id !== gameId));
          break;
        case 'emojiriddle':
          setEmojiRiddleGames(prev => prev.filter(game => game.id !== gameId));
          break;
        case 'twoTruths':
          setTruthLieGames(prev => prev.filter(game => game.id !== gameId));
          break;
      }

      console.log(`Game data deleted: ${gameType} (${gameId})`);
      return true;
    } catch (error) {
      console.error('Error deleting game data:', error);
      return false;
    }
  }, [groupId]);

  // Clean up expired games (called periodically)
  const cleanupExpiredGames = useCallback(async () => {
    if (!groupId) return;

    try {
      const now = new Date().toISOString();
      
      // Get all expired games
      const { data: expiredGames, error } = await supabase
        .from('this_or_that_games')
        .select('id')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .lt('expires_at', now);

      if (error) throw error;

      // Delete each expired game
      for (const game of expiredGames || []) {
        await deleteGameData('thisorthat', game.id);
      }

      // Do the same for emoji riddle games
      const { data: expiredRiddles, error: riddleError } = await supabase
        .from('emoji_riddle_games')
        .select('id')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .lt('expires_at', now);

      if (riddleError) throw riddleError;

      for (const game of expiredRiddles || []) {
        await deleteGameData('emojiriddle', game.id);
      }

      // Do the same for truth lie games
      const { data: expiredTruth, error: truthError } = await supabase
        .from('truth_lie_games')
        .select('id')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .lt('expires_at', now);

      if (truthError) throw truthError;

      for (const game of expiredTruth || []) {
        await deleteGameData('twoTruths', game.id);
      }

      console.log('Expired games cleaned up');
    } catch (error) {
      console.error('Error cleaning up expired games:', error);
    }
  }, [groupId, deleteGameData]);

  // Load games on mount and when group changes
  useEffect(() => {
    loadGames();
  }, [loadGames]);

  // Set up automatic cleanup of expired games
  useEffect(() => {
    // Clean up expired games on mount
    cleanupExpiredGames();
    
    // Set up periodic cleanup every 5 minutes
    const cleanupInterval = setInterval(cleanupExpiredGames, 5 * 60 * 1000);
    
    return () => clearInterval(cleanupInterval);
  }, [cleanupExpiredGames]);

  return {
    thisOrThatGames,
    emojiRiddleGames,
    truthLieGames,
    loading,
    createThisOrThatGame,
    createEmojiRiddleGame,
    createTruthLieGame,
    voteThisOrThat,
    submitRiddleGuess,
    submitTruthLieGuess,
    endGame,
    deleteGameData,
    cleanupExpiredGames,
    loadGames
  };
};

