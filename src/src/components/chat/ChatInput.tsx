import React, { useRef, useState, useEffect } from "react";
import { useVoiceRoom } from '@/contexts/VoiceRoomContext';
import { useToast } from '@/hooks/use-toast';
import { validateChatMessage } from '@/lib/security';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { VoiceRecorder } from './VoiceRecorder';
import { GiphyPicker } from './GiphyPicker';

// Lightweight inline SVG icons (no external deps)

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

// Menu entry iconography
const GamepadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
    <rect x="3" y="9" width="18" height="8" rx="4" />
    <path d="M8 13h-3M6.5 11.5v3" />
    <circle cx="16.5" cy="12.5" r="1" />
    <circle cx="18.5" cy="14.5" r="1" />
  </svg>
);

const HeadsetIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
    <path d="M4 13a8 8 0 1 1 16 0v5a2 2 0 0 1-2 2h-1v-7h3M4 20h1a2 2 0 0 0 2-2v-5H4" />
  </svg>
);

interface ChatInputProps {
  onSendMessage: (message: string, type: 'text') => Promise<boolean>;
  onSendGif: (gifUrl: string) => Promise<boolean>;
  onSendVoice: (audioBlob: Blob) => Promise<boolean>;
  onToolSelect: (tool: string) => void;
  disabled?: boolean;
  loading?: boolean;
  groupId?: string;
  groupName?: string;
}

export const ChatInput = ({ 
  onSendMessage, 
  onSendGif, 
  onSendVoice, 
  onToolSelect, 
  disabled, 
  loading, 
  groupId, 
  groupName 
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMicrophoneOptions, setShowMicrophoneOptions] = useState(false);
  const { toast } = useToast();
  const { joinVoiceRoom, leaveVoiceRoom, isConnected } = useVoiceRoom();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const microphoneOptionsRef = useRef<HTMLDivElement>(null);

  // autosize textarea
  useEffect(() => {
    if (!areaRef.current) return;
    areaRef.current.style.height = "0px";
    areaRef.current.style.height = Math.min(areaRef.current.scrollHeight, 160) + "px";
  }, [message]);

  // Close microphone options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (microphoneOptionsRef.current && !microphoneOptionsRef.current.contains(event.target as Node)) {
        setShowMicrophoneOptions(false);
      }
    };

    if (showMicrophoneOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMicrophoneOptions]);

  const handleSendText = async () => {
    if (message.trim() && !sendingMessage) {
      // Validate and sanitize the message
      const validation = validateChatMessage(message);
      
      if (!validation.isValid) {
        toast({
          title: "Invalid Message",
          description: validation.error || "Message contains invalid content",
          variant: "destructive",
        });
        return;
      }
      
      setSendingMessage(true);
      const success = await onSendMessage(validation.sanitizedMessage, 'text');
      if (success) {
        setMessage('');
      }
      setSendingMessage(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleStartVoiceRoom = () => {
    if (groupId && groupName) {
      if (isConnected) {
        leaveVoiceRoom();
      } else {
        setShowMicrophoneOptions(true);
      }
    }
  };

  const handleStartGame = (gameType: string) => {
    onToolSelect(gameType);
  };

  return (
    <div className="w-full px-3 py-2">
      <div className="flex items-end gap-2 rounded-full bg-zinc-800/70 backdrop-blur px-3 py-2 ring-1 ring-zinc-700 shadow-lg">
        {/* text area */}
        <textarea
          ref={areaRef}
          value={message}
          disabled={disabled || sendingMessage}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          className="flex-1 resize-none bg-transparent text-zinc-100 placeholder:text-zinc-400 outline-none leading-6 max-h-40 min-h-[40px] py-2"
          aria-label="Message input"
        />

        {/* mic for voice notes - directly triggers voice recording */}
        <div className="relative">
          <VoiceRecorder 
            onRecordingComplete={onSendVoice} 
            disabled={disabled || sendingMessage}
          />
        </div>

        {/* GIF picker */}
        <div className="relative">
          <GiphyPicker onGifSelect={onSendGif} disabled={disabled || sendingMessage} />
        </div>

        {/* plus menu: Game + Voice Room */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((s) => !s)}
            className="p-2 rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-expanded={showMenu}
            aria-haspopup="menu"
            aria-label="Open actions"
          >
            <PlusIcon className="h-7 w-7" />
          </button>

          {showMenu && (
            <div className="absolute right-0 bottom-12 min-w-[220px] rounded-xl bg-zinc-900/95 backdrop-blur border border-zinc-700 shadow-xl p-1 z-50">
              <MenuItem 
                icon={<GamepadIcon className="h-5 w-5" />} 
                label="Start a Game" 
                onClick={() => { 
                  setShowMenu(false); 
                  // Show game picker
                  onToolSelect('game');
                }} 
              />
              {groupId && groupName && (
                <MenuItem 
                  icon={<HeadsetIcon className="h-5 w-5" />} 
                  label={isConnected ? "Leave Voice Room" : "Start Voice Room"} 
                  onClick={() => { 
                    setShowMenu(false); 
                    handleStartVoiceRoom();
                  }} 
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Microphone Options Modal for Voice Room */}
      {showMicrophoneOptions && (
        <div ref={microphoneOptionsRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl shadow-xl p-6 min-w-[300px]">
            <div className="space-y-4">
              <div className="text-lg font-medium text-zinc-100 text-center">
                Join Voice Room
              </div>
              <div className="text-sm text-zinc-400 text-center mb-4">
                Choose your microphone preference
              </div>
              
              <button
                onClick={async () => {
                  setShowMicrophoneOptions(false);
                  await joinVoiceRoom(groupId!, groupName!, true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-800 text-zinc-100 focus:outline-none border border-zinc-700"
              >
                <HeadsetIcon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">With Microphone</div>
                  <div className="text-xs text-zinc-400">Speak and listen</div>
                </div>
              </button>
              
              <button
                onClick={async () => {
                  setShowMicrophoneOptions(false);
                  await joinVoiceRoom(groupId!, groupName!, false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-800 text-zinc-100 focus:outline-none border border-zinc-700"
              >
                <HeadsetIcon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Listen Only</div>
                  <div className="text-xs text-zinc-400">Hear others but can't speak</div>
                </div>
              </button>
              
              <button
                onClick={() => setShowMicrophoneOptions(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-800 text-zinc-500 focus:outline-none"
              >
                <span className="text-sm">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hint row */}
      <div className="px-2 pt-1 text-[11px] text-zinc-400 select-none">
        Press <kbd className="px-1 py-0.5 rounded bg-zinc-700/60">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-zinc-700/60">Shift</kbd>+<kbd className="px-1 py-0.5 rounded bg-zinc-700/60">Enter</kbd> for a new line
      </div>
    </div>
  );
};

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 text-zinc-100 focus:outline-none">
      <span className="shrink-0 text-zinc-200">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}