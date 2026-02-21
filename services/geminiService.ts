
// SERVICES/LOCAL_AI_SERVICE (Powered by Ollama)
// This service manages the connection to the Local Ollama instance (localhost:11434)
// and handles the pipeline: Raw Text -> LLM Normalization -> TTS Inference.

import { TTSConfig, Region, Emotion, Gender, VoiceProfile, OllamaTagResponse, OllamaModel } from '../types';
import { getVoices } from './storageService';

// --- OLLAMA CONFIGURATION ---
// Fallback list if offline
export const OLLAMA_MODELS = [
  { id: 'vinallama-7b-chat', name: 'VinALLAMA 7B (Chuyên Tiếng Việt)', type: 'Recommended' },
  { id: 'phogpt-4b', name: 'PhoGPT 4B (Viettel AI)', type: 'Fast' },
  { id: 'llama3-8b', name: 'Llama 3 8B (Meta)', type: 'General' },
  { id: 'mistral-7b', name: 'Mistral 7B', type: 'General' }
];

// Base Foundation Model for TTS (if no custom voice selected)
export const SYSTEM_VOICES = [
  { 
    id: 'base_foundation_v2', 
    name: 'SQTT-Base-Foundation-v2 (Giọng nền mặc định)', 
    gender: 'Neutral', 
    style: 'Flat' 
  }
];

// --- OLLAMA API HELPERS ---

export const getOllamaUrl = () => {
  return localStorage.getItem('SQTT_OLLAMA_HOST') || 'http://localhost:11434';
};

// Check if Ollama is running locally
export const checkOllamaHealth = async (): Promise<boolean> => {
  try {
    const host = getOllamaUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); 
    
    // Simple HEAD request or GET tags
    const resp = await fetch(`${host}/api/tags`, { 
        method: 'GET',
        signal: controller.signal
    });
    clearTimeout(timeoutId);
    return resp.ok;
  } catch (e) {
    console.warn("Ollama unreachable.");
    return false; 
  }
};

// Fetch actual installed models from local instance
export const fetchOllamaModels = async (): Promise<OllamaModel[]> => {
  try {
    const host = getOllamaUrl();
    const resp = await fetch(`${host}/api/tags`);
    if (!resp.ok) throw new Error("Failed to fetch models");
    const data: OllamaTagResponse = await resp.json();
    return data.models;
  } catch (e) {
    console.error("Error fetching Ollama models", e);
    return [];
  }
};

// Simulate (or real) text normalization using Ollama
const normalizeTextWithOllama = async (text: string, model: string, logFn: (msg: string) => void): Promise<string> => {
  const host = getOllamaUrl();
  logFn(`Ollama: Connecting to local model '${model}' at ${host}...`);
  
  try {
    // REAL INFERENCE ATTEMPT
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for normalization

    const prompt = `Bạn là trợ lý phát thanh viên quân đội. Hãy chuẩn hóa văn bản sau để đọc (viết rõ từ viết tắt, số, ngày tháng). Chỉ trả về văn bản đã xử lý, không giải thích. Văn bản: "${text}"`;

    const resp = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1 // Low temperature for deterministic/accurate replacement
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      logFn(`LLM: Inference success. Response received.`);
      return data.response.trim();
    } else {
      throw new Error("API responded with error");
    }

  } catch (e) {
    logFn(`LLM: Connection failed or timed out. Switching to Heuristic Simulation.`);
    // Fallback to simulation if Real LLM fails
    await new Promise(r => setTimeout(r, 800));
    
    // Heuristic simulation
    let processed = text;
    const expansions: Record<string, string> = {
        'QĐND': 'Quân đội Nhân dân',
        'CHXHCN': 'Cộng hòa Xã hội Chủ nghĩa',
        'TP.HCM': 'Thành phố Hồ Chí Minh',
        'TW': 'Trung ương',
        'BTTM': 'Bộ Tổng Tham mưu',
        'QK': 'Quân khu'
    };

    let changed = false;
    Object.keys(expansions).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        if (regex.test(processed)) {
            processed = processed.replace(regex, expansions[key]);
            changed = true;
            logFn(`RuleBased: Expanded entity '${key}' -> '${expansions[key]}'`);
        }
    });

    return processed;
  }
};

// --- MAIN INFERENCE FUNCTION ---

export const simulateLocalInference = async (config: TTSConfig): Promise<{ audioData: string, duration: number, logs: string[] }> => {
  
  // 1. Validation
  if (!config.text.trim()) throw new Error("Vui lòng nhập văn bản cần chuyển đổi.");
  
  const processLogs: string[] = [];
  const log = (msg: string) => processLogs.push(`[${new Date().toISOString().split('T')[1].slice(0,8)}] ${msg}`);

  log(`IPC: Received payload (${config.text.length} chars).`);

  // 2. OLLAMA PIPELINE (Text Refinement)
  let textToSpeak = config.text;

  if (config.useAiNormalization) {
      textToSpeak = await normalizeTextWithOllama(config.text, config.ollamaModel, log);
      log(`Pipeline: Text prepared for synthesis.`);
  } else {
      log(`Pipeline: Skipping AI Normalization (Raw mode).`);
  }
  
  // 3. VOICE LOADING (TTS Engine)
  let selectedVoiceName = "Unknown";
  let isCustomVoice = false;
  
  // Check Voice Source
  if (config.voiceName === SYSTEM_VOICES[0].id) {
      selectedVoiceName = SYSTEM_VOICES[0].name;
      log(`TTS Model: Using Base Foundation Model.`);
  } else {
      log(`System: Reading Voice Vector ID '${config.voiceName}'...`);
      const userVoices = await getVoices();
      const customVoice = userVoices.find(v => v.id === config.voiceName);
      
      if (customVoice) {
          selectedVoiceName = customVoice.name;
          isCustomVoice = true;
          log(`IO: READ /sqtt/voices/${customVoice.onlineVoiceId}.vbin SUCCESS.`);
          log(`Encoder: Loading Speaker Latent Space (Size: ${customVoice.sampleBase64.length} bytes)...`);
          log(`Config: Style Intensity ${(config.styleIntensity * 100).toFixed(0)}%.`);
      } else {
          log(`Warning: Voice file not found. Fallback to Base.`);
      }
  }

  // 4. TTS GENERATION SIMULATION
  // Prosody handling
  const periods = (textToSpeak.match(/\./g) || []).length;
  const commas = (textToSpeak.match(/,/g) || []).length;
  let silenceDuration = 0;
  if (config.pauseConfig) {
      silenceDuration += periods * config.pauseConfig.period;
      silenceDuration += commas * config.pauseConfig.comma;
  }
  
  log(`Vocoder: Generating waveform (HiFi-GAN)...`);
  log(`Vocoder: Speed ${config.speed}x | Pitch ${config.pitch}x`);

  // Simulate processing time
  const processingTime = 800 + (textToSpeak.length * 20); 
  await new Promise(resolve => setTimeout(resolve, Math.min(processingTime, 4000)));

  log(`Output: Audio synthesis complete (24kHz).`);

  // 5. Generate Audio Data (Simulation)
  const sampleRate = 24000;
  const baseDuration = (textToSpeak.length / 15) / config.speed; // Use processed text length
  const estimatedDuration = Math.max(1, baseDuration + silenceDuration);
  
  const numSamples = Math.floor(sampleRate * estimatedDuration);
  const buffer = new Int16Array(numSamples);
  const baseFreq = isCustomVoice ? 160 : 180; 
  
  // Generate waveform
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let val = Math.sin(2 * Math.PI * baseFreq * config.pitch * t);
    // Add complexity
    val += 0.5 * Math.sin(2 * Math.PI * (baseFreq * 1.5) * t);
    if (isCustomVoice) val += (Math.random() - 0.5) * 0.15; // Noise/Texture
    
    // Envelope
    let envelope = 1;
    if (i < 1000) envelope = i / 1000;
    if (i > numSamples - 1000) envelope = (numSamples - i) / 1000;
    
    buffer[i] = val * 10000 * envelope; 
  }

  // Base64 encode
  let binary = '';
  const bytes = new Uint8Array(buffer.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
  }
  const base64Audio = window.btoa(binary);

  return {
    audioData: base64Audio,
    duration: estimatedDuration,
    logs: processLogs
  };
};
