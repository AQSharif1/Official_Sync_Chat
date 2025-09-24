// WebSocket Connection Pool to prevent multiple simultaneous connections
class WebSocketPool {
  private static connections = new Map<string, WebSocket>();
  
  static getConnection(url: string): WebSocket {
    if (!this.connections.has(url) || 
        this.connections.get(url)?.readyState !== WebSocket.OPEN) {
      // Close existing connection if it exists but is not open
      if (this.connections.has(url)) {
        this.connections.get(url)?.close();
      }
      
      const ws = new WebSocket(url);
      this.connections.set(url, ws);
      
      // Clean up connection when it closes
      ws.addEventListener('close', () => {
        this.connections.delete(url);
      });
      
      ws.addEventListener('error', () => {
        this.connections.delete(url);
      });
    }
    return this.connections.get(url)!;
  }
  
  static closeConnection(url: string): void {
    if (this.connections.has(url)) {
      this.connections.get(url)?.close();
      this.connections.delete(url);
    }
  }
  
  static closeAllConnections(): void {
    this.connections.forEach((ws, url) => {
      ws.close();
    });
    this.connections.clear();
  }
}

// Make WebSocketPool globally accessible for cleanup
if (typeof window !== 'undefined') {
  (window as any).WebSocketPool = WebSocketPool;
}

// Global Audio Context Manager for shared AudioContext instances
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

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private audioContextManager: AudioContextManager;

  constructor(private onAudioData: (audioData: Float32Array) => void) {
    this.audioContextManager = AudioContextManager.getInstance();
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Use shared AudioContext instead of creating new one
      this.audioContext = await this.audioContextManager.getContext();
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      
      // Configure analyser
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.source.connect(this.analyser);
      
      // Create data array for frequency data
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Start audio processing loop
      this.processAudio();
      
    } catch (error) {
      // Silent error handling for production
    }
  }

  private processAudio = () => {
    if (!this.analyser || !this.dataArray) return;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Convert to Float32Array for processing
    const floatArray = new Float32Array(this.dataArray.length);
    for (let i = 0; i < this.dataArray.length; i++) {
      floatArray[i] = (this.dataArray[i] - 128) / 128;
    }
    
    this.onAudioData(floatArray);
    
    // Continue processing
    this.animationFrameId = requestAnimationFrame(this.processAudio);
  };

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Release AudioContext through manager instead of closing directly
    if (this.audioContext) {
      this.audioContextManager.releaseContext();
      this.audioContext = null;
    }
    
    this.dataArray = null;
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext | null = null;
  private isDestroyed = false;
  private audioContextManager: AudioContextManager;

  constructor() {
    this.audioContextManager = AudioContextManager.getInstance();
  }

  async addToQueue(audioData: Uint8Array) {
    if (this.isDestroyed) return;
    
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0 || this.isDestroyed) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      // Get shared AudioContext if not already available
      if (!this.audioContext) {
        this.audioContext = await this.audioContextManager.getContext();
      }

      const wavData = this.createWavFromPCM(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(wavData.buffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        if (!this.isDestroyed) {
          this.playNext();
        }
      };
      source.start(0);
    } catch (error) {
      // Silent error handling for production
    }
  }

  private createWavFromPCM(pcmData: Uint8Array): Uint8Array {
    // Convert bytes to 16-bit samples
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
    // Create WAV header
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // WAV header parameters
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, int16Data.byteLength, true);

    // Combine header and PCM data
    const wavData = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavData.set(new Uint8Array(wavHeader), 0);
    wavData.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);

    return wavData;
  }

  destroy() {
    this.isDestroyed = true;
    this.queue.length = 0;
    this.isPlaying = false;
    
    // Release AudioContext through manager
    if (this.audioContext) {
      this.audioContextManager.releaseContext();
      this.audioContext = null;
    }
  }
}

let audioQueueInstance: AudioQueue | null = null;

export const playAudioData = async (audioContext: AudioContext, audioData: Uint8Array) => {
  if (!audioQueueInstance) {
    audioQueueInstance = new AudioQueue();
  }
  await audioQueueInstance.addToQueue(audioData);
};

export const destroyAudioQueue = () => {
  if (audioQueueInstance) {
    audioQueueInstance.destroy();
    audioQueueInstance = null;
  }
};

// RealtimeVoiceChat class removed - now using WebRTCVoiceChat for real voice functionality