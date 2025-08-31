// Shared types for chat tools and games

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: Date;
  collaborative: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  addedBy: string;
  addedAt: Date;
  spotifyUrl?: string;
}

export interface WouldYouRatherPrompt {
  id: string;
  question: string;
  options: WouldYouRatherOption[];
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface WouldYouRatherOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

export interface TruthLieGame {
  id: string;
  createdBy: string;
  createdByUsername: string;
  statements: TruthLieStatement[];
  guesses: TruthLieGuess[];
  revealedAt?: Date;
  isActive: boolean;
  expiresAt: Date;
}

export interface TruthLieStatement {
  id: string;
  text: string;
  isLie: boolean;
}

export interface TruthLieGuess {
  userId: string;
  username: string;
  guessedStatementId: string;
  timestamp: Date;
}

export interface ThisOrThatPrompt {
  id: string;
  question: string;
  options: ThisOrThatOption[];
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface ThisOrThatOption {
  id: string;
  text: string;
  emoji: string;
  votes: number;
  voters: string[];
}

export interface EmojiRiddle {
  id: string;
  emojis: string;
  answer: string;
  hint: string;
  funFact: string;
  guesses: EmojiGuess[];
  solvedBy?: string;
  solvedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface EmojiGuess {
  userId: string;
  username: string;
  guess: string;
  timestamp: Date;
  isCorrect?: boolean;
}