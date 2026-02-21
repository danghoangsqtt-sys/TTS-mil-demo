
// This service simulates the interaction with the Python backend (Coqui TTS) 
// Strictly Offline Mode for Military Security compliance.

import { VoiceProfile } from '../types';

// Updated signature to accept multiple blobs
export const processVoiceCloning = async (
  name: string,
  samples: Blob[], 
  source: 'microphone' | 'upload' = 'microphone'
): Promise<Omit<VoiceProfile, 'id' | 'createdAt' | 'sampleBase64'> & { rawSampleBase64: string }> => {
  
  // 1. In a real scenario, we would zip these blobs or send them sequentially to the Python backend.
  // For this simulation, we take the largest blob (likely the longest recording) or just the first one
  // to represent the "primary" acoustic fingerprint for storage.
  
  console.log(`[LOCAL ENGINE] Received ${samples.length} emotional samples for: ${name}`);
  console.log(`[LOCAL ENGINE] Starting Multi-Speaker Embedding extraction...`);
  
  // Use the first sample (Neutral) as the preview audio
  const primarySample = samples[0];
  const base64Audio = await blobToBase64(primarySample);

  // 2. Mock Python Shell Execution (Local Engine)
  // Simulate heavy processing (Vector Embedding extraction & Prosody Alignment)
  // This is already "awaited" by the UI's progress bar animation.
  
  // Generating a Local System ID resembling a complex hash/filepath
  const timestamp = Date.now();
  const fileHash = Math.floor(Math.random() * 1000000).toString(16).toUpperCase();
  const localId = `SYS_VEC_${timestamp}_${fileHash}`;

  return {
    name,
    rawSampleBase64: base64Audio,
    status: 'ready',
    source: source,
    onlineVoiceId: localId 
  };
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
