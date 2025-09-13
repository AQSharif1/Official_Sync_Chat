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
import { useEngagement } from '@/hooks/useEngagement';

import { useAppState } from '@/hooks/useAppState';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  usePolls, 
  usePlaylists, 
  useWouldYouRather, 
  useTruthLie, 
  useThisOrThat, 
  useEmojiRiddles 
} from '@/hooks/useOptimizedChatTools';
import { useEnhancedKarma } from '@/hooks/useEnhancedKarma';

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
import { loadGamePreferences } from '@/utils/gamePreferences';
// Game preferences managed via GameQuickPicker component

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

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { messages, loading: messagesLoading, addMessage, addReaction, refetch } = useChatMessages(groupId);
  const { typingUsers } = useTypingIndicator(groupId, user?.id || '');
  const { pinnedMessages, pinMessage, unpinMessage } = usePinnedMessages(groupId);
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
  const [hiddenMessages, setHiddenMessages] = useState<Set<string>>(new Set());
  const [showDMModal, setShowDMModal] = useState(false);
  
  // Load previously cleared messages from localStorage on component mount
  useEffect(() => {
    const clearedMessages = JSON.parse(localStorage.getItem('clearedMessages') || '[]');
    if (clearedMessages.length > 0) {
      setHiddenMessages(new Set(clearedMessages));
    }
  }, []);
  const [groupKarmaTotal, setGroupKarmaTotal] = useState<number>(0);

  // Enhanced real-time chat
  const { isConnected } = useRealtimeChat({
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
    }
  });

  // New engagement and daily prompts hooks
  const { engagement, achievements, trackActivity, trackKarmaActivity } = useEngagement();
  const { trackEnhancedActivity } = useEnhancedKarma();
  const { getTodaysPrompt } = useDailyPrompts();
  const { validateMessageContent, checkRateLimit, sanitizeInput } = useInputValidation();
  const { trackError, trackUserAction } = usePerformanceMonitor();
  const { health, isOnline } = useHealthMonitor();
  const todaysPrompt = getTodaysPrompt();

  // Chat tools hooks
  const { polls, createPoll, votePoll, closePoll } = usePolls();
  const { playlists, createPlaylist, addSongToPlaylist, getActivePlaylist } = usePlaylists();
  const { prompts: wyrPrompts, createPrompt: createWYRPrompt, votePrompt: voteWYRPrompt } = useWouldYouRather();
  const { games: truthLieGames, createGame: createTruthLieGame, makeGuess: makeTruthLieGuess } = useTruthLie();
  const { prompts: totPrompts, createPrompt: createTOTPrompt, votePrompt: voteTOTPrompt, clearPrompts: clearTOTPrompts } = useThisOrThat();
  const { riddles, createRiddle, makeGuess: makeRiddleGuess, clearRiddles } = useEmojiRiddles();



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

  const handleStartGame = (gameType: ActiveGameState['gameType']) => {
    if (!userProfile) return;
    
    const gamePrefs = loadGamePreferences();
    const success = gameTimerManager.startGame(
      gameType,
      crypto.randomUUID(),
      gamePrefs.gameDuration,
      {
        onTimeEnd: () => {
          // Auto-end game when time expires
          setActiveGame(null);
          toast({
            title: "Game Ended",
            description: "Round completed - results posted!",
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
      setActiveGame(newActiveGame);
      
      // Start the appropriate game
      switch (gameType) {
        case 'thisorthat':
          const randomTOT = THIS_OR_THAT_PROMPTS[Math.floor(Math.random() * THIS_OR_THAT_PROMPTS.length)];
          createTOTPrompt(randomTOT.question, randomTOT.options);
          break;
        case 'emojiriddle':
          const randomRiddle = EMOJI_RIDDLES[Math.floor(Math.random() * EMOJI_RIDDLES.length)];
          createRiddle(randomRiddle.emojis, randomRiddle.answer, randomRiddle.hint, randomRiddle.funFact);
          break;
        case 'twoTruths':
          // Create a random Two Truths & a Lie game directly
          const randomStatements = [
            "I have traveled to 5 different countries",
            "I can speak 3 languages fluently", 
            "I have never been on a roller coaster"
          ];
          createTruthLieGame(randomStatements, user?.id || '', userProfile.username);
          break;
      }

      trackActivity('tool');
      toast({
        title: "Game Started",
        description: `${gameType} round is now active for ${gamePrefs.gameDuration} minutes!`,
      });
    } else {
      toast({
        title: "Cannot Start Game",
        description: "A round is already active.",
        variant: "destructive",
      });
    }
  };

  const handleEndGame = () => {
    gameTimerManager.endGame();
    setActiveGame(null);
    
    // Clear any active games
    clearTOTPrompts();
    clearRiddles();
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
        trackActivity('message');
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

    // Check rate limit
    if (!(await checkRateLimit())) {
      return false;
    }

    setIsLoading(true);
    try {
      const success = await addMessage({
        messageType: 'gif',
        gifUrl
      });

      if (success) {
        // Track engagement
        trackActivity('message');
        trackUserAction('send_gif');
        
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
        trackKarmaActivity(groupId, 'voice_note', 2, 'Sent voice message', 1.0);
        
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

  const handleHideMessage = (messageId: string) => {
    setHiddenMessages(prev => new Set(prev).add(messageId));
  };

  const handleClearChat = () => {
    // Permanently clear messages from user's local view by storing in localStorage
    const clearedMessageIds = messages.map(m => m.id);
    const existingCleared = JSON.parse(localStorage.getItem('clearedMessages') || '[]');
    const allCleared = [...existingCleared, ...clearedMessageIds];
    localStorage.setItem('clearedMessages', JSON.stringify(allCleared));
    
    // Also set in current state for immediate effect
    setHiddenMessages(new Set(clearedMessageIds));
    
    toast({
      title: "Chat cleared",
      description: "All messages have been permanently removed from your view",
    });
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
              createTruthLieGame(statements, user?.id || '', userProfile.username);
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
            onGameSelect={(gameType) => {
              setActiveView(null);
              handleToolSelect(gameType);
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
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto bg-background rounded-lg shadow-lg overflow-hidden">
        {/* Modern Chat Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-background to-muted/30 backdrop-blur-sm sticky top-0 z-10">
          {/* Mobile Navigation - Left Section */}
          <div className="flex items-center gap-2 md:hidden">
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
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-lg truncate text-foreground">{groupName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {groupVibe}
                  </Badge>
                  {groupKarmaTotal > 0 && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {groupKarmaTotal} ⭐
                    </Badge>
                  )}
                  {!isConnected && (
                    <Badge variant="destructive" className="text-xs px-2 py-0.5 animate-pulse">
                      Reconnecting...
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
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

            {/* Members Button */}
            <GroupMembersList 
              groupId={groupId}
              memberCount={actualMemberCount}
            />

            {/* DM Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDMModal(true)} 
              className="h-9 w-9 p-0 rounded-full hover:bg-muted/50"
              title="Direct Messages"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>

            {/* More Options Menu */}
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

            {/* Leave Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSwitchDialog(true)} 
              className="h-9 px-3 text-sm font-medium border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Leave
            </Button>
          </div>
        </div>

        {/* Pinned Messages */}
        <PinnedMessagesPanel 
          pinnedMessages={pinnedMessages}
          onUnpin={unpinMessage}
        />
        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
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
                .filter((message) => !hiddenMessages.has(message.id))
                .map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onReact={handleReaction}
                    onPin={pinMessage}
                    onHideMessage={handleHideMessage}
                    currentUserId={user?.id}
                  />
                ))
            )}

            {/* Active Games Section - Moved to bottom */}
            {(totPrompts.length > 0 || riddles.length > 0 || truthLieGames.length > 0) && (
              <div className="space-y-4 mt-6 pt-4 border-t">
                {/* Two Truths and a Lie Games */}
                {truthLieGames.filter(g => g.isActive).map(game => (
                  <TruthLieGame
                    key={game.id}
                    game={game}
                    currentUserId={user?.id || ''}
                    currentUsername={userProfile?.username || 'Anonymous'}
                    onGuess={(gameId, statementId) => {
                      if (user?.id) {
                        makeTruthLieGuess(gameId, statementId, user.id);
                        trackActivity('game_participation');
                      }
                    }}
                  />
                ))}

                {/* This or That Prompts */}
                {totPrompts.filter(p => p.isActive).map(prompt => (
                  <ThisOrThat
                    key={prompt.id}
                    prompt={prompt}
                    currentUserId={user?.id || ''}
                    onVote={(promptId, optionId) => {
                      if (user?.id) {
                        voteTOTPrompt(promptId, optionId, user.id);
                        trackActivity('tool');
                      }
                    }}
                  />
                ))}
                
                {/* Emoji Riddles */}
                {riddles.filter(r => r.isActive).map(riddle => (
                  <EmojiRiddleGame
                    key={riddle.id}
                    riddle={riddle}
                    currentUserId={user?.id || ''}
                    currentUsername={userProfile?.username || 'Anonymous'}
                    onGuess={(riddleId, guess) => {
                      if (user?.id && userProfile?.username) {
                        makeRiddleGuess(riddleId, guess, user.id, userProfile.username);
                        trackActivity('tool');
                      }
                    }}
                  />
                ))}
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
    </>
  );
};

