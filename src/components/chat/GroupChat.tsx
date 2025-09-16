import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, ArrowLeft, ArrowRight, Trophy, Share2, Lightbulb, Home, Eraser, MessageCircle, MoreVertical, Settings, RefreshCw } from 'lucide-react';
import { GroupMembersList } from './GroupMembersList';
import { ChatInput } from './ChatInput';
import { GroupSwitchDialog } from './GroupSwitchDialog';
// Removed ChatNavigation import - using main app navigation instead
import { TypingIndicator } from './TypingIndicator';
import { PinnedMessagesPanel } from './PinnedMessagesPanel';
import { MessageBubble } from './MessageBubble';
import { CollapsibleVoiceRoom } from './CollapsibleVoiceRoom';
import { GameQuickPicker } from './GameQuickPicker';
import { GameParticipationDialog } from './GameParticipationDialog';
import { ActiveGameDisplay } from './ActiveGameDisplay';

import { ChatPoll, CreatePoll } from './ChatPoll';
import { PlaylistBuilder, CreatePlaylist } from './PlaylistBuilder';
import { WouldYouRather, WOULD_YOU_RATHER_PROMPTS } from './WouldYouRather';
import { TruthLieGame, CreateTruthLie } from './TruthLieGame';
import { ThisOrThat, THIS_OR_THAT_PROMPTS } from './ThisOrThat';
import { EmojiRiddleGame, EMOJI_RIDDLES } from './EmojiRiddleGame';
// GameStartPanel removed - games accessed via game controller icon only
import { useChatMessages, ChatMessage } from '@/hooks/useChatMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { usePinnedMessages } from '@/hooks/usePinnedMessages';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedOnlineStatus } from '@/hooks/useOptimizedOnlineStatus';
import { useEngagement } from '@/hooks/useEngagement';
import { useClearedMessages } from '@/hooks/useClearedMessages';
import { useDatabaseGames } from '@/hooks/useDatabaseGames';
import { useGamePreferences } from '@/hooks/useGamePreferences';
import { usePremium } from '@/hooks/usePremium';

import { useAppState } from '@/hooks/useAppState';
import { useUnifiedRealtimeChat } from '@/hooks/useUnifiedRealtimeChat';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  usePolls, 
  usePlaylists, 
  useWouldYouRather
} from '@/hooks/useOptimizedChatTools';
import { useEnhancedKarma } from '@/hooks/useEnhancedKarma';
import { OnlineStatusToggle } from '@/components/OnlineStatusToggle';

import { useDailyPrompts } from '@/hooks/useDailyPrompts';
import { useInputValidation } from '@/hooks/useInputValidation';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useHealthMonitor } from '@/hooks/useHealthMonitor';

import { EngagementDashboard } from '@/components/engagement/EngagementDashboard';

import { GroupInvitePanel } from '@/components/sharing/GroupInvitePanel';
import { GroupPersonalityCard } from '@/components/group/GroupPersonalityCard';
import { GroupLifecycleBanner } from '@/components/group/GroupLifecycleBanner';

import { GroupNameManagement } from './GroupNameManagement';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { ActiveGameState, gameTimerManager } from '@/utils/gameTimerManager';
// Game preferences managed via useGamePreferences hook

import { DMModal } from './DMModal';

interface GroupChatProps {
  groupId: string;
  groupName: string;
  groupVibe: string;
  memberCount: number;
  onBack: () => void;
  onGoHome?: () => void;
}

export const GroupChat = ({ groupId, groupName, groupVibe, memberCount, onBack, onGoHome }: GroupChatProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = usePremium();

  const handleDMClick = () => {
    if (!isPremium) {
      toast({
        title: "Premium Required",
        description: "Direct messaging is available exclusively for premium subscribers. Upgrade to start private conversations!",
        variant: "destructive",
      });
      return;
    }
    setShowDMModal(true);
  };

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { messages, loading: messagesLoading, addMessage, addReaction, refetch } = useChatMessages(groupId);
  const { typingUsers } = useTypingIndicator(groupId, user?.id || '');
  const { pinnedMessages, pinMessage, unpinMessage } = usePinnedMessages(groupId);
  const { getOnlineCount, onlineUsers } = useOptimizedOnlineStatus(groupId);
  const onlineCount = getOnlineCount();
  const appState = useAppState();
  const [userProfile, setUserProfile] = useState<{ username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Removed showVoiceRoom state - now managed by VoiceRoomProvider
  const [activeView, setActiveView] = useState<string | null>(null);
  const [showEngagementDashboard, setShowEngagementDashboard] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [actualMemberCount, setActualMemberCount] = useState(memberCount);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [activeGame, setActiveGame] = useState<ActiveGameState | null>(null);
  const [showDMModal, setShowDMModal] = useState(false);
  const [showParticipationDialog, setShowParticipationDialog] = useState(false);
  const [pendingGame, setPendingGame] = useState<{ gameType: string; duration: number } | null>(null);
  
  // Use database-based cleared messages instead of localStorage
  const { clearedMessageIds, clearMessages, isMessageCleared } = useClearedMessages(groupId);
  const [groupKarmaTotal, setGroupKarmaTotal] = useState<number>(0);

  // Unified real-time chat
  const { isConnected } = useUnifiedRealtimeChat({
    groupId,
    onNewMessage: (message: ChatMessage) => {
      // Auto-scroll when new message arrives - FIXED: Proper timeout cleanup
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        smartScrollToBottom();
        setupScrollDetection();
      }, 100);
    },
    onReactionUpdate: () => {
      refetch();
    },
    onOnlineUsersUpdate: (users) => {
      // Online users are handled by the optimized hook
      console.log('Online users updated:', users.size);
    }
  });

  // New engagement and daily prompts hooks
  const { engagement, achievements, trackActivity } = useEngagement();
  const { trackKarmaActivity, trackEnhancedActivity } = useEnhancedKarma();
  const { getTodaysPrompt } = useDailyPrompts();
  const { validateMessageContent, checkRateLimit, sanitizeInput } = useInputValidation();
  const { trackError, trackUserAction } = usePerformanceMonitor();
  const { health, isOnline } = useHealthMonitor();
  const todaysPrompt = getTodaysPrompt();

  // Chat tools hooks
  const { polls, createPoll, votePoll, closePoll } = usePolls();
  const { playlists, createPlaylist, addSongToPlaylist, getActivePlaylist } = usePlaylists();
  const { prompts: wyrPrompts, createPrompt: createWYRPrompt, votePrompt: voteWYRPrompt } = useWouldYouRather();
  
  // Use database games instead of localStorage
  const { 
    thisOrThatGames: totPrompts, 
    emojiRiddleGames: riddles, 
    truthLieGames, 
    createThisOrThatGame: createTOTPrompt,
    createEmojiRiddleGame: createRiddle,
    createTruthLieGame: createTruthLieGame,
    voteThisOrThat,
    submitRiddleGuess,
    submitTruthLieGuess,
    endGame,
    deleteGameData
  } = useDatabaseGames(groupId);

  // Use database game preferences instead of localStorage
  const { preferences: gamePreferences, loading: preferencesLoading } = useGamePreferences();



  const loadGroupKarma = useCallback(async () => {
    if (!groupId) return;
    
    try {
      // Get all group members first
      const { data: memberData } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (memberData && memberData.length > 0) {
        // Get user engagement data for all members
        const userIds = memberData.map(member => member.user_id);
        const { data: engagementData } = await supabase
          .from('user_engagement')
          .select('user_id, achievement_points')
          .in('user_id', userIds);

        if (engagementData) {
          const totalKarma = engagementData.reduce((sum, engagement: any) => {
            return sum + (engagement.achievement_points || 0);
          }, 0);
          setGroupKarmaTotal(totalKarma);
        }
      }
    } catch (error) {
      console.error('Error loading group karma:', error);
      setGroupKarmaTotal(0);
    }
  }, [groupId]);





  // Smart scroll management with user scroll detection
  const messagesLengthRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const userScrolledRef = useRef(false);
  const scrollObserverRef = useRef<IntersectionObserver>();

  // Smart scroll function with user scroll detection
  const smartScrollToBottom = useCallback((force = false) => {
    if (!scrollAreaRef.current) return;
    
    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    // Don't auto-scroll if user has manually scrolled up (unless forced)
    if (!force && userScrolledRef.current) return;

    // Smooth scroll to bottom
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: 'smooth'
    });
  }, []);

  // Detect when user manually scrolls
  const setupScrollDetection = useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    // Create intersection observer to detect if user is at bottom
    const lastMessage = scrollContainer.lastElementChild;
    if (lastMessage && !scrollObserverRef.current) {
      scrollObserverRef.current = new IntersectionObserver(
        ([entry]) => {
          userScrolledRef.current = !entry.isIntersecting;
        },
        { threshold: 0.8 }
      );
      scrollObserverRef.current.observe(lastMessage);
    }
  }, []);

  // ✅ OPTIMIZED - Only scroll on new messages, not content changes
  useEffect(() => {
    const currentLength = messages?.length || 0;
    
    // Only scroll if we have new messages (length increased)
    if (currentLength > messagesLengthRef.current) {
      messagesLengthRef.current = currentLength;
      
      // Clear any pending scroll
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Debounced scroll with smart detection
      scrollTimeoutRef.current = setTimeout(() => {
        smartScrollToBottom();
        setupScrollDetection();
      }, 100);
    }
    
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages?.length, smartScrollToBottom, setupScrollDetection]); // Only depend on length!

  // Cleanup scroll observer
  useEffect(() => {
    return () => {
      scrollObserverRef.current?.disconnect();
    };
  }, []);

  // Game timer management removed for cleaner UX

  const loadUserProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, [user?.id]);

  const fetchActualMemberCount = useCallback(async () => {
    if (!groupId) return;
    
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id', { count: 'exact' })
        .eq('group_id', groupId);

      if (error) throw error;
      
      if (data) {
        setActualMemberCount(data.length);
      }
    } catch (error) {
      console.error('Error fetching member count:', error);
    }
  }, [groupId]);

  // useEffect to load user data when user or groupId changes
  useEffect(() => {
    if (user) {
      loadUserProfile();
      fetchActualMemberCount();
      loadGroupKarma();
    }
  }, [user, groupId, loadUserProfile, fetchActualMemberCount, loadGroupKarma]);

  const handleStartGame = (gameType: ActiveGameState['gameType'], duration?: number) => {
    if (!userProfile) return;
    
    // Don't start game if preferences are still loading
    if (preferencesLoading) {
      toast({
        title: "Loading...",
        description: "Please wait while preferences are loading.",
        variant: "destructive",
      });
      return;
    }
    
    const gameDuration = duration || gamePreferences.gameDuration;
    console.log('Starting game with duration:', gameDuration, 'minutes');
    
    // Check if another game is already active
    if (activeGame) {
      toast({
        title: "Game Already Active",
        description: "Please wait for the current game to finish before starting a new one.",
        variant: "destructive",
      });
      return;
    }
    
    // Show participation dialog for group members
    setPendingGame({ gameType, duration: gameDuration });
    setShowParticipationDialog(true);
  };

  const handleGameParticipation = (participate: boolean) => {
    if (!pendingGame || !userProfile) return;
    
    setShowParticipationDialog(false);
    
    if (participate) {
      const success = gameTimerManager.startGame(
        pendingGame.gameType as ActiveGameState['gameType'],
        crypto.randomUUID(),
        pendingGame.duration,
        {
          onTimeEnd: async () => {
            // Auto-end game when time expires - delete all data to prevent storage overload
            if (activeGame) {
              await deleteGameData(activeGame.gameType, activeGame.gameId);
            }
            setActiveGame(null);
            toast({
              title: "Game Ended",
              description: "Round completed - game data cleaned up!",
            });
          },
          onTick: (remaining) => {
            // Update active game state for UI
            const current = gameTimerManager.getActiveGame();
            if (current) {
              setActiveGame({ ...current });
            }
          }
        }
      );

      if (success) {
        const newActiveGame = gameTimerManager.getActiveGame();
        if (newActiveGame) {
          setActiveGame(newActiveGame);
          
          // Start the appropriate game with duration
          switch (pendingGame.gameType) {
            case 'thisorthat':
              const randomTOT = THIS_OR_THAT_PROMPTS[Math.floor(Math.random() * THIS_OR_THAT_PROMPTS.length)];
              const optionA = randomTOT.options[0]?.text || '';
              const optionB = randomTOT.options[1]?.text || '';
              
              if (!optionA || !optionB) {
                console.error('Invalid This or That prompt: missing options', randomTOT);
                toast({
                  title: "Game Error",
                  description: "Failed to create game - invalid prompt data",
                  variant: "destructive",
                });
                return;
              }
              
              createTOTPrompt(randomTOT.question, optionA, optionB, pendingGame.duration);
              break;
            case 'emojiriddle':
              const randomRiddle = EMOJI_RIDDLES[Math.floor(Math.random() * EMOJI_RIDDLES.length)];
              createRiddle(randomRiddle.emojis, randomRiddle.answer, randomRiddle.hint, randomRiddle.funFact, pendingGame.duration);
              break;
            case 'twoTruths':
              const randomStatements = [
                "I have traveled to 5 different countries",
                "I can speak 3 languages fluently", 
                "I have never been on a roller coaster"
              ];
              const lieStatementNumber = Math.floor(Math.random() * 3) + 1;
              createTruthLieGame(randomStatements, lieStatementNumber, pendingGame.duration);
              break;
          }

          trackActivity('tool');
          const getGameTypeDisplayName = (type: string) => {
            switch (type) {
              case 'thisorthat': return 'This or That';
              case 'emojiriddle': return 'Emoji Riddle';
              case 'twoTruths': return 'Two Truths & a Lie';
              default: return type;
            }
          };

          const getDurationText = (minutes: number) => {
            if (minutes === 1) return '1 minute';
            return `${minutes} minutes`;
          };

          toast({
            title: "Game Started",
            description: `${getGameTypeDisplayName(pendingGame.gameType)} round is now active for ${getDurationText(pendingGame.duration)}!`,
          });
        }
      }
    } else {
      toast({
        title: "Game Declined",
        description: "No problem! You can join the next game when it starts.",
      });
    }
    
    setPendingGame(null);
  };

  const handleExitGame = async () => {
    // End the game timer
    gameTimerManager.endGame();
    
    // Clean up the active game from database if it exists
    if (activeGame) {
      await endGame(activeGame.gameType, activeGame.gameId);
    }
    
    setActiveGame(null);
    toast({
      title: "Left Game",
      description: "You've left the current game session.",
    });
  };

  const handleEndGame = async () => {
    // End the game timer
    gameTimerManager.endGame();
    
    // Clean up the active game from database if it exists
    if (activeGame) {
      await endGame(activeGame.gameType, activeGame.gameId);
    }
    
    setActiveGame(null);
    
    // Game data is now managed by database - no need to clear local state
  };

  const handleToolSelect = (tool: string) => {
    if (!userProfile) return;
    
    // Track tool usage
    trackActivity('tool');

    switch (tool) {
      case 'poll':
        setActiveView('create-poll');
        break;
      case 'playlist':
        const activePlaylist = getActivePlaylist();
        if (activePlaylist) {
          setActiveView('playlist');
        } else {
          setActiveView('create-playlist');
        }
        break;
      case 'addsong':
        const playlist = getActivePlaylist();
        if (playlist) {
          setActiveView('playlist');
        } else {
          toast({
            title: "No Active Playlist",
            description: "Create a playlist first using /playlist",
            variant: "destructive",
          });
        }
        break;
      case 'wouldyourather':
        // Generate a random prompt
        const randomWYR = WOULD_YOU_RATHER_PROMPTS[Math.floor(Math.random() * WOULD_YOU_RATHER_PROMPTS.length)];
        createWYRPrompt(randomWYR.question, randomWYR.options);
        break;
      case 'truthslie':
        setActiveView('create-truthlie');
        break;
      // Start game flows for manual games
      case 'start-thisorthat':
        handleStartGame('thisorthat');
        break;
      case 'start-emojiriddle':
        handleStartGame('emojiriddle');
        break;
      case 'start-truthslie':
        handleStartGame('twoTruths');
        break;
      case 'game':
        // Show game picker - this will be handled by GameQuickPicker component
        setActiveView('game-picker');
        break;
    }
  };

  const handleSendTextMessage = async (content: string, type: 'text', mentions?: string[]) => {
    if (!user || !userProfile) return false;

    // Validate and sanitize input
    const sanitized = sanitizeInput(content);
    const validation = validateMessageContent(sanitized);
    
    if (!validation.isValid) {
      toast({
        title: "Invalid Message",
        description: validation.error,
        variant: "destructive",
      });
      return false;
    }

    // Check rate limit
    if (!(await checkRateLimit())) {
      return false;
    }

    setIsLoading(true);
    try {
      const success = await addMessage({
        content: sanitized,
        messageType: type
      });

      if (success) {
        // Track engagement and user action
        trackEnhancedActivity('message');
        trackUserAction('send_text_message');
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      trackError(error as Error, 'send_text_message');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    if (!user || !userProfile) return false;

    // Skip rate limiting for GIFs to improve performance
    // GIFs are less likely to be spam compared to text messages
    
    setIsLoading(true);
    try {
      // Optimized GIF processing - immediate UI feedback
      const success = await addMessage({
        messageType: 'gif',
        gifUrl
      });

      if (success) {
        // Background karma tracking (non-blocking)
        Promise.resolve().then(async () => {
          try {
            trackActivity('message');
            trackUserAction('send_gif');
          } catch (error) {
            console.warn('Background karma tracking failed for GIF:', error);
          }
        });
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error sending GIF:', error);
      trackError(error as Error, 'send_gif');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVoice = async (audioBlob: Blob) => {
    if (!user || !userProfile) return false;

    setIsLoading(true);

    try {
      // Create a temporary URL for playback (in production, upload to storage)
      const audioUrl = URL.createObjectURL(audioBlob);

      const success = await addMessage({
        messageType: 'voice',
        voiceAudioUrl: audioUrl,
        voiceTranscription: 'Voice message' // Placeholder for now
      });

      if (success) {
        // Track karma for voice note with group ID
        trackKarmaActivity('voice', 2, 'Sent voice message', 1.0, groupId);
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error processing voice message:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const success = await addReaction(messageId, emoji);
      
      if (success) {
        // Track engagement
              trackActivity('reaction');
        
        // Karma tracked silently
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleHideMessage = async (messageId: string) => {
    await clearMessages([messageId]);
  };

  const handleClearChat = async () => {
    // Clear messages using database instead of localStorage
    const messageIds = messages.map(m => m.id);
    const success = await clearMessages(messageIds);
    
    if (success) {
      // Also clean up any active games when clearing chat - delete all data
      if (activeGame) {
        await deleteGameData(activeGame.gameType, activeGame.gameId);
        gameTimerManager.endGame();
        setActiveGame(null);
      }
      
      toast({
        title: "Chat cleared",
        description: "All messages and game data have been permanently deleted",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to clear messages. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    // Refresh current page data without navigating away
    window.location.reload();
  };

  const renderActiveView = () => {
    if (!userProfile) return null;

    switch (activeView) {
      case 'create-poll':
        return (
          <CreatePoll
            onCreatePoll={(question, options) => {
              createPoll(question, options, userProfile.username);
              setActiveView(null);
              toast({
                title: "Poll Created",
                description: "Your poll is now live in the chat!",
              });
            }}
            onCancel={() => setActiveView(null)}
          />
        );

      case 'create-playlist':
        return (
          <CreatePlaylist
            onCreatePlaylist={(name) => {
              createPlaylist(name);
              setActiveView('playlist');
              toast({
                title: "Playlist Created",
                description: `${name} is ready for songs!`,
              });
            }}
            onCancel={() => setActiveView(null)}
          />
        );

      case 'playlist':
        const activePlaylist = getActivePlaylist();
        if (!activePlaylist) return null;
        return (
          <PlaylistBuilder
            playlist={activePlaylist}
            currentUserId={user?.id || ''}
            onAddSong={(songQuery) => {
              addSongToPlaylist(activePlaylist.id, songQuery, userProfile.username);
              toast({
                title: "Song Added",
                description: "Added to the collaborative playlist!",
              });
            }}
          />
        );

      case 'create-truthlie':
        return (
          <CreateTruthLie
            onCreateGame={(statements) => {
              createTruthLieGame(statements, 1); // Default lie statement number
              setActiveView(null);
              toast({
                title: "Game Started",
                description: "Two Truths and a Lie is now active!",
              });
            }}
            onCancel={() => setActiveView(null)}
          />
        );

      case 'game-picker':
        return (
          <GameQuickPicker 
            onGameSelect={(gameType, duration) => {
              setActiveView(null);
              handleStartGame(gameType as ActiveGameState['gameType'], duration);
            }}
            disabled={false}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Voice Room - now managed by VoiceRoomProvider */}
      <CollapsibleVoiceRoom groupName={groupName} />

      <ResponsiveModal
        open={!!activeView && activeView !== 'game-picker'}
        onOpenChange={(open) => !open && setActiveView(null)}
        title="Chat Tools"
        className="max-w-2xl"
      >
        {renderActiveView()}
      </ResponsiveModal>

      {showEngagementDashboard && (
        <EngagementDashboard onClose={() => setShowEngagementDashboard(false)} />
      )}

      {showInvitePanel && (
        <GroupInvitePanel 
          groupId={groupId}
          groupName={groupName}
          onClose={() => setShowInvitePanel(false)} 
        />
      )}
      <div className="flex flex-col h-screen max-h-screen max-w-6xl mx-auto bg-background rounded-lg shadow-lg overflow-hidden">
        {/* Modern Chat Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-background to-muted/30 backdrop-blur-sm sticky top-0 z-10 min-h-[60px]">
          {/* Mobile Navigation - Left Section */}
          <div className="flex items-center gap-2 md:hidden flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2 hover:bg-muted/50"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Left Section - Room Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <h2 className="font-semibold text-base sm:text-lg truncate text-foreground">{groupName}</h2>
                <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs">
                    {groupVibe}
                  </Badge>
                  {groupKarmaTotal > 0 && (
                    <Badge variant="outline" className="text-xs px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs">
                      {groupKarmaTotal} ⭐
                    </Badge>
                  )}
                  {onlineCount > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 sm:px-2 py-0.5 flex items-center gap-1 text-[10px] sm:text-xs">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="hidden sm:inline">{onlineCount} online</span>
                      <span className="sm:hidden">{onlineCount}</span>
                    </Badge>
                  )}
                  {!isConnected && (
                    <Badge variant="destructive" className="text-xs px-1.5 sm:px-2 py-0.5 animate-pulse text-[10px] sm:text-xs">
                      <span className="hidden sm:inline">Reconnecting...</span>
                      <span className="sm:hidden">...</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Online Status Toggle */}
            <OnlineStatusToggle groupId={groupId} />
            
            {/* Members Button - Always visible */}
            <GroupMembersList 
              groupId={groupId}
              memberCount={actualMemberCount}
            />

            {/* More Options Menu - Mobile: All actions, Desktop: Secondary actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 w-9 p-0 rounded-full hover:bg-muted/50"
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Mobile-only actions */}
                <div className="md:hidden">
                  <DropdownMenuItem onClick={handleRefresh}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onGoHome}>
                    <Home className="w-4 h-4 mr-2" />
                    Go to Home
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDMClick}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Direct Messages
                  </DropdownMenuItem>
                </div>
                
                {/* Common actions */}
                <DropdownMenuItem onClick={handleClearChat}>
                  <Eraser className="w-4 h-4 mr-2" />
                  Clear Chat
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Group Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop-only buttons */}
            <div className="hidden md:flex items-center gap-2">
              {/* Refresh Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh} 
                className="h-9 w-9 p-0 rounded-full hover:bg-muted/50"
                title="Refresh Chat"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>

              {/* Home Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onGoHome} 
                className="h-9 w-9 p-0 rounded-full hover:bg-muted/50"
                title="Go to Home"
              >
                <Home className="w-4 h-4" />
              </Button>

              {/* DM Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDMClick} 
                className="h-9 w-9 p-0 rounded-full hover:bg-muted/50"
                title="Direct Messages"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>

            {/* Leave Button - Always visible but smaller on mobile */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSwitchDialog(true)} 
              className="h-9 px-2 sm:px-3 text-xs sm:text-sm font-medium border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden sm:inline">Leave</span>
            </Button>
          </div>
        </div>

        {/* Pinned Messages */}
        <PinnedMessagesPanel 
          pinnedMessages={pinnedMessages}
          onUnpin={unpinMessage}
        />
        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-3 sm:p-4 min-h-0">
          <div className="space-y-4">
            
            {/* Loading state */}
            {messagesLoading ? (
              <div className="text-center py-20">
                <LoadingSpinner size="lg" text="Loading messages..." />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10 sm:py-20 text-muted-foreground">
                <div className="max-w-md mx-auto space-y-4">
                  <h3 className="text-lg sm:text-xl font-medium text-foreground">Ready to connect?</h3>
                  <p className="text-sm leading-relaxed px-4">
                    Start the conversation! Share what's on your mind, ask a question, or just say hello. 
                    Your group is waiting to hear from you.
                  </p>
                </div>
              </div>
            ) : (
              /* Show only user messages once someone has sent a message */
              messages
                .filter((message) => !isMessageCleared(message.id))
                .map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onReact={handleReaction}
                    onPin={pinMessage}
                    onHideMessage={handleHideMessage}
                    currentUserId={user?.id}
                    groupId={groupId}
                  />
                ))
            )}

            {/* Active Game Display */}
            {activeGame && (
              <ActiveGameDisplay
                game={activeGame}
                onExit={handleExitGame}
                currentUserId={user?.id || ''}
                currentUsername={userProfile?.username || 'Anonymous'}
              />
            )}

            {/* Active Games Section - Moved to bottom */}
            {(totPrompts.length > 0 || riddles.length > 0 || truthLieGames.length > 0) && (
              <div className="space-y-4 mt-6 pt-4 border-t">
                {/* Two Truths and a Lie Games */}
                {truthLieGames.map(game => {
                  // Process guesses data
                  const guesses = game.truth_lie_guesses || [];
                  const processedGuesses = guesses.map(guess => ({
                    userId: guess.user_id,
                    username: 'Anonymous', // TODO: Get username from profiles
                    guessedLieNumber: guess.guessed_lie_number,
                    isCorrect: guess.is_correct,
                    timestamp: new Date(guess.created_at)
                  }));
                  
                  return (
                    <TruthLieGame
                      key={game.id}
                      game={{
                        id: game.id,
                        createdBy: game.created_by,
                        createdByUsername: 'Anonymous', // TODO: Get username from profiles
                        statements: [
                          { id: '1', text: game.statement_1, isLie: game.lie_statement_number === 1 },
                          { id: '2', text: game.statement_2, isLie: game.lie_statement_number === 2 },
                          { id: '3', text: game.statement_3, isLie: game.lie_statement_number === 3 }
                        ],
                        guesses: processedGuesses,
                        isActive: game.is_active,
                        expiresAt: new Date(game.expires_at)
                      }}
                      currentUserId={user?.id || ''}
                      currentUsername={userProfile?.username || 'Anonymous'}
                      onGuess={async (gameId, statementId) => {
                        if (user?.id) {
                          const guessedLieNumber = parseInt(statementId);
                          const success = await submitTruthLieGuess(gameId, guessedLieNumber);
                          if (success) {
                            trackActivity('game_participation');
                            toast({
                              title: "Guess submitted!",
                              description: "Your guess has been recorded.",
                            });
                          } else {
                            toast({
                              title: "Guess failed",
                              description: "Could not submit your guess. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                    />
                  );
                })}

                {/* This or That Prompts */}
                {totPrompts.map(prompt => {
                  // Process votes data
                  const votes = prompt.this_or_that_votes || [];
                  const optionAVotes = votes.filter(v => v.choice === 'A');
                  const optionBVotes = votes.filter(v => v.choice === 'B');
                  
                  return (
                    <ThisOrThat
                      key={prompt.id}
                      prompt={{
                        id: prompt.id,
                        question: prompt.question,
                        options: [
                          { 
                            id: 'A', 
                            text: prompt.option_a, 
                            emoji: '🍕', 
                            votes: optionAVotes.length, 
                            voters: optionAVotes.map(v => v.user_id) 
                          },
                          { 
                            id: 'B', 
                            text: prompt.option_b, 
                            emoji: '🍔', 
                            votes: optionBVotes.length, 
                            voters: optionBVotes.map(v => v.user_id) 
                          }
                        ],
                        createdAt: new Date(prompt.created_at),
                        expiresAt: new Date(prompt.expires_at),
                        isActive: prompt.is_active
                      }}
                      currentUserId={user?.id || ''}
                      onVote={async (promptId, optionId) => {
                        if (user?.id) {
                          const success = await voteThisOrThat(promptId, optionId);
                          if (success) {
                            trackActivity('tool');
                            toast({
                              title: "Vote submitted!",
                              description: "Your choice has been recorded.",
                            });
                          } else {
                            toast({
                              title: "Vote failed",
                              description: "Could not submit your vote. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                    />
                  );
                })}
                
                {/* Emoji Riddles */}
                {riddles.map(riddle => {
                  // Process guesses data
                  const guesses = riddle.emoji_riddle_guesses || [];
                  const processedGuesses = guesses.map(guess => ({
                    userId: guess.user_id,
                    username: 'Anonymous', // TODO: Get username from profiles
                    guess: guess.guess,
                    timestamp: new Date(guess.created_at),
                    isCorrect: guess.guess.toLowerCase().trim() === riddle.answer.toLowerCase().trim()
                  }));
                  
                  return (
                    <EmojiRiddleGame
                      key={riddle.id}
                      riddle={{
                        id: riddle.id,
                        emojis: riddle.emojis,
                        answer: riddle.answer,
                        hint: riddle.hint || '',
                        funFact: riddle.fun_fact || '',
                        guesses: processedGuesses,
                        solvedBy: processedGuesses.find(g => g.isCorrect)?.username,
                        solvedAt: processedGuesses.find(g => g.isCorrect)?.timestamp,
                        createdAt: new Date(riddle.created_at),
                        expiresAt: new Date(riddle.expires_at),
                        isActive: riddle.is_active
                      }}
                      currentUserId={user?.id || ''}
                      currentUsername={userProfile?.username || 'Anonymous'}
                      onGuess={async (riddleId, guess) => {
                        if (user?.id && userProfile?.username) {
                          const success = await submitRiddleGuess(riddleId, guess);
                          if (success) {
                            trackActivity('tool');
                            toast({
                              title: "Guess submitted!",
                              description: "Your guess has been recorded.",
                            });
                          } else {
                            toast({
                              title: "Guess failed",
                              description: "Could not submit your guess. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Typing Indicator */}
        <TypingIndicator typingUsers={typingUsers} />

        {/* Game Selection - Show directly above chat input */}
        {activeView === 'game-picker' && (
          <div className="border-t border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">Select a Game</h3>
              <button 
                onClick={() => setActiveView(null)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Two Truths & a Lie */}
              <button
                onClick={() => {
                  setActiveView(null);
                  handleToolSelect('start-truthslie');
                }}
                className="p-4 text-left rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-blue-500 text-sm">🎯</span>
                  </div>
                  <h4 className="font-medium text-foreground">Two Truths & a Lie</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Share two true facts and one lie about yourself. Let others guess which is which!
                </p>
                <div className="flex items-center text-xs text-blue-500">
                  <span>Start Game</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </button>

              {/* This or That */}
              <button
                onClick={() => {
                  setActiveView(null);
                  handleToolSelect('start-thisorthat');
                }}
                className="p-4 text-left rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-green-500 text-sm">⚖️</span>
                  </div>
                  <h4 className="font-medium text-foreground">This or That</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Quick choices: Pizza or Burgers? Summer or Winter? Books or Movies?
                </p>
                <div className="flex items-center text-xs text-green-500">
                  <span>Ask Question</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </button>

              {/* Emoji Riddle */}
              <button
                onClick={() => {
                  setActiveView(null);
                  handleToolSelect('start-emojiriddle');
                }}
                className="p-4 text-left rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-purple-500 text-sm">🧩</span>
                  </div>
                  <h4 className="font-medium text-foreground">Emoji Riddle</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Guess what movie, song, or phrase these emojis represent! 🎬🍿
                </p>
                <div className="flex items-center text-xs text-purple-500">
                  <span>Create Riddle</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendTextMessage}
          onSendGif={handleSendGif}
          onSendVoice={handleSendVoice}
          onToolSelect={handleToolSelect}
          disabled={!userProfile || !isConnected}
          loading={isLoading || messagesLoading}
          groupId={groupId}
          groupName={groupName}
        />
      </div>

      {/* Group Switch Dialog */}
      <GroupSwitchDialog
        isOpen={showSwitchDialog}
        onClose={() => setShowSwitchDialog(false)}
        groupId={groupId}
        groupName={groupName}
        onSwitchSuccess={(newGroupId, newGroupData) => {
          // Handle successful group switch
          if (onGoHome) {
            onGoHome(); // Go back to home to trigger group data refresh
          }
        }}
      />

      {/* Voice Button moved to header - FloatingVoiceButton removed */}



      {/* DM Modal */}
      <DMModal 
        open={showDMModal} 
        onOpenChange={setShowDMModal}
        groupId={groupId}
      />

      {/* Game Participation Dialog */}
      {showParticipationDialog && pendingGame && (
        <GameParticipationDialog
          isOpen={showParticipationDialog}
          onClose={() => setShowParticipationDialog(false)}
          onParticipate={() => handleGameParticipation(true)}
          onDecline={() => handleGameParticipation(false)}
          gameType={pendingGame.gameType}
          gameDuration={pendingGame.duration}
          creatorUsername={userProfile?.username || 'Anonymous'}
        />
      )}
    </>
  );
};

