
export enum Region {
  NORTH = 'Bắc (Hà Nội)',
  CENTRAL = 'Trung (Huế/Đà Nẵng)',
  SOUTH = 'Nam (Sài Gòn)',
}

export enum Emotion {
  SERIOUS = 'Nghiêm túc (Chào cờ/Mệnh lệnh)',
  HAPPY = 'Vui tươi (Tin giải trí)',
  JOKING = 'Hài hước/Đùa giỡn',
  DEEP = 'Sâu lắng (Kể chuyện)',
  HEROIC = 'Hùng hồn (Chính trị)',
}

export enum Gender {
  MALE = 'Nam',
  FEMALE = 'Nữ',
  CLONED = 'Giọng Clone (Của tôi)'
}

export interface PauseConfig {
  period: number;
  comma: number;
  semicolon: number;
  newline: number;
}

export interface TTSConfig {
  text: string;
  gender: Gender | string; 
  voiceName?: string;
  region: Region;
  emotion: Emotion;
  speed: number;
  pitch: number;
  
  // AI / Ollama Parameters
  ollamaModel: string; // e.g., 'vinallama', 'llama3'
  useAiNormalization: boolean; // Use LLM to fix text before TTS
  
  stability: number; 
  clarity: number;   
  styleIntensity: number; 
  mode: 'online' | 'offline';
  clonedVoiceId?: string; 
  pauseConfig?: PauseConfig;
}

export interface HistoryLog {
  id: string;
  timestamp: number;
  rawText: string; 
  duration: number; 
  mode: 'online' | 'offline';
  configSummary: string;
  audioBlob?: string; 
}

export interface DashboardStats {
  totalChars: number;
  totalDuration: number;
  storageUsed: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  createdAt: number;
  sampleBase64: string; 
  onlineVoiceId?: string; 
  status: 'ready' | 'processing' | 'failed';
  source: 'microphone' | 'upload';
}

// --- NEW OLLAMA TYPES ---
export interface OllamaModelDetails {
  parent_model: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
}

export interface OllamaTagResponse {
  models: OllamaModel[];
}

// --- LIBRARY TYPES ---
export type ScriptCategory = 'POLITICS' | 'NEWS' | 'ORDERS' | 'STORY' | 'OTHER';

export interface LectureScript {
  id: string;
  title: string;
  content: string;
  category: ScriptCategory;
  lastModified: number;
  tags?: string[];
}
