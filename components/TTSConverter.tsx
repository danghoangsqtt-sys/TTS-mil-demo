
import React, { useState, useRef, useEffect } from 'react';
import { 
  TTSConfig, 
  Region, 
  Emotion, 
  Gender, 
  VoiceProfile, 
  PauseConfig
} from '../types';
import { SYSTEM_VOICES, OLLAMA_MODELS, simulateLocalInference, checkOllamaHealth } from '../services/geminiService';
import { saveLog, getVoices } from '../services/storageService';
import { 
  PlayIcon, 
  StopIcon,
  BoltIcon, 
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  ServerStackIcon,
  CpuChipIcon,
  CheckCircleIcon,
  CommandLineIcon,
  MusicalNoteIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  FolderIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

const DEFAULT_PAUSE_CONFIG: PauseConfig = {
  period: 0.5,
  comma: 0.2,
  semicolon: 0.3,
  newline: 0.8
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const addWavHeader = (samples: Int16Array, sampleRate: number = 24000) => {
  const buffer = new ArrayBuffer(44 + samples.byteLength);
  const view = new DataView(buffer);
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); 
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); 
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true); 
  writeString(view, 36, 'data');
  view.setUint32(40, samples.byteLength, true);
  const dataView = new Uint8Array(buffer, 44);
  dataView.set(new Uint8Array(samples.buffer));
  return buffer;
};

interface TTSConverterProps {
  onConversionComplete: () => void;
  externalText?: string;
}

const TTSConverter: React.FC<TTSConverterProps> = ({ onConversionComplete, externalText }) => {
  const [config, setConfig] = useState<TTSConfig>({
    text: '',
    gender: Gender.FEMALE,
    voiceName: '', 
    region: Region.NORTH,
    emotion: Emotion.SERIOUS,
    speed: 1.0,
    pitch: 1.0,
    ollamaModel: OLLAMA_MODELS[0].id,
    useAiNormalization: true,
    stability: 0.5, 
    clarity: 0.75, 
    styleIntensity: 0.5, 
    mode: 'offline', 
    pauseConfig: DEFAULT_PAUSE_CONFIG
  });

  const [userVoices, setUserVoices] = useState<VoiceProfile[]>([]);
  const [draftPauseConfig, setDraftPauseConfig] = useState<PauseConfig>(DEFAULT_PAUSE_CONFIG);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(null); 
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [vramUsage, setVramUsage] = useState(0);
  const [isOllamaConnected, setIsOllamaConnected] = useState<boolean | null>(null);
  const [highlightInput, setHighlightInput] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (externalText) {
      setConfig(prev => ({ ...prev, text: externalText }));
      setHighlightInput(true);
      const timer = setTimeout(() => setHighlightInput(false), 2000); // Visual cue duration
      return () => clearTimeout(timer);
    }
  }, [externalText]);

  useEffect(() => {
    loadVoices();
    const loadHealth = async () => {
      const health = await checkOllamaHealth();
      setIsOllamaConnected(health);
    };
    loadHealth();
  }, []);

  const loadVoices = async () => {
    const v = await getVoices();
    setUserVoices(v);
    // If current selected voice is not valid anymore, reset
    if (!v.find(voice => voice.id === config.voiceName) && config.voiceName !== SYSTEM_VOICES[0].id && v.length > 0) {
       // Keep default if already set, otherwise switch to first custom
       if (!config.voiceName) setConfig(prev => ({ ...prev, voiceName: v[0].id }));
    }
    // If no voice selected at all, pick base
    if (!config.voiceName) {
       setConfig(prev => ({ ...prev, voiceName: SYSTEM_VOICES[0].id }));
    }
  };

  useEffect(() => {
    const vramInterval = setInterval(() => {
       setVramUsage(prev => {
          const target = isLoading ? 5500 : 2100; 
          const change = Math.random() * 200 - 100;
          let next = prev + change;
          if (next < target - 500) next += 100;
          if (next > target + 500) next -= 100;
          return Math.max(1024, Math.min(8192, next));
       });
    }, 1000);
    return () => clearInterval(vramInterval);
  }, [isLoading]);

  const currentVoiceDetails = userVoices.find(v => v.id === config.voiceName);
  const isCustomVoice = !!currentVoiceDetails;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'speed' || name === 'pitch' || name === 'stability' || name === 'clarity' || name === 'styleIntensity') ? parseFloat(value) : value
    }));
  };

  const applyPreset = (type: 'news' | 'urgent' | 'story') => {
    switch (type) {
      case 'news':
        setConfig(prev => ({ ...prev, speed: 1.1, pitch: 1.0, stability: 0.8, clarity: 0.9, styleIntensity: 0.3, emotion: Emotion.HAPPY }));
        break;
      case 'urgent':
        setConfig(prev => ({ ...prev, speed: 1.25, pitch: 1.05, stability: 0.9, clarity: 1.0, styleIntensity: 0.1, emotion: Emotion.SERIOUS }));
        break;
      case 'story':
        setConfig(prev => ({ ...prev, speed: 0.85, pitch: 0.95, stability: 0.4, clarity: 0.7, styleIntensity: 0.8, emotion: Emotion.DEEP }));
        break;
    }
  };

  const openPauseModal = () => {
    setDraftPauseConfig(config.pauseConfig || DEFAULT_PAUSE_CONFIG);
    setShowPauseModal(true);
  };

  const savePauseConfig = () => {
    setConfig(prev => ({ ...prev, pauseConfig: draftPauseConfig }));
    setShowPauseModal(false);
  };

  const updateDraftPause = (key: keyof PauseConfig, value: number) => {
    setDraftPauseConfig(prev => ({
      ...prev,
      [key]: parseFloat(value.toFixed(2))
    }));
  };

  const applyPausePreset = (type: 'default' | 'fast' | 'slow') => {
    if (type === 'default') setDraftPauseConfig(DEFAULT_PAUSE_CONFIG);
    if (type === 'fast') setDraftPauseConfig({ period: 0.3, comma: 0.1, semicolon: 0.2, newline: 0.5 });
    if (type === 'slow') setDraftPauseConfig({ period: 0.8, comma: 0.4, semicolon: 0.5, newline: 1.2 });
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const playAudio = async () => {
    if (!audioData) return;
    if (isPlaying) {
      stopAudio();
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      const rawBase64 = audioData.includes(',') ? audioData.split(',')[1] : audioData;
      const arrayBuffer = base64ToArrayBuffer(rawBase64);
      const int16 = new Int16Array(arrayBuffer);
      const float32 = new Float32Array(int16.length);
      for(let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }
      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      sourceRef.current = source;
      analyserRef.current = analyser;
      
      source.onended = () => {
        setIsPlaying(false);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
      
      source.start();
      setIsPlaying(true);
      drawVisualizer();
    } catch (e) {
      console.error("Playback error", e);
      setIsPlaying(false);
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isPlaying) return;
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5; // Slightly wider bars
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Gradient for visualizer bars
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#059669'); // Emerald 600
        gradient.addColorStop(0.5, '#34D399'); // Emerald 400
        gradient.addColorStop(1, '#A7F3D0'); // Emerald 200

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const handleDownload = () => {
    if (!audioData) return;
    const rawBase64 = audioData.includes(',') ? audioData.split(',')[1] : audioData;
    const arrayBuffer = base64ToArrayBuffer(rawBase64);
    const int16 = new Int16Array(arrayBuffer);
    const wavBuffer = addWavHeader(int16, 24000);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SQTT_Offline_${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.text.trim()) return;

    setIsLoading(true);
    setLogs([]);
    setErrorMsg(null);
    stopAudio();
    setAudioData(null);

    try {
       const result = await simulateLocalInference(config);
       setAudioData(result.audioData);
       setLogs(result.logs);
       await saveLog({
         rawText: config.text,
         duration: result.duration,
         mode: 'offline',
         configSummary: `${config.ollamaModel} > ${config.voiceName}`,
         audioBlob: result.audioData
       });
       onConversionComplete();
    } catch (err: any) {
       setErrorMsg(err.message);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Status Bar - Professional Clean */}
      <div className="bg-white px-5 py-3 rounded-2xl border border-white/20 flex justify-between items-center shadow-lg shadow-black/5">
         <div className="flex gap-6">
            <span className="flex items-center gap-2 text-xs font-bold text-gray-700 tracking-wide">
               <ServerStackIcon className="h-4 w-4 text-[#0B6E4F]"/> 
               ENGINE: <span className="text-gray-900">OLLAMA_BRIDGE_V1</span>
            </span>
            <span className="flex items-center gap-2 text-xs font-bold text-gray-500 tracking-wide border-l border-gray-200 pl-6">
               <CpuChipIcon className="h-4 w-4 text-purple-600"/> 
               VRAM: <span className="text-gray-900 font-mono">{(vramUsage / 1024).toFixed(2)} GB</span>
            </span>
         </div>
         <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Host</span>
                <div className="flex items-center gap-1.5">
                   <div className={`h-2 w-2 rounded-full shadow-sm ${isOllamaConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                   <span className={`text-[10px] font-bold ${isOllamaConnected ? 'text-emerald-700' : 'text-red-600'}`}>
                     {isOllamaConnected ? 'CONNECTED' : 'OFFLINE'}
                   </span>
                </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold bg-black text-white px-3 py-1 rounded-lg">
                <span className="text-gray-400">STATUS:</span>
                {isLoading ? <span className="text-amber-400 animate-pulse">PROCESSING</span> : <span className="text-white">IDLE</span>}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
        {/* LEFT PANEL: INPUT */}
        <div className="lg:col-span-7 flex flex-col gap-6">
           {/* Text Input */}
           <div className={`bg-white rounded-2xl shadow-xl shadow-black/5 border flex-1 flex flex-col overflow-hidden group transition-all duration-500 ${highlightInput ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-100' : 'border-gray-100 hover:border-emerald-500/30'}`}>
              <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <CommandLineIcon className="h-4 w-4 text-[#0B6E4F]" />
                    Kịch bản đầu vào
                    {highlightInput && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold animate-pulse">Data Loaded</span>}
                 </h3>
                 <div className="flex gap-2">
                    <button onClick={() => applyPreset('news')} className="text-[10px] bg-white border border-blue-100 text-blue-600 px-3 py-1.5 rounded-md font-bold hover:bg-blue-50 transition shadow-sm uppercase tracking-wide">News</button>
                    <button onClick={() => applyPreset('urgent')} className="text-[10px] bg-white border border-red-100 text-red-600 px-3 py-1.5 rounded-md font-bold hover:bg-red-50 transition shadow-sm uppercase tracking-wide">Alert</button>
                    <button onClick={() => applyPreset('story')} className="text-[10px] bg-white border border-purple-100 text-purple-600 px-3 py-1.5 rounded-md font-bold hover:bg-purple-50 transition shadow-sm uppercase tracking-wide">Story</button>
                 </div>
              </div>
              <textarea
                name="text"
                value={config.text}
                onChange={handleInputChange}
                className="w-full flex-1 p-6 outline-none resize-none text-gray-800 text-sm leading-7 min-h-[350px] placeholder-gray-300 font-medium selection:bg-emerald-100"
                placeholder="Nhập văn bản cần chuyển đổi tại đây..."
              />
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-xs flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <label className="flex items-center cursor-pointer select-none group">
                       <div className="relative">
                          <input 
                             type="checkbox" 
                             name="useAiNormalization"
                             checked={config.useAiNormalization} 
                             onChange={handleInputChange}
                             className="sr-only" 
                          />
                          <div className={`block w-9 h-5 rounded-full transition-colors ${config.useAiNormalization ? 'bg-[#0B6E4F]' : 'bg-gray-300'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${config.useAiNormalization ? 'transform translate-x-4' : ''}`}></div>
                       </div>
                       <div className="ml-3 text-gray-600 font-bold flex items-center gap-1.5 group-hover:text-gray-900 transition-colors">
                          <SparklesIcon className="h-4 w-4 text-purple-500"/>
                          AI Auto-Fix
                       </div>
                    </label>
                 </div>
                 <span className="text-gray-400 font-bold font-mono bg-white px-2 py-1 rounded border border-gray-200">{config.text.length} chars</span>
              </div>
           </div>

           {/* Log Terminal (Dark Mode preserved for contrast) */}
           <div className="bg-[#1e293b] rounded-2xl shadow-inner p-5 font-mono text-[11px] h-48 overflow-y-auto border border-gray-700">
              <div className="text-emerald-400 mb-3 font-bold border-b border-gray-700 pb-2 flex justify-between items-center tracking-wider">
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> TERMINAL OUTPUT</span>
                <span className="text-gray-500">{config.ollamaModel}</span>
              </div>
              {logs.length === 0 && <div className="text-gray-500 italic">System ready. Waiting for input...</div>}
              {logs.map((log, i) => (
                 <div key={i} className="text-gray-300 mb-1.5 border-l-2 border-emerald-500/20 pl-2">
                    <span className="text-emerald-600 mr-2">$</span>{log}
                 </div>
              ))}
              {isLoading && <div className="text-amber-500 animate-pulse mt-1">_ processing task</div>}
              {errorMsg && <div className="text-red-400 font-bold mt-2 bg-red-900/20 p-2 rounded border border-red-900/50">! ERROR: {errorMsg}</div>}
           </div>
        </div>

        {/* RIGHT PANEL: CONTROLS */}
        <div className="lg:col-span-5 flex flex-col gap-5">
           {/* Main Controls Card */}
           <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-7">
              <h3 className="text-xs font-extrabold text-gray-900 uppercase mb-8 flex items-center gap-2 tracking-wider border-b border-gray-100 pb-4">
                 <AdjustmentsHorizontalIcon className="h-5 w-5 text-[#0B6E4F]" />
                 Thông số kỹ thuật
              </h3>

              <div className="space-y-7">
                 {/* OLLAMA MODEL SELECTOR */}
                 <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 mb-2 uppercase tracking-wide">
                        AI Model Engine
                    </label>
                    <div className="relative group">
                      <select 
                        name="ollamaModel" 
                        value={config.ollamaModel} 
                        onChange={handleInputChange}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:border-[#0B6E4F] focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none font-bold transition-all cursor-pointer hover:bg-white"
                      >
                        {OLLAMA_MODELS.map(m => (
                          <option key={m.id} value={m.id}>{m.name} [{m.type}]</option>
                        ))}
                      </select>
                      <ArrowDownTrayIcon className="absolute right-4 top-3.5 h-4 w-4 text-gray-400 pointer-events-none group-hover:text-[#0B6E4F] transition-colors"/>
                    </div>
                 </div>

                 {/* Voice Selector */}
                 <div>
                    <div className="flex justify-between items-end mb-2">
                       <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">
                           Voice Model
                       </label>
                       <button onClick={loadVoices} className="text-[10px] text-[#0B6E4F] hover:underline flex items-center gap-1 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <ArrowPathIcon className="h-3 w-3" /> Refresh List
                       </button>
                    </div>
                    
                    {userVoices.length === 0 && (
                      <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 flex gap-2 items-start font-medium">
                        <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                        <div>Chưa có dữ liệu giọng nói. Sử dụng giọng mặc định.</div>
                      </div>
                    )}

                    <div className="relative group">
                      <select 
                        name="voiceName" 
                        value={config.voiceName} 
                        onChange={handleInputChange}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:border-[#0B6E4F] focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none font-bold transition-all cursor-pointer hover:bg-white"
                      >
                        {userVoices.length > 0 && (
                          <optgroup label="--- Custom Cloned Voices ---">
                              {userVoices.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                          </optgroup>
                        )}
                        <optgroup label="--- Base Foundation ---">
                            {SYSTEM_VOICES.map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </optgroup>
                      </select>
                      <UserCircleIcon className="absolute right-4 top-3 h-5 w-5 text-gray-400 pointer-events-none group-hover:text-[#0B6E4F] transition-colors"/>
                    </div>
                    
                    {/* Visual Indicator for Loaded Voice */}
                    {isCustomVoice && currentVoiceDetails && (
                       <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg animate-fade-in">
                          <FolderIcon className="h-4 w-4 text-emerald-500" />
                          <div className="text-[10px] text-emerald-800 font-mono overflow-hidden whitespace-nowrap text-ellipsis">
                             Loaded from: /sqtt/voices/{currentVoiceDetails.onlineVoiceId}.vbin
                          </div>
                       </div>
                    )}
                 </div>

                 {/* Basic Sliders */}
                 <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div>
                       <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-3 uppercase"><span>Tốc độ</span><span className="text-[#0B6E4F] bg-emerald-100 px-1.5 rounded">{config.speed}x</span></div>
                       <input type="range" name="speed" min="0.5" max="2.0" step="0.1" value={config.speed} onChange={handleInputChange} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0B6E4F]" />
                    </div>
                    <div>
                       <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-3 uppercase"><span>Cao độ</span><span className="text-[#0B6E4F] bg-emerald-100 px-1.5 rounded">{config.pitch}</span></div>
                       <input type="range" name="pitch" min="0.5" max="2.0" step="0.1" value={config.pitch} onChange={handleInputChange} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0B6E4F]" />
                    </div>
                 </div>

                 <button
                    onClick={openPauseModal}
                    className="w-full py-3 bg-white hover:bg-gray-50 text-xs font-bold text-gray-600 rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-400 flex justify-center items-center gap-2 transition-all"
                 >
                    <MusicalNoteIcon className="h-4 w-4 text-amber-500" /> 
                    <span>Cấu hình Prosody (Nhịp điệu)</span>
                 </button>

                 <button
                   onClick={handleSubmit}
                   disabled={isLoading}
                   className="w-full py-4 bg-gradient-to-r from-[#0B6E4F] to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/30 hover:shadow-emerald-700/50 flex justify-center items-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all transform hover:-translate-y-0.5"
                 >
                    {isLoading ? <CpuChipIcon className="h-5 w-5 animate-spin" /> : <BoltIcon className="h-5 w-5" />}
                    {isLoading ? 'ĐANG XỬ LÝ...' : 'THỰC HIỆN CHUYỂN ĐỔI'}
                 </button>
              </div>
           </div>

           {/* Audio Player */}
           {audioData && (
              <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 overflow-hidden animate-fade-in flex flex-col">
                 <div className="bg-gray-50 px-6 py-4 text-xs font-bold text-gray-500 border-b border-gray-100 flex justify-between items-center">
                    <span className="uppercase tracking-wider">Kết quả đầu ra</span>
                    <button onClick={handleDownload} className="text-blue-600 hover:text-blue-700 flex gap-1 items-center bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition">
                        <ArrowDownTrayIcon className="h-3 w-3"/> .WAV
                    </button>
                 </div>
                 <div className="p-6 flex items-center gap-5">
                    <button 
                       onClick={playAudio}
                       className="group relative h-20 w-20 rounded-full bg-gradient-to-br from-[#0B6E4F] to-emerald-600 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/60 active:scale-95 border-4 border-white ring-1 ring-gray-100"
                    >
                        {isPlaying ? (
                           <span className="relative z-10 p-4 rounded-lg bg-white/10 backdrop-blur-sm">
                              <StopIcon className="h-8 w-8 text-white drop-shadow-md" />
                           </span>
                        ) : (
                           <span className="relative z-10 p-4 rounded-full bg-white/10 backdrop-blur-sm pl-5">
                              <PlayIcon className="h-8 w-8 text-white drop-shadow-md" />
                           </span>
                        )}
                        {/* Pulse effect when playing */}
                        {isPlaying && <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping"></div>}
                    </button>

                    <div className="flex-1 h-24 bg-[#0F172A] rounded-2xl relative overflow-hidden border border-[#1E293B] shadow-inner flex flex-col justify-center group">
                       {/* Grid Background */}
                       <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                       
                       <canvas ref={canvasRef} width={600} height={120} className="w-full h-full relative z-10 mix-blend-screen"></canvas>
                       
                       {/* Status Overlay */}
                       <div className="absolute top-2 right-3 text-[9px] font-mono text-emerald-500/80 font-bold bg-[#0F172A]/80 px-2 py-0.5 rounded border border-emerald-900/30">
                          PCM_24KHZ_STEREO
                       </div>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Enhanced Pause Config Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
             
             <div className="bg-white px-6 py-5 flex justify-between items-center border-b border-gray-100">
                <div>
                   <h3 className="text-gray-900 font-extrabold flex items-center gap-2 text-lg">
                     <MusicalNoteIcon className="h-5 w-5 text-[#0B6E4F]" />
                     Tinh chỉnh Nhịp điệu
                   </h3>
                   <p className="text-xs text-gray-500 mt-0.5 font-medium">Prosody Alignment Control</p>
                </div>
                <button onClick={() => setShowPauseModal(false)} className="text-gray-400 hover:text-red-500 transition bg-gray-50 p-2 rounded-full hover:bg-red-50">
                  <XMarkIcon className="h-5 w-5"/>
                </button>
             </div>

             <div className="p-8 space-y-8">
                <div className="grid grid-cols-3 gap-3">
                   {['slow', 'default', 'fast'].map(mode => (
                       <button 
                        key={mode}
                        onClick={() => applyPausePreset(mode as any)} 
                        className="py-2.5 bg-white hover:bg-emerald-50 border border-gray-200 hover:border-emerald-500 hover:text-emerald-700 rounded-xl text-xs text-gray-600 font-bold uppercase transition-all shadow-sm"
                       >
                          {mode === 'slow' ? 'Đọc chậm' : mode === 'fast' ? 'Đọc nhanh' : 'Chuẩn'}
                       </button>
                   ))}
                </div>

                <div className="space-y-6">
                  {[
                    { label: 'Dấu chấm', symbol: '.', key: 'period', max: 2.0 },
                    { label: 'Dấu phẩy', symbol: ',', key: 'comma', max: 1.0 },
                    { label: 'Chấm phẩy', symbol: ';', key: 'semicolon', max: 1.5 },
                    { label: 'Xuống dòng', symbol: '¶', key: 'newline', max: 3.0 },
                  ].map((item) => (
                     <div key={item.key}>
                        <div className="flex justify-between items-center text-xs mb-2.5">
                           <span className="text-gray-700 font-bold flex items-center gap-2">
                              <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-md text-gray-900 font-black font-mono border border-gray-200 shadow-sm">{item.symbol}</span>
                              {item.label}
                           </span>
                           <span className="font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">{draftPauseConfig[item.key as keyof PauseConfig]}s</span>
                        </div>
                        <input 
                           type="range" 
                           min="0" 
                           max={item.max} 
                           step="0.05" 
                           value={draftPauseConfig[item.key as keyof PauseConfig]}
                           onChange={(e) => updateDraftPause(item.key as keyof PauseConfig, parseFloat(e.target.value))}
                           className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0B6E4F]"
                        />
                     </div>
                  ))}
                </div>
             </div>

             <div className="bg-gray-50 px-6 py-5 flex gap-4 border-t border-gray-100">
                <button 
                  onClick={() => setShowPauseModal(false)}
                  className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition bg-gray-100"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={savePauseConfig}
                  className="flex-1 py-3 bg-[#0B6E4F] text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition flex justify-center items-center gap-2"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  Lưu cấu hình
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TTSConverter;
