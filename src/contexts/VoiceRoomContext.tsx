import React, { createContext, useContext, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeVoiceChat } from '@/utils/RealtimeAudio';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Types and interfaces
interface VoiceParticipant {
  userId: string;
  name: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
  joinedAt: string;
}

interface VoiceMessage {
  id: string;
  type: 'user_speech' | 'ai_response';
  content: string;
  timestamp: Date;
}

interface VoiceRoomState {
  isConnected: boolean;
  isConnecting: boolean;
  participants: VoiceParticipant[];
  participantCount: number;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
  messages: VoiceMessage[];
  currentTranscript: string;
  isCollapsed: boolean;
  isMinimized: boolean;
}

interface VoiceRoomActions {
  joinVoiceRoom: (groupId: string, groupName: string) => Promise<void>;
  leaveVoiceRoom: () => Promise<void>;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleHandRaise: () => void;
  toggleCollapse: () => void;
  toggleMinimize: () => void;
  getConnectionStatus: () => { isConnected: boolean; participantCount: number };
}

type VoiceRoomContextType = VoiceRoomState & VoiceRoomActions;

// Create context
const VoiceRoomContext = createContext<VoiceRoomContextType | undefined>(undefined);

// Custom hook to use voice room context
export const useVoiceRoom = () => {
  const context = useContext(VoiceRoomContext);
  if (!context) {
    throw new Error('useVoiceRoom must be used within a VoiceRoomProvider');
  }
  return context;
};

// Provider component
interface VoiceRoomProviderProps {
  children: React.ReactNode;
}

// Global Audio Context Manager
class AudioContextManager {
  private static instance: AudioContextManager;
  private audioContext: AudioContext | null = null;
  private refCount = 0;

  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  async getContext(): Promise<AudioContext> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    this.refCount++;
    return this.audioContext;
  }

  releaseContext(): void {
    this.refCount--;
    
    // Only close when no more references
    if (this.refCount <= 0 && this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.refCount = 0;
    }
  }

  forceClose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.refCount = 0;
  }
}

// Custom useDebounce hook with proper cleanup
const useDebounce = (func: Function, wait: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const debounced = useCallback((...args: any[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => func(...args), wait);
  }, [func, wait]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  
  return debounced;
};

export const VoiceRoomProvider: React.FC<VoiceRoomProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [state, setState] = useState<VoiceRoomState>({
    isConnected: false,
    isConnecting: false,
    participants: [],
    participantCount: 0,
    isMuted: false,
    isDeafened: false,
    isSpeaking: false,
    handRaised: false,
    messages: [],
    currentTranscript: '',
    isCollapsed: true,
    isMinimized: false,
  });

  // Refs for stable references
  const voiceChatRef = useRef<RealtimeVoiceChat | null>(null);
  const channelRef = useRef<any>(null);
  const currentGroupId = useRef<string | null>(null);
  const presenceUpdateInProgress = useRef(false);
  const latestPresenceDataRef = useRef<any>(null);
  
  // Presence state machine refs
  const presenceStateRef = useRef<'idle' | 'syncing' | 'updating'>('idle');
  const presenceQueueRef = useRef<Array<() => Promise<void>>>([]);

  // Cleanup tracking refs - prevents infinite loops
  const cleanupFunctions = useRef<(() => void)[]>([]);
  const isCleaningUp = useRef(false);

  // Audio context manager
  const audioContextManager = AudioContextManager.getInstance();

  // Add cleanup function to tracking
  const addCleanup = useCallback((fn: () => void) => {
    cleanupFunctions.current.push(fn);
  }, []);

  // Debounced presence update with proper cleanup
  const debouncedPresenceUpdate = useDebounce(async () => {
    if (!channelRef.current || 
        presenceUpdateInProgress.current || 
        !latestPresenceDataRef.current) return;
    
    presenceUpdateInProgress.current = true;
    
    try {
      await channelRef.current.track(latestPresenceDataRef.current);
      latestPresenceDataRef.current = null; // Clear after use
    } catch (error) {
      // Silent error handling for production
    } finally {
      setTimeout(() => {
        presenceUpdateInProgress.current = false;
      }, 100);
    }
  }, 500);

  // Unified presence processor to prevent race conditions
  const processPresenceUpdate = useCallback(async (updateFn: () => Promise<void>) => {
    presenceQueueRef.current.push(updateFn);
    
    if (presenceStateRef.current !== 'idle') return;
    
    presenceStateRef.current = 'syncing';
    
    while (presenceQueueRef.current.length > 0) {
      const update = presenceQueueRef.current.shift();
      if (update) {
        try {
          await update();
        } catch (error) {
          // Silent error handling for production
        }
      }
    }
    
    presenceStateRef.current = 'idle';
  }, []);

  // Voice message handler for OpenAI Realtime
  const handleVoiceMessage = useCallback((message: any) => {
    if (message.type === 'response.audio_transcript.delta') {
      setState(prev => ({
        ...prev,
        currentTranscript: prev.currentTranscript + message.delta,
        isSpeaking: true
      }));
    } else if (message.type === 'response.audio_transcript.done') {
      setState(prev => {
        const newMessages = prev.currentTranscript.trim() 
          ? [...prev.messages.slice(-50), { // Keep only last 50 messages to prevent memory leak
              id: crypto.randomUUID(),
              type: 'ai_response' as const,
              content: prev.currentTranscript.trim(),
              timestamp: new Date(),
            }]
          : prev.messages;

        return {
          ...prev,
          messages: newMessages,
          currentTranscript: '',
          isSpeaking: false
        };
      });
    } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages.slice(-50), { // Keep only last 50 messages to prevent memory leak
          id: crypto.randomUUID(),
          type: 'user_speech' as const,
          content: message.transcript,
          timestamp: new Date(),
        }]
      }));
    } else if (message.type === 'error') {
      toast({
        title: "Voice Room Error",
        description: message.message || "An error occurred in the voice room",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Improved presence sync handler with state machine
  const handlePresenceSync = useCallback(() => {
    processPresenceUpdate(async () => {
      if (!channelRef.current) return;

      const newState = channelRef.current.presenceState() || {};
      const newParticipants: VoiceParticipant[] = [];
      
      Object.keys(newState).forEach(key => {
        const presences = newState[key];
        if (presences && presences.length > 0) {
          const participant = presences[0];
          if (participant.userId !== user?.id) {
            newParticipants.push({
              userId: participant.userId,
              name: participant.name,
              isMuted: participant.isMuted || false,
              isDeafened: participant.isDeafened || false,
              isSpeaking: participant.isSpeaking || false,
              handRaised: participant.handRaised || false,
              joinedAt: participant.joinedAt
            });
          }
        }
      });

      setState(prev => ({
        ...prev,
        participants: newParticipants,
        participantCount: newParticipants.length + (prev.isConnected ? 1 : 0)
      }));
    });
  }, [user?.id, processPresenceUpdate]);

  // Connection management
  const joinVoiceRoom = useCallback(async (groupId: string, groupName: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join the voice room",
        variant: "destructive",
      });
      return;
    }

    if (state.isConnecting || state.isConnected) {
      toast({
        title: "Already Connected",
        description: "You are already in a voice room",
      });
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      // Initialize OpenAI Realtime voice chat
      const handleConnectionChange = (connected: boolean) => {
        // Silent error handling for production
      };

      voiceChatRef.current = new RealtimeVoiceChat(
        handleVoiceMessage,
        handleConnectionChange
      );

      await voiceChatRef.current.connect();

      // Set up Supabase realtime channel
      const channel = supabase.channel(`voice-${groupId}`, {
        config: {
          presence: { key: user.id }
        }
      });

      channelRef.current = channel;
      currentGroupId.current = groupId;

      // Set up presence handlers
      channel
        .on('presence', { event: 'sync' }, handlePresenceSync)
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          // Silent error handling for production
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          // Silent error handling for production
        });

      // Subscribe and track presence
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const presenceData = {
            userId: user.id,
            name: user.email?.split('@')[0] || 'User',
            isMuted: false,
            isDeafened: false,
            isSpeaking: false,
            handRaised: false,
            joinedAt: new Date().toISOString()
          };

          // Store in ref for debounced update
          latestPresenceDataRef.current = presenceData;
          debouncedPresenceUpdate();
          
          setState(prev => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            isCollapsed: false // Auto-expand when joining
          }));

          toast({
            title: "Voice Room Connected",
            description: `Connected to ${groupName} voice room`,
          });
        }
      });

    } catch (error) {
      // Silent error handling for production
      setState(prev => ({ ...prev, isConnecting: false }));
      
      toast({
        title: "Connection Failed",
        description: "Failed to join voice room. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, state.isConnecting, state.isConnected, handleVoiceMessage, handlePresenceSync, debouncedPresenceUpdate, toast]);

  const leaveVoiceRoom = useCallback(async () => {
    try {
      // Cleanup OpenAI connection
      if (voiceChatRef.current) {
        voiceChatRef.current.disconnect();
        voiceChatRef.current = null;
      }

      // Cleanup Supabase channel
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      currentGroupId.current = null;

      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        participants: [],
        participantCount: 0,
        messages: [],
        currentTranscript: '',
        isSpeaking: false,
        isCollapsed: true
      }));

      toast({
        title: "Voice Room Disconnected",
        description: "Left the voice room",
      });

    } catch (error) {
      // Silent error handling for production
    }
  }, [toast]);

  // Audio controls with ref-based presence updates
  const toggleMute = useCallback(() => {
    if (!user || !channelRef.current) return;

    const newMutedState = !state.isMuted;
    setState(prev => ({ ...prev, isMuted: newMutedState }));

    // Store latest data in ref instead of passing directly
    latestPresenceDataRef.current = {
      userId: user.id,
      name: user.email?.split('@')[0] || 'User',
      isMuted: newMutedState,
      isDeafened: state.isDeafened,
      isSpeaking: state.isSpeaking,
      handRaised: state.handRaised,
      joinedAt: new Date().toISOString()
    };
    
    debouncedPresenceUpdate();
  }, [user, state.isMuted, state.isDeafened, debouncedPresenceUpdate]);

  const toggleDeafen = useCallback(() => {
    if (!user || !channelRef.current) return;

    const newDeafenedState = !state.isDeafened;
    setState(prev => ({ ...prev, isDeafened: newDeafenedState }));

    // Store latest data in ref instead of passing directly
    latestPresenceDataRef.current = {
      userId: user.id,
      name: user.email?.split('@')[0] || 'User',
      isMuted: state.isMuted,
      isDeafened: newDeafenedState,
      isSpeaking: state.isSpeaking,
      handRaised: state.handRaised,
      joinedAt: new Date().toISOString()
    };
    
    debouncedPresenceUpdate();
  }, [user, state.isMuted, state.isDeafened, state.isSpeaking, state.handRaised, debouncedPresenceUpdate]);

  const toggleHandRaise = useCallback(() => {
    if (!user || !channelRef.current) return;

    const newHandRaisedState = !state.handRaised;
    setState(prev => ({ ...prev, handRaised: newHandRaisedState }));

    // Store latest data in ref instead of passing directly
    latestPresenceDataRef.current = {
      userId: user.id,
      name: user.email?.split('@')[0] || 'User',
      isMuted: state.isMuted,
      isDeafened: state.isDeafened,
      isSpeaking: state.isSpeaking,
      handRaised: newHandRaisedState,
      joinedAt: new Date().toISOString()
    };
    
    debouncedPresenceUpdate();
  }, [user, state.isMuted, state.isDeafened, state.isSpeaking, state.handRaised, debouncedPresenceUpdate]);

  // UI controls
  const toggleCollapse = useCallback(() => {
    setState(prev => ({ ...prev, isCollapsed: !prev.isCollapsed }));
  }, []);

  const toggleMinimize = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
  }, []);

  // State getters
  const getConnectionStatus = useCallback(() => ({
    isConnected: state.isConnected,
    participantCount: state.participantCount
  }), [state.isConnected, state.participantCount]);

  // ✅ SAFE - Cleanup refs pattern prevents infinite loops
  useEffect(() => {
    // Add cleanup functions to tracking
    addCleanup(() => {
      if (voiceChatRef.current) {
        voiceChatRef.current.disconnect();
        voiceChatRef.current = null;
      }
    });

    addCleanup(async () => {
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    });

    addCleanup(() => {
      currentGroupId.current = null;
      presenceUpdateInProgress.current = false;
      latestPresenceDataRef.current = null;
    });

    addCleanup(() => {
      // Reset state without triggering re-renders
      setState({
        isConnected: false,
        isConnecting: false,
        participants: [],
        participantCount: 0,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        messages: [],
        currentTranscript: '',
        isCollapsed: true,
        isMinimized: false,
      });
    });

    // Add comprehensive cleanup for all resources
    addCleanup(() => {
      // Close all WebSocket connections
      if (typeof window !== 'undefined' && (window as any).WebSocketPool) {
        try {
          (window as any).WebSocketPool.closeAllConnections();
        } catch (e) {
          // Silent error handling for production
        }
      }
      
      // Force close AudioContext if needed
      try {
        audioContextManager.forceClose();
      } catch (e) {
          // Silent error handling for production
      }
    });

    return () => {
      if (isCleaningUp.current) return; // Prevent multiple cleanup calls
      isCleaningUp.current = true;

      // Execute all cleanup functions without triggering re-renders
      cleanupFunctions.current.forEach(fn => {
        try { 
          fn(); 
        } catch (e) { 
          // Silent error handling for production
        }
      });
      
      // Clear cleanup tracking
      cleanupFunctions.current = [];
      isCleaningUp.current = false;
    };
  }, []); // ✅ No dependencies - prevents infinite loop

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<VoiceRoomContextType>(() => ({
    ...state,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute,
    toggleDeafen,
    toggleHandRaise,
    toggleCollapse,
    toggleMinimize,
    getConnectionStatus,
  }), [
    state,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute,
    toggleDeafen,
    toggleHandRaise,
    toggleCollapse,
    toggleMinimize,
    getConnectionStatus,
  ]);

  return (
    <VoiceRoomContext.Provider value={contextValue}>
      {children}
    </VoiceRoomContext.Provider>
  );
};
