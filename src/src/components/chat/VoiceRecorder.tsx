import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square, Play, Pause, Send, RotateCcw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEngagement } from '@/hooks/useEngagement';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export const VoiceRecorder = ({ onRecordingComplete, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const { trackActivity } = useEngagement();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
        setShowPreview(true);
        
        // Create audio element for preview
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsPlaying(false);
        
        cleanup();
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Check specific error types for better user feedback
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast({
            title: "Microphone Permission Denied",
            description: "Please allow microphone access in your browser settings to record voice messages.",
            variant: "destructive",
          });
        } else if (error.name === 'NotFoundError') {
          toast({
            title: "No Microphone Found",
            description: "No microphone detected. Please connect a microphone and try again.",
            variant: "destructive",
          });
        } else if (error.name === 'NotReadableError') {
          toast({
            title: "Microphone In Use",
            description: "Microphone is being used by another application. Please close other apps and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Recording Error",
            description: "Failed to access microphone. Please check your browser settings and try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Recording Error",
          description: "Failed to access microphone. Please check permissions.",
          variant: "destructive",
        });
      }
    }
  }, [onRecordingComplete, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);
    mediaRecorderRef.current = null;
  }, []);

  const playPreview = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  const sendRecording = useCallback(() => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob);
      resetRecording();
      
      // Track karma for voice note (will be tracked in GroupChat with group ID)
      // trackActivity('voice_note');
      
      toast({
        title: "Voice message sent!",
        description: "Your recording has been shared with the group.",
      });
    }
  }, [recordedBlob, onRecordingComplete, toast, trackActivity]);

  const redoRecording = useCallback(() => {
    resetRecording();
    startRecording();
  }, [startRecording]);

  const resetRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setRecordedBlob(null);
    setShowPreview(false);
    setIsPlaying(false);
    setRecordingTime(0);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show recording interface
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
        <div className="flex items-center gap-2 text-destructive">
          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
        </div>
        <Button
          onClick={stopRecording}
          size="sm"
          variant="destructive"
          className="h-8 w-8 p-0"
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Show preview interface
  if (showPreview && recordedBlob) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-2">
          <Button
            onClick={playPreview}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <span className="text-sm text-muted-foreground">
            {formatTime(recordingTime)} recording
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            onClick={sendRecording}
            size="sm"
            className="h-8 px-3 bg-primary hover:bg-primary/90"
          >
            <Send className="h-3 w-3 mr-1" />
            Send
          </Button>
          <Button
            onClick={redoRecording}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            onClick={resetRecording}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Show record button
  return (
    <Button
      onClick={startRecording}
      disabled={disabled}
      size="sm"
      variant="outline"
      className="h-10 w-10 p-0 rounded-full hover:bg-primary/10"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
};