import { supabase } from '@/integrations/supabase/client';

interface VoiceParticipant {
  userId: string;
  name: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
  joinedAt: string;
  hasMicrophone: boolean;
}

interface WebRTCVoiceChatCallbacks {
  onParticipantJoined: (participant: VoiceParticipant) => void;
  onParticipantLeft: (userId: string) => void;
  onParticipantUpdated: (participant: VoiceParticipant) => void;
  onConnectionStateChange: (connected: boolean) => void;
  onError: (error: string) => void;
}

export class WebRTCVoiceChat {
  private groupId: string;
  private userId: string;
  private userName: string;
  private callbacks: WebRTCVoiceChatCallbacks;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private channel: any = null;
  private isConnected = false;
  private isMuted = false;
  private isDeafened = false;
  private handRaised = false;
  private participants: Map<string, VoiceParticipant> = new Map();

  // WebRTC configuration
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  constructor(
    groupId: string,
    userId: string,
    userName: string,
    callbacks: WebRTCVoiceChatCallbacks
  ) {
    this.groupId = groupId;
    this.userId = userId;
    this.userName = userName;
    this.callbacks = callbacks;
  }

  async connect(enableMicrophone: boolean = true): Promise<void> {
    try {
      console.log('🎤 Connecting to voice room...');

      // Get user media if microphone is enabled
      if (enableMicrophone) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
        });
        console.log('✅ Microphone access granted');
      }

      // Set up Supabase realtime channel for signaling
      this.channel = supabase.channel(`voice-${this.groupId}`, {
        config: {
          presence: { key: this.userId }
        }
      });

      // Set up signaling handlers
      this.setupSignalingHandlers();

      // Subscribe to channel
      await this.channel.subscribe();

      // Track presence
      await this.channel.track({
        user_id: this.userId,
        name: this.userName,
        isMuted: this.isMuted,
        isDeafened: this.isDeafened,
        isSpeaking: false,
        handRaised: this.handRaised,
        hasMicrophone: enableMicrophone,
        joinedAt: new Date().toISOString(),
      });

      this.isConnected = true;
      this.callbacks.onConnectionStateChange(true);
      console.log('✅ Connected to voice room');

    } catch (error) {
      console.error('❌ Failed to connect to voice room:', error);
      this.callbacks.onError(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private setupSignalingHandlers(): void {
    // Handle presence updates
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel.presenceState();
      this.updateParticipants(state);
    });

    this.channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      newPresences.forEach((presence: any) => {
        if (presence.user_id !== this.userId) {
          this.handleParticipantJoined(presence);
        }
      });
    });

    this.channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      leftPresences.forEach((presence: any) => {
        this.handleParticipantLeft(presence.user_id);
      });
    });

    // Handle WebRTC signaling
    this.channel.on('broadcast', { event: 'offer' }, async (payload) => {
      if (payload.user_id !== this.userId && payload.target_user_id === this.userId) {
        await this.handleOffer(payload);
      }
    });

    this.channel.on('broadcast', { event: 'answer' }, async (payload) => {
      if (payload.user_id !== this.userId && payload.target_user_id === this.userId) {
        await this.handleAnswer(payload);
      }
    });

    this.channel.on('broadcast', { event: 'ice-candidate' }, async (payload) => {
      if (payload.user_id !== this.userId && payload.target_user_id === this.userId) {
        await this.handleIceCandidate(payload);
      }
    });

    this.channel.on('broadcast', { event: 'participant-update' }, (payload) => {
      if (payload.user_id !== this.userId) {
        this.handleParticipantUpdate(payload);
      }
    });
  }

  private updateParticipants(state: any): void {
    Object.values(state).forEach((presences: any) => {
      presences.forEach((presence: any) => {
        if (presence.user_id !== this.userId) {
          const participant: VoiceParticipant = {
            userId: presence.user_id,
            name: presence.name || 'Unknown User',
            isMuted: presence.isMuted || false,
            isDeafened: presence.isDeafened || false,
            isSpeaking: presence.isSpeaking || false,
            handRaised: presence.handRaised || false,
            joinedAt: presence.joinedAt || new Date().toISOString(),
            hasMicrophone: presence.hasMicrophone !== false,
          };
          this.participants.set(participant.userId, participant);
          this.callbacks.onParticipantJoined(participant);
        }
      });
    });
  }

  private async handleParticipantJoined(presence: any): Promise<void> {
    const participant: VoiceParticipant = {
      userId: presence.user_id,
      name: presence.name || 'Unknown User',
      isMuted: presence.isMuted || false,
      isDeafened: presence.isDeafened || false,
      isSpeaking: presence.isSpeaking || false,
      handRaised: presence.handRaised || false,
      joinedAt: presence.joinedAt || new Date().toISOString(),
      hasMicrophone: presence.hasMicrophone !== false,
    };

    this.participants.set(participant.userId, participant);
    this.callbacks.onParticipantJoined(participant);

    // Create peer connection for this participant
    if (this.localStream) {
      await this.createPeerConnection(participant.userId);
    }
  }

  private handleParticipantLeft(userId: string): void {
    this.participants.delete(userId);
    this.closePeerConnection(userId);
    this.callbacks.onParticipantLeft(userId);
  }

  private handleParticipantUpdate(payload: any): void {
    const participant = this.participants.get(payload.user_id);
    if (participant) {
      const updatedParticipant = {
        ...participant,
        isMuted: payload.isMuted,
        isDeafened: payload.isDeafened,
        isSpeaking: payload.isSpeaking,
        handRaised: payload.handRaised,
      };
      this.participants.set(payload.user_id, updatedParticipant);
      this.callbacks.onParticipantUpdated(updatedParticipant);
    }
  }

  private async createPeerConnection(userId: string): Promise<void> {
    const peerConnection = new RTCPeerConnection(this.rtcConfig);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      this.setupRemoteAudio(userId, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            user_id: this.userId,
            target_user_id: userId,
            candidate: event.candidate,
          },
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        console.warn(`Connection failed with ${userId}, attempting to reconnect...`);
        // Clean up failed connection
        this.closePeerConnection(userId);
        // Attempt to recreate connection after a delay
        setTimeout(() => {
          if (this.participants.has(userId)) {
            this.createPeerConnection(userId);
          }
        }, 2000);
      }
    };

    this.peerConnections.set(userId, peerConnection);

    // Create offer
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      this.channel.send({
        type: 'broadcast',
        event: 'offer',
        payload: {
          user_id: this.userId,
          target_user_id: userId,
          offer: offer,
        },
      });
    } catch (error) {
      console.error(`Failed to create offer for ${userId}:`, error);
      this.closePeerConnection(userId);
    }
  }

  private async handleOffer(payload: any): Promise<void> {
    // Check if peer connection already exists
    if (this.peerConnections.has(payload.user_id)) {
      console.log(`Peer connection already exists for ${payload.user_id}`);
      return;
    }

    const peerConnection = new RTCPeerConnection(this.rtcConfig);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      this.setupRemoteAudio(payload.user_id, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            user_id: this.userId,
            target_user_id: payload.user_id,
            candidate: event.candidate,
          },
        });
      }
    };

    this.peerConnections.set(payload.user_id, peerConnection);

    try {
      await peerConnection.setRemoteDescription(payload.offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.channel.send({
        type: 'broadcast',
        event: 'answer',
        payload: {
          user_id: this.userId,
          target_user_id: payload.user_id,
          answer: answer,
        },
      });
    } catch (error) {
      console.error(`Failed to handle offer from ${payload.user_id}:`, error);
      this.closePeerConnection(payload.user_id);
    }
  }

  private async handleAnswer(payload: any): Promise<void> {
    const peerConnection = this.peerConnections.get(payload.user_id);
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(payload.answer);
      } catch (error) {
        console.error(`Failed to handle answer from ${payload.user_id}:`, error);
        this.closePeerConnection(payload.user_id);
      }
    }
  }

  private async handleIceCandidate(payload: any): Promise<void> {
    const peerConnection = this.peerConnections.get(payload.user_id);
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(payload.candidate);
      } catch (error) {
        console.error(`Failed to handle ICE candidate from ${payload.user_id}:`, error);
        // Don't close connection for ICE candidate errors, they're often non-fatal
      }
    }
  }

  private setupRemoteAudio(userId: string, stream: MediaStream): void {
    const audioElement = document.createElement('audio');
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    audioElement.volume = this.isDeafened ? 0 : 1;
    audioElement.style.display = 'none';
    document.body.appendChild(audioElement);

    this.audioElements.set(userId, audioElement);
  }

  private closePeerConnection(userId: string): void {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }

    const audioElement = this.audioElements.get(userId);
    if (audioElement) {
      audioElement.remove();
      this.audioElements.delete(userId);
    }
  }

  // Public methods for voice room controls
  toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    this.broadcastParticipantUpdate();
  }

  toggleDeafen(): void {
    this.isDeafened = !this.isDeafened;
    this.audioElements.forEach(audio => {
      audio.volume = this.isDeafened ? 0 : 1;
    });
    this.broadcastParticipantUpdate();
  }

  toggleHandRaise(): void {
    this.handRaised = !this.handRaised;
    this.broadcastParticipantUpdate();
  }

  private broadcastParticipantUpdate(): void {
    this.channel.send({
      type: 'broadcast',
      event: 'participant-update',
      payload: {
        user_id: this.userId,
        isMuted: this.isMuted,
        isDeafened: this.isDeafened,
        isSpeaking: false, // This would be detected by audio level
        handRaised: this.handRaised,
      },
    });
  }

  getParticipants(): VoiceParticipant[] {
    return Array.from(this.participants.values());
  }

  getParticipantCount(): number {
    return this.participants.size;
  }

  isConnectedToVoiceRoom(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from voice room...');

    // Close all peer connections
    this.peerConnections.forEach((_, userId) => {
      this.closePeerConnection(userId);
    });

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Leave channel
    if (this.channel) {
      await this.channel.untrack();
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.isConnected = false;
    this.participants.clear();
    this.callbacks.onConnectionStateChange(false);
    console.log('✅ Disconnected from voice room');
  }
}
