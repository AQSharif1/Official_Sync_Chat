import { useState, useCallback, useMemo } from 'react';
import { Poll, Playlist, Song, WouldYouRatherPrompt, TruthLieGame, ThisOrThatPrompt, EmojiRiddle } from '@/components/chat/types';

// Optimized Poll management with performance improvements
export const usePolls = () => {
  const [polls, setPolls] = useState<Poll[]>([]);

  const createPoll = useCallback((question: string, options: string[], createdBy: string) => {
    const newPoll: Poll = {
      id: crypto.randomUUID(),
      question,
      options: options.map(text => ({
        id: crypto.randomUUID(),
        text,
        votes: 0,
        voters: []
      })),
      createdBy,
      createdAt: new Date(),
      isActive: true
    };

    setPolls(prev => [...prev, newPoll]);
    return newPoll;
  }, []);

  const votePoll = useCallback((pollId: string, optionId: string, userId: string) => {
    setPolls(prev => prev.map(poll => {
      if (poll.id !== pollId) return poll;

      // Optimized vote counting
      const updatedOptions = poll.options.map(option => {
        const wasVoted = option.voters.includes(userId);
        const isNewVote = option.id === optionId;
        
        if (wasVoted && !isNewVote) {
          // Remove vote
          return {
            ...option,
            voters: option.voters.filter(voter => voter !== userId),
            votes: option.votes - 1
          };
        } else if (!wasVoted && isNewVote) {
          // Add vote
          return {
            ...option,
            voters: [...option.voters, userId],
            votes: option.votes + 1
          };
        }
        return option;
      });

      return { ...poll, options: updatedOptions };
    }));
  }, []);

  const closePoll = useCallback((pollId: string) => {
    setPolls(prev => prev.map(poll => 
      poll.id === pollId ? { ...poll, isActive: false } : poll
    ));
  }, []);

  return { polls, createPoll, votePoll, closePoll };
};

// Optimized Playlist management
export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const createPlaylist = useCallback((name: string): Playlist => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name,
      songs: [],
      createdAt: new Date(),
      collaborative: true
    };

    setPlaylists(prev => [...prev, newPlaylist]);
    return newPlaylist;
  }, []);

  const addSongToPlaylist = useCallback((playlistId: string, songQuery: string, addedBy: string) => {
    const parseSong = (query: string): { title: string; artist: string; spotifyUrl?: string } => {
      if (query.includes('spotify.com')) {
        return {
          title: 'Spotify Track',
          artist: 'Unknown Artist',
          spotifyUrl: query
        };
      }

      const parts = query.split(' ');
      if (parts.length >= 2) {
        const title = parts.slice(0, -1).join(' ');
        const artist = parts[parts.length - 1];
        return { title, artist };
      }

      return { title: query, artist: 'Unknown Artist' };
    };

    const songInfo = parseSong(songQuery);
    const newSong: Song = {
      id: crypto.randomUUID(),
      title: songInfo.title,
      artist: songInfo.artist,
      addedBy,
      addedAt: new Date(),
      spotifyUrl: songInfo.spotifyUrl
    };

    setPlaylists(prev => prev.map(playlist => 
      playlist.id === playlistId 
        ? { ...playlist, songs: [...playlist.songs, newSong] }
        : playlist
    ));

    return newSong;
  }, []);

  const getActivePlaylist = useCallback(() => {
    return playlists.find(p => p.collaborative) || null;
  }, [playlists]);

  return { playlists, createPlaylist, addSongToPlaylist, getActivePlaylist };
};

// Optimized Would You Rather management
export const useWouldYouRather = () => {
  const [prompts, setPrompts] = useState<WouldYouRatherPrompt[]>([]);

  const createPrompt = useCallback((question: string, options: string[]): WouldYouRatherPrompt => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    const newPrompt: WouldYouRatherPrompt = {
      id: crypto.randomUUID(),
      question,
      options: options.map(text => ({
        id: crypto.randomUUID(),
        text,
        votes: 0,
        voters: []
      })),
      createdAt: now,
      expiresAt,
      isActive: true
    };

    setPrompts(prev => [...prev, newPrompt]);
    return newPrompt;
  }, []);

  const votePrompt = useCallback((promptId: string, optionId: string, userId: string) => {
    setPrompts(prev => prev.map(prompt => {
      if (prompt.id !== promptId) return prompt;

      const updatedOptions = prompt.options.map(option => {
        const wasVoted = option.voters.includes(userId);
        const isNewVote = option.id === optionId;
        
        if (wasVoted && !isNewVote) {
          return {
            ...option,
            voters: option.voters.filter(voter => voter !== userId),
            votes: option.votes - 1
          };
        } else if (!wasVoted && isNewVote) {
          return {
            ...option,
            voters: [...option.voters, userId],
            votes: option.votes + 1
          };
        }
        return option;
      });

      return { ...prompt, options: updatedOptions };
    }));
  }, []);

  return { prompts, createPrompt, votePrompt };
};

// Optimized Truth and Lie game management
export const useTruthLie = () => {
  const [games, setGames] = useState<TruthLieGame[]>([]);

  const createGame = useCallback((statements: string[], createdBy: string, createdByUsername: string): TruthLieGame => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 60 * 1000); // 3 minutes

    const newGame: TruthLieGame = {
      id: crypto.randomUUID(),
      createdBy,
      createdByUsername,
      statements: statements.map((text, index) => ({
        id: crypto.randomUUID(),
        text,
        isLie: index === 2 // Last statement is the lie
      })),
      guesses: [],
      isActive: true,
      expiresAt
    };

    setGames(prev => [...prev, newGame]);
    return newGame;
  }, []);

  const makeGuess = useCallback((gameId: string, statementId: string, userId: string, username: string) => {
    setGames(prev => prev.map(game => {
      if (game.id !== gameId) return game;

      const existingGuess = game.guesses.find(g => g.userId === userId);
      if (existingGuess) return game; // User already guessed

      const newGuess = {
        userId,
        username,
        guessedStatementId: statementId,
        timestamp: new Date()
      };

      const updatedGuesses = [...game.guesses, newGuess];
      const shouldReveal = updatedGuesses.length >= 3 || new Date() >= game.expiresAt;

      return {
        ...game,
        guesses: updatedGuesses,
        revealedAt: shouldReveal ? new Date() : game.revealedAt
      };
    }));
  }, []);

  return { games, createGame, makeGuess };
};

// Optimized This or That management
export const useThisOrThat = () => {
  const [prompts, setPrompts] = useState<ThisOrThatPrompt[]>([]);

  const createPrompt = useCallback((question: string, options: { text: string; emoji: string }[]): ThisOrThatPrompt => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const newPrompt: ThisOrThatPrompt = {
      id: crypto.randomUUID(),
      question,
      options: options.map(opt => ({
        id: crypto.randomUUID(),
        text: opt.text,
        emoji: opt.emoji,
        votes: 0,
        voters: []
      })),
      createdAt: now,
      expiresAt,
      isActive: true
    };

    setPrompts(prev => [...prev, newPrompt]);
    return newPrompt;
  }, []);

  const votePrompt = useCallback((promptId: string, optionId: string, userId: string) => {
    setPrompts(prev => prev.map(prompt => {
      if (prompt.id !== promptId || new Date() > prompt.expiresAt) return prompt;

      const updatedOptions = prompt.options.map(option => {
        const wasVoted = option.voters.includes(userId);
        const isNewVote = option.id === optionId;
        
        if (wasVoted && !isNewVote) {
          return {
            ...option,
            voters: option.voters.filter(voter => voter !== userId),
            votes: option.votes - 1
          };
        } else if (!wasVoted && isNewVote) {
          return {
            ...option,
            voters: [...option.voters, userId],
            votes: option.votes + 1
          };
        }
        return option;
      });

      return {
        ...prompt,
        options: updatedOptions,
        isActive: new Date() < prompt.expiresAt
      };
    }));
  }, []);

  const clearPrompts = useCallback(() => setPrompts([]), []);

  return { prompts, createPrompt, votePrompt, clearPrompts };
};

// Optimized Emoji Riddle management
export const useEmojiRiddles = () => {
  const [riddles, setRiddles] = useState<EmojiRiddle[]>([]);

  const createRiddle = useCallback((emojis: string, answer: string, hint: string, funFact: string): EmojiRiddle => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes

    const newRiddle: EmojiRiddle = {
      id: crypto.randomUUID(),
      emojis,
      answer: answer.toLowerCase(),
      hint,
      funFact,
      guesses: [],
      createdAt: now,
      expiresAt,
      isActive: true
    };

    setRiddles(prev => [...prev, newRiddle]);
    return newRiddle;
  }, []);

  const makeGuess = useCallback((riddleId: string, guess: string, userId: string, username: string) => {
    setRiddles(prev => prev.map(riddle => {
      if (riddle.id !== riddleId || riddle.solvedBy) return riddle;

      const existingGuess = riddle.guesses.find(g => g.userId === userId);
      if (existingGuess) return riddle; // User already guessed

      const normalizedGuess = guess.toLowerCase().trim();
      const normalizedAnswer = riddle.answer.toLowerCase().trim();
      
      const isCorrect = normalizedGuess === normalizedAnswer || 
                       normalizedGuess.includes(normalizedAnswer) || 
                       normalizedAnswer.includes(normalizedGuess);

      const newGuess = {
        userId,
        username,
        guess,
        timestamp: new Date(),
        isCorrect
      };

      const updatedGuesses = [...riddle.guesses, newGuess];

      return {
        ...riddle,
        guesses: updatedGuesses,
        solvedBy: isCorrect ? username : riddle.solvedBy,
        solvedAt: isCorrect ? new Date() : riddle.solvedAt,
        isActive: !isCorrect && new Date() < riddle.expiresAt
      };
    }));
  }, []);

  const clearRiddles = useCallback(() => setRiddles([]), []);

  return { riddles, createRiddle, makeGuess, clearRiddles };
};