import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Mic, MicOff, Users, Minimize2, Maximize2 } from 'lucide-react';
import { useVoiceRoom } from '@/contexts/VoiceRoomContext';
import { cn } from '@/lib/utils';

interface FloatingVoiceButtonProps {
  groupId: string;
  groupName: string;
}

export const FloatingVoiceButton = ({ groupId, groupName }: FloatingVoiceButtonProps) => {
  const {
    isConnected,
    isConnecting,
    participantCount,
    isMuted,
    isDeafened,
    isMinimized,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute,
    toggleMinimize,
  } = useVoiceRoom();

  const handleVoiceRoomToggle = async () => {
    if (isConnected) {
      await leaveVoiceRoom();
    } else {
      await joinVoiceRoom(groupId, groupName);
    }
  };

  const getStatusColor = () => {
    if (isConnecting) return 'bg-yellow-500';
    if (isConnected) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getIcon = () => {
    if (isMuted || isDeafened) return <MicOff className="h-4 w-4" />;
    return <Mic className="h-4 w-4" />;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end gap-2">
        {/* Voice Room Status */}
        {isConnected && (
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border">
            <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
            <span className="text-sm font-medium text-gray-700">
              {participantCount} in voice
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              {getIcon()}
            </Button>
          </div>
        )}

        {/* Main Voice Button */}
        <Button
          onClick={handleVoiceRoomToggle}
          disabled={isConnecting}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg border-2 transition-all duration-200",
            isConnected
              ? "bg-green-500 hover:bg-green-600 border-green-600"
              : "bg-blue-500 hover:bg-blue-600 border-blue-600",
            isConnecting && "opacity-50 cursor-not-allowed"
          )}
        >
          {isConnecting ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
          ) : isConnected ? (
            <Volume2 className="h-6 w-6 text-white" />
          ) : (
            <Mic className="h-6 w-6 text-white" />
          )}
        </Button>

        {/* Minimize/Maximize Button */}
        {isConnected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMinimize}
            className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border"
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
