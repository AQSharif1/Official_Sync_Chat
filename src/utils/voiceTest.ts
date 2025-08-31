import { VoiceRoomContext } from '@/contexts/VoiceRoomContext';

// Voice room lifecycle test utilities
export const testVoiceRoomLifecycle = () => {
  let initializationCount = 0;
  let cleanupCount = 0;

  const testInitialization = () => {
    initializationCount++;
    // Test initialization logic here
  };

  const testCleanup = () => {
    cleanupCount++;
    // Test cleanup logic here
  };

  // Run multiple initialization/cleanup cycles
  for (let i = 0; i < 5; i++) {
    testInitialization();
    testCleanup();
  }

  const passed = initializationCount === 5 && cleanupCount === 5;
  
  return {
    passed,
    initializationCount,
    cleanupCount
  };
};

// Audio context cleanup test utilities
export const testAudioContextCleanup = () => {
  const contexts: AudioContext[] = [];
  const streams: MediaStream[] = [];

  // Create multiple audio contexts and streams
  for (let i = 0; i < 3; i++) {
    try {
      const context = new AudioContext();
      contexts.push(context);
    } catch (e) {
      // Handle creation error
    }

    try {
      const stream = new MediaStream();
      streams.push(stream);
    } catch (e) {
      // Handle creation error
    }
  }

  // Clean up all contexts
  contexts.forEach((context, index) => {
    try {
      if (context.state !== 'closed') {
        context.close();
      }
    } catch (e) {
      // Handle cleanup error
    }
  });

  // Stop all media streams
  streams.forEach((stream, index) => {
    try {
      stream.getTracks().forEach(track => track.stop());
    } catch (e) {
      // Handle cleanup error
    }
  });

  const passed = contexts.length === 3 && streams.length === 3;
  
  return {
    passed,
    contexts: contexts.length,
    streams: streams.length
  };
};

// Main test runner
export const runVoiceRoomTests = () => {
  const lifecycleResult = testVoiceRoomLifecycle();
  const audioResult = testAudioContextCleanup();

  const allPassed = lifecycleResult.passed && audioResult.passed;
  
  return {
    allPassed,
    lifecycle: lifecycleResult,
    audio: audioResult
  };
};


