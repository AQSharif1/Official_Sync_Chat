// WebRTC-based Voice Room Implementation
// This provides real-time voice communication similar to Discord/Houseparty

export interface VoiceRoomConfig {
  iceServers: RTCIceServer[];
  audioConstraints: MediaStreamConstraints;
}

export interface VoiceRoomParticipant {
  id: string;
  name: string;
  stream: MediaStream | null;
  connection: RTCPeerConnection | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
}

export class WebRTCVoiceRoom {
  private localStream: MediaStream | null = null;
  private participants: Map<string, VoiceRoomParticipant> = new Map();
  private config: VoiceRoomConfig;
  private onParticipantUpdate: (participants: VoiceRoomParticipant[]) => void;
  private onSpeakingUpdate: (participantId: string, isSpeaking: boolean) => void;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private speakingThreshold = 0.01;
  private speakingTimeout: NodeJS.Timeout | null = null;

  constructor(
    config: VoiceRoomConfig,
    onParticipantUpdate: (participants: VoiceRoomParticipant[]) => void,
    onSpeakingUpdate: (participantId: string, isSpeaking: boolean) => void
  ) {
    this.config = config;
    this.onParticipantUpdate = onParticipantUpdate;
    this.onSpeakingUpdate = onSpeakingUpdate;
  }

  async initialize(): Promise<void> {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });

      // Set up audio analysis for speaking detection
      await this.setupAudioAnalysis();

      console.log('WebRTC Voice Room initialized successfully');
    } catch (error) {
      console.error('Failed to initialize voice room:', error);
      throw error;
    }
  }

  private async setupAudioAnalysis(): Promise<void> {
    if (!this.localStream) return;

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.localStream);
    this.analyser = this.audioContext.createAnalyser();
    
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    
    source.connect(this.analyser);
    
    // Start speaking detection
    this.detectSpeaking();
  }

  private detectSpeaking(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    const checkSpeaking = () => {
      this.analyser!.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedVolume = average / 255;
      
      const isSpeaking = normalizedVolume > this.speakingThreshold;
      
      // Update speaking state
      this.onSpeakingUpdate('local', isSpeaking);
      
      // Continue monitoring
      requestAnimationFrame(checkSpeaking);
    };
    
    checkSpeaking();
  }

  async createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const connection = new RTCPeerConnection({
      iceServers: this.config.iceServers
    });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        connection.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming stream
    connection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.updateParticipantStream(participantId, remoteStream);
    };

    // Handle ICE candidates
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to remote peer
        this.sendIceCandidate(participantId, event.candidate);
      }
    };

    // Handle connection state changes
    connection.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantId}:`, connection.connectionState);
    };

    return connection;
  }

  async addParticipant(participantId: string, name: string): Promise<void> {
    const connection = await this.createPeerConnection(participantId);
    
    const participant: VoiceRoomParticipant = {
      id: participantId,
      name,
      stream: null,
      connection,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      handRaised: false
    };

    this.participants.set(participantId, participant);
    this.notifyParticipantUpdate();
  }

  async removeParticipant(participantId: string): Promise<void> {
    const participant = this.participants.get(participantId);
    if (participant) {
      if (participant.connection) {
        participant.connection.close();
      }
      if (participant.stream) {
        participant.stream.getTracks().forEach(track => track.stop());
      }
      this.participants.delete(participantId);
      this.notifyParticipantUpdate();
    }
  }

  private updateParticipantStream(participantId: string, stream: MediaStream): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.stream = stream;
      this.notifyParticipantUpdate();
    }
  }

  private notifyParticipantUpdate(): void {
    const participantsArray = Array.from(this.participants.values());
    this.onParticipantUpdate(participantsArray);
  }

  // Audio controls
  toggleMute(): boolean {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    const isCurrentlyMuted = audioTracks.every(track => !track.enabled);
    
    audioTracks.forEach(track => {
      track.enabled = isCurrentlyMuted;
    });

    return !isCurrentlyMuted;
  }

  toggleDeafen(): boolean {
    // Implementation for deafening (muting incoming audio)
    // This would typically involve muting all remote audio streams
    return false; // Placeholder
  }

  setSpeakingThreshold(threshold: number): void {
    this.speakingThreshold = threshold;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    for (const participant of this.participants.values()) {
      if (participant.connection) {
        participant.connection.close();
      }
      if (participant.stream) {
        participant.stream.getTracks().forEach(track => track.stop());
      }
    }
    this.participants.clear();

    // Close audio context
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // Clear speaking timeout
    if (this.speakingTimeout) {
      clearTimeout(this.speakingTimeout);
      this.speakingTimeout = null;
    }
  }

  // Getters
  getParticipants(): VoiceRoomParticipant[] {
    return Array.from(this.participants.values());
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  isInitialized(): boolean {
    return this.localStream !== null;
  }
}

// Default configuration
export const defaultVoiceRoomConfig: VoiceRoomConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  audioConstraints: {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1
    }
  }
};










