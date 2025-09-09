import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Mic, 
  MicOff, 
  Headphones, 
  VolumeX, 
  Users, 
  MessageSquare, 
  X,
  ChevronDown,
  ChevronUp,
  Volume2,
  Hand,
  Share2,
  Settings,
  Phone,
  PhoneOff
} from 'lucide-react';
import { useVoiceRoom } from '@/contexts/VoiceRoomContext';
import { cn } from '@/lib/utils';

interface CollapsibleVoiceRoomProps {
  groupName: string;
}

export const CollapsibleVoiceRoom = ({ groupName }: CollapsibleVoiceRoomProps) => {
  const {
    isConnected,
    participants,
    participantCount,
    isMuted,
    isDeafened,
    isSpeaking,
    handRaised,
    messages,
    currentTranscript,
    isCollapsed,
    leaveVoiceRoom,
    toggleMute,
    toggleDeafen,
    toggleHandRaise,
    toggleCollapse,
  } = useVoiceRoom();

  const [showSettings, setShowSettings] = useState(false);

  // Don't render if not connected
  if (!isConnected) {
    return null;
  }

  const getParticipantInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSpeakingIndicator = (participant: any) => {
    if (participant.isMuted) {
      return <MicOff className="h-3 w-3 text-red-500" />;
    }
    if (participant.isDeafened) {
      return <VolumeX className="h-3 w-3 text-orange-500" />;
    }
    if (participant.isSpeaking) {
      return <div className="flex items-center gap-1">
        <Mic className="h-3 w-3 text-green-500" />
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>;
    }
    return <Mic className="h-3 w-3 text-gray-400" />;
  };

  const getParticipantStatus = (participant: any) => {
    if (participant.handRaised) {
      return <Hand className="h-3 w-3 text-yellow-500" />;
    }
    return getSpeakingIndicator(participant);
  };

  return (
    <Card className={cn(
      "fixed z-40 transition-all duration-300 shadow-xl border-2",
      // Mobile: bottom right
      "bottom-20 right-6",
      // Laptop: top right, below navigation
      "lg:top-20 lg:right-6 lg:bottom-auto",
      isCollapsed ? "w-80 h-16" : "w-96 h-[500px] lg:w-[400px] lg:h-[600px]",
      isConnected ? "border-green-500" : "border-gray-300"
    )}>
      <CardHeader className="pb-2 cursor-pointer" onClick={toggleCollapse}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-green-500" />
            Voice Room
            <Badge variant="secondary" className="text-xs">
              {groupName}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {participantCount}
            </Badge>
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Main Controls */}
          <div className="flex gap-2 mb-3">
            <Button
              variant={isMuted ? "destructive" : "default"}
              size="sm"
              onClick={toggleMute}
              className="flex-1"
            >
              {isMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
            
            <Button
              variant={isDeafened ? "destructive" : "outline"}
              size="sm"
              onClick={toggleDeafen}
              className="flex-1"
            >
              {isDeafened ? <VolumeX className="h-4 w-4 mr-2" /> : <Headphones className="h-4 w-4 mr-2" />}
              {isDeafened ? "Undeafen" : "Deafen"}
            </Button>
          </div>

          {/* Secondary Controls */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={handRaised ? "default" : "outline"}
              size="sm"
              onClick={toggleHandRaise}
              className={cn(
                "flex-1",
                handRaised && "bg-yellow-500 hover:bg-yellow-600 text-white"
              )}
            >
              <Hand className="h-4 w-4 mr-2" />
              {handRaised ? "Lower Hand" : "Raise Hand"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({participantCount})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {participants.map((participant) => (
                <div key={participant.userId} className={cn(
                  "flex items-center gap-2 p-2 rounded-lg transition-all duration-200",
                  participant.isSpeaking ? "bg-green-50 border border-green-200" : "bg-gray-50",
                  participant.handRaised && "bg-yellow-50 border border-yellow-200"
                )}>
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getParticipantInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                    {participant.isSpeaking && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className="text-sm font-medium flex-1 truncate">{participant.name}</span>
                  {getParticipantStatus(participant)}
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No other participants yet
                </p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Voice Messages
            </h4>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {messages.length > 0 ? (
                messages.slice(-5).map((message) => (
                  <div key={message.id} className="text-xs p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-700">
                      {message.type === 'user_speech' ? 'You' : 'AI'}
                    </div>
                    <div className="text-gray-600 truncate">{message.content}</div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">
                  No messages yet
                </p>
              )}
            </div>
          </div>

          {/* Current Transcript */}
          {currentTranscript && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Live Transcript</h4>
              <div className="p-2 bg-blue-50 rounded text-sm text-blue-800">
                {currentTranscript}
                {isSpeaking && (
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full ml-2 animate-pulse" />
                )}
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <h5 className="text-sm font-medium">Voice Settings</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Input Volume</span>
                  <div className="w-20 h-1 bg-gray-200 rounded-full">
                    <div className="w-3/4 h-full bg-blue-500 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Output Volume</span>
                  <div className="w-20 h-1 bg-gray-200 rounded-full">
                    <div className="w-4/5 h-full bg-green-500 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Echo Cancellation</span>
                  <div className="w-4 h-4 bg-green-500 rounded" />
                </div>
              </div>
            </div>
          )}

          {/* Leave Button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={leaveVoiceRoom}
            className="w-full"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            Leave Voice Room
          </Button>
        </CardContent>
      )}
    </Card>
  );
};
