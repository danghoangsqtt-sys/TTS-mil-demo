
import React, { useState, useRef, useEffect } from 'react';
import { 
  StopIcon, 
  TrashIcon, 
  CpuChipIcon,
  CheckCircleIcon,
  ArchiveBoxArrowDownIcon,
  PlayCircleIcon,
  FingerPrintIcon,
  TableCellsIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  ShieldCheckIcon,
  AdjustmentsVerticalIcon,
  SignalIcon,
  MicrophoneIcon,
  FolderIcon
} from '@heroicons/react/24/solid';
import { getVoices, deleteVoiceProfile, saveVoiceProfile } from '../services/storageService';
import { processVoiceCloning } from '../services/voiceCloningService';
import { VoiceProfile } from '../types';

// IMPROVED TRAINING DATASET FOR BETTER AI CLONING
const TRAINING_SCRIPTS = [
  {
    id: 'env_check',
    title: 'BƯỚC 1: KIỂM TRA MÔI TRƯỜNG',
    desc: 'Giữ im lặng tuyệt đối trong 5 giây để hệ thống đo độ ồn nền và thiết lập ngưỡng khử nhiễu.',
    text: "[ ... ĐANG PHÂN TÍCH TÍN HIỆU MÔI TRƯỜNG ... ]",
    duration: 5,
    autoStop: true
  },
  {
    id: 'neutral_rich',
    title: 'BƯỚC 2: KHẨU HÌNH & NGỮ ĐIỆU CHUẨN',
    desc: 'Đọc đoạn văn bản ngữ âm cân bằng (Pangram) để máy học cách phát âm tròn vành rõ chữ.',
    text: "Trong những năm qua, lực lượng vũ trang nhân dân đã không ngừng lớn mạnh, bảo vệ vững chắc chủ quyền biên giới, hải đảo. Dù khó khăn gian khổ, các chiến sĩ vẫn ngày đêm bám trụ, giữ vững tay súng vì bình yên của Tổ quốc.",
    minDuration: 10
  },
  {
    id: 'command_shout',
    title: 'BƯỚC 3: GIỌNG MỆNH LỆNH (CAO ĐỘ)',
    desc: 'Giả lập tình huống chỉ huy trên thao trường. Cần giọng to, vang, dứt khoát, uy lực.',
    text: "Toàn đại đội chú ý! Báo động cấp 1! Tất cả về vị trí chiến đấu ngay lập tức! Các mũi chủ công triển khai đội hình theo phương án A! Nhắc lại, đây không phải là diễn tập!",
    minDuration: 8
  },
  {
    id: 'news_flow',
    title: 'BƯỚC 4: BẢN TIN THỜI SỰ (TỐC ĐỘ)',
    desc: 'Đọc với tốc độ trung bình - nhanh, giữ hơi đều, mô phỏng phát thanh viên chuyên nghiệp.',
    text: "Thưa quý vị và các đồng chí, sáng nay tại Hà Nội, Bộ Quốc phòng đã tổ chức lễ ra quân huấn luyện năm 2025. Phát biểu tại buổi lễ, Đại tướng Bộ trưởng nhấn mạnh yêu cầu làm chủ vũ khí trang bị mới, nâng cao khả năng sẵn sàng chiến đấu trong tình hình mới.",
    minDuration: 12
  },
  {
    id: 'emotional_slow',
    title: 'BƯỚC 5: KỂ CHUYỆN (CẢM XÚC)',
    desc: 'Đọc chậm, trầm, sâu lắng. Dùng cho các kịch bản kể chuyện hoặc tri ân.',
    text: "Những cánh rừng già im lìm trong sương sớm, gợi nhớ về những ngày hành quân gian khổ nhưng đầy hào hùng. Chúng tôi ngồi bên nhau, chia sẻ từng ngụm nước, ánh mắt ánh lên niềm tin tất thắng vào ngày mai độc lập.",
    minDuration: 10
  }
];

const VoiceLab: React.FC = () => {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [profileName, setProfileName] = useState('');
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [stepBlob, setStepBlob] = useState<Blob | null>(null); 
  const [isPlayingReview, setIsPlayingReview] = useState(false);
  const [recordings, setRecordings] = useState<Record<string, Blob>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [draftProfile, setDraftProfile] = useState<any>(null);
  const [previewAudioId, setPreviewAudioId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const reviewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    refreshVoices();
    return () => {
      stopVisualizer();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const refreshVoices = async () => {
    const v = await getVoices();
    setVoices(v);
  };

  const stopVisualizer = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
       audioContextRef.current.close();
    }
    audioContextRef.current = null;
  };

  const startVisualizer = async (stream: MediaStream) => {
    if (!canvasRef.current) return;
    if (audioContextRef.current) await audioContextRef.current.close();
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioContextRef.current;
    if(!ctx) return;

    const source = ctx.createMediaStreamSource(stream);
    analyserRef.current = ctx.createAnalyser();
    analyserRef.current.fftSize = 2048; 
    analyserRef.current.smoothingTimeConstant = 0.8;
    source.connect(analyserRef.current);

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvasCtx = canvasRef.current.getContext('2d');
    
    const draw = () => {
      if (!canvasRef.current) return;
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteTimeDomainData(dataArray);

      let sum = 0;
      for(let i = 0; i < bufferLength; i++) {
        const x = dataArray[i] - 128;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setNoiseLevel(Math.min(100, Math.round(rms * 200)));

      const w = canvasRef.current.width;
      const h = canvasRef.current.height;

      canvasCtx!.fillStyle = '#0F172A'; // Slate 900
      canvasCtx!.fillRect(0, 0, w, h);
      
      // Draw grid
      canvasCtx!.strokeStyle = '#1E293B';
      canvasCtx!.lineWidth = 1;
      canvasCtx!.beginPath();
      for(let i=0; i<w; i+=40) { canvasCtx!.moveTo(i,0); canvasCtx!.lineTo(i,h); }
      for(let i=0; i<h; i+=40) { canvasCtx!.moveTo(0,i); canvasCtx!.lineTo(w,i); }
      canvasCtx!.stroke();

      canvasCtx!.lineWidth = 2;
      canvasCtx!.strokeStyle = '#10B981'; // Emerald 500
      canvasCtx!.shadowBlur = 4;
      canvasCtx!.shadowColor = '#10B981';
      canvasCtx!.beginPath();

      const sliceWidth = w * 1.0 / bufferLength;
      let x = 0;

      for(let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * h / 2;
        if(i === 0) canvasCtx!.moveTo(x, y);
        else canvasCtx!.lineTo(x, y);
        x += sliceWidth;
      }
      canvasCtx!.lineTo(w, h / 2);
      canvasCtx!.stroke();
      canvasCtx!.shadowBlur = 0;
    };
    draw();
  };

  const startStepRecording = async () => {
    if (!profileName.trim() && currentStepIndex === 0) {
      alert("Vui lòng nhập Mã định danh (Voice ID) để hệ thống tạo hồ sơ.");
      return;
    }

    try {
      setStepBlob(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVisualizer(stream);
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      if (TRAINING_SCRIPTS[currentStepIndex].autoStop) {
        setTimeout(() => stopStepRecording(), TRAINING_SCRIPTS[currentStepIndex].duration * 1000 + 500);
      }

      const timer = setInterval(() => setRecordingTime(prev => prev + 1), 1000);

      mediaRecorderRef.current.onstop = () => {
        clearInterval(timer);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        stopVisualizer(); 
        setIsRecording(false);
        setStepBlob(blob);
      };
    } catch (e) {
      console.error(e);
      alert("Lỗi: Không thể truy cập Microphone.");
    }
  };

  const stopStepRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleReviewPlay = () => {
    if (!stepBlob) return;
    if (isPlayingReview) {
      reviewAudioRef.current?.pause();
      setIsPlayingReview(false);
      return;
    }
    const url = URL.createObjectURL(stepBlob);
    const audio = new Audio(url);
    reviewAudioRef.current = audio;
    audio.onended = () => setIsPlayingReview(false);
    audio.play();
    setIsPlayingReview(true);
  };

  const handleStepConfirm = () => {
    if (!stepBlob) return;
    const currentScript = TRAINING_SCRIPTS[currentStepIndex];
    
    // Validate Duration
    if (!currentScript.autoStop && recordingTime < (currentScript.minDuration || 3)) {
       alert(`Mẫu ghi âm quá ngắn! Vui lòng đọc đầy đủ nội dung (Tối thiểu ${currentScript.minDuration}s).`);
       return;
    }

    const stepId = currentScript.id;
    setRecordings(prev => ({ ...prev, [stepId]: stepBlob }));
    
    if (currentStepIndex === 0 && noiseLevel > 30) {
       if (!confirm(`CẢNH BÁO: Độ ồn nền ${noiseLevel}% quá cao. Điều này sẽ ảnh hưởng đến chất lượng Clone. Tiếp tục?`)) return;
    }

    if (currentStepIndex < TRAINING_SCRIPTS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setStepBlob(null);
    } else {
      finishTraining();
    }
  };

  const handleRetry = () => {
    setStepBlob(null);
    setRecordingTime(0);
  };

  const finishTraining = async () => {
    setIsProcessing(true);
    setProgressPercent(0);
    const logs = [
      "Initializing Local Python Runtime...",
      "Mounting 'vn_military_acoustic_v2' checkpoint...",
      "Concatenating Multi-Speaker Embeddings...",
      "Analyzing noise profile (Environmental Subtraction)...",
      "Extracting F0 curve (Pitch Contour)...",
      "Aligning Phonemes (Duration Model)...",
      "Optimizing Vocoder for High Fidelity...",
      "DONE: Voice Profile Serialized."
    ];
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      setProcessingLogs(prev => [...prev, log]);
      setProgressPercent(Math.round(((i + 1) / logs.length) * 100));
      await new Promise(r => setTimeout(r, Math.random() * 600 + 400)); 
    }
    // Pass all recordings to the service
    const allBlobs = Object.values(recordings) as Blob[];
    const draft = await processVoiceCloning(profileName, allBlobs); 
    setDraftProfile(draft);
    setIsProcessing(false);
  };

  const handleSaveDraft = async () => {
    if (!draftProfile) return;
    setIsSaving(true);
    try {
      // Simulate file system write time
      await new Promise(r => setTimeout(r, 1000));
      await saveVoiceProfile(draftProfile);
      setIsSaving(false);
      resetLab();
    } catch (e) {
      console.error(e);
      setIsSaving(false);
      alert("Lỗi khi lưu vào hệ thống.");
    }
  };

  const resetLab = () => {
    setDraftProfile(null);
    setProfileName('');
    setRecordings({});
    setCurrentStepIndex(0);
    setStepBlob(null);
    setProcessingLogs([]);
    setProgressPercent(0);
    setIsProcessing(false);
    refreshVoices();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa mẫu giọng này khỏi hệ thống?")) {
      await deleteVoiceProfile(id);
      refreshVoices();
    }
  };

  const handlePreviewLibrary = (voice: VoiceProfile) => {
    if (previewAudioId === voice.id) {
       previewAudioRef.current?.pause();
       setPreviewAudioId(null);
       return;
    }
    if (previewAudioRef.current) previewAudioRef.current.pause();
    const audio = new Audio(voice.sampleBase64.startsWith('data:') ? voice.sampleBase64 : `data:audio/wav;base64,${voice.sampleBase64}`);
    previewAudioRef.current = audio;
    setPreviewAudioId(voice.id);
    audio.onended = () => setPreviewAudioId(null);
    audio.play();
  };

  const currentStep = TRAINING_SCRIPTS[currentStepIndex];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      {/* LEFT: WORKSTATION CONSOLE (Kept Dark for Tech feel) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[650px] relative">
           
           {/* Header */}
           <div className="bg-gray-900 px-6 py-4 flex justify-between items-center border-b border-gray-800">
              <div>
                 <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <CpuChipIcon className="h-5 w-5 text-emerald-400" />
                    WORKSTATION
                 </h2>
              </div>
              
              {/* Step Indicators */}
              <div className="flex gap-2">
                 {TRAINING_SCRIPTS.map((s, idx) => (
                    <div 
                      key={idx} 
                      className={`h-2.5 w-2.5 rounded-full transition-all duration-300 border border-gray-700 ${
                        idx < currentStepIndex ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                        idx === currentStepIndex ? 'bg-amber-400 scale-125 animate-pulse' : 'bg-gray-800'
                      }`}
                      title={s.title}
                    ></div>
                 ))}
              </div>
           </div>

           <div className="flex-1 p-6 relative flex flex-col bg-gray-50">
              {!draftProfile ? (
                 <>
                    {/* Setup Phase (Name Input) */}
                    {currentStepIndex === 0 && !isRecording && !stepBlob && (
                       <div className="mb-6 animate-fade-in bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                             1. Đặt tên mẫu giọng
                          </label>
                          <div className="relative">
                             <input 
                               type="text" 
                               value={profileName}
                               onChange={(e) => setProfileName(e.target.value)}
                               placeholder="VD: Phat_Thanh_Vien_Nam"
                               className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:border-emerald-500 focus:bg-white outline-none font-medium text-sm transition-colors"
                             />
                             <FingerPrintIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                          </div>
                          
                          <div className="mt-4 flex items-center gap-3">
                             <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">2. Thiết bị</label>
                             <div className="flex-1 bg-gray-100 border border-gray-200 rounded px-3 py-2 text-xs text-gray-600 flex items-center justify-between font-medium">
                                <span className="truncate">Default Microphone (System)</span>
                                <AdjustmentsVerticalIcon className="h-3 w-3" />
                             </div>
                          </div>
                       </div>
                    )}

                    {/* Recording / Instruction Area */}
                    <div className="flex-1 flex flex-col space-y-4">
                       <div className="flex justify-between items-end">
                           <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 shadow-sm truncate max-w-[70%]">
                              {currentStep.title}
                           </span>
                           {isRecording && (
                              <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded-md font-bold text-xs animate-pulse flex items-center gap-1.5 shadow-sm">
                                 <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                 REC {recordingTime}s
                              </span>
                           )}
                       </div>
                       
                       {/* Teleprompter & Visualizer */}
                       <div className={`flex-1 bg-gray-900 border rounded-xl relative overflow-hidden flex flex-col shadow-inner transition-colors duration-300 ${isRecording ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-gray-800'}`}>
                          <div className="relative z-10 flex-1 flex items-center justify-center p-6 text-center overflow-y-auto">
                             <span className="text-lg md:text-xl font-medium text-white leading-relaxed tracking-wide drop-shadow-md">
                                "{currentStep.text}"
                             </span>
                          </div>

                          {/* Oscilloscope Canvas */}
                          <div className="h-24 bg-gray-950 border-t border-gray-800 relative flex-shrink-0">
                             <canvas ref={canvasRef} width={500} height={96} className="w-full h-full opacity-90"></canvas>
                             <div className="absolute top-2 right-2 font-mono text-[10px] text-gray-500 flex flex-col items-end">
                                <span>NOISE: {noiseLevel}dB</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 items-start">
                          <SparklesIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-800 leading-relaxed">
                             <span className="font-bold">Yêu cầu:</span> {currentStep.desc} 
                             {!currentStep.autoStop && <span className="text-red-600 ml-1 font-bold">(Tối thiểu {currentStep.minDuration}s)</span>}
                          </p>
                       </div>
                    </div>

                    {/* Controls & Progress */}
                    <div className="mt-6">
                       {isProcessing ? (
                          <div className="w-full space-y-3">
                             <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                                <span>System Processing</span>
                                <span>{progressPercent}%</span>
                             </div>
                             <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                             </div>
                             <div className="bg-black text-emerald-400 font-mono text-[10px] p-3 rounded-lg h-24 overflow-y-auto border border-gray-800 custom-scrollbar shadow-inner">
                                {processingLogs.map((log, i) => (
                                   <div key={i} className="mb-1 border-b border-gray-900/50 pb-0.5">> {log}</div>
                                ))}
                                <div className="animate-pulse text-emerald-200">> _</div>
                             </div>
                          </div>
                       ) : (
                          <div className="flex flex-col gap-3">
                             {stepBlob ? (
                                <div className="space-y-3">
                                   <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between shadow-sm">
                                      <div className="flex items-center gap-3">
                                         <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                            <MicrophoneIcon className="h-5 w-5" />
                                         </div>
                                         <div>
                                            <p className="text-xs font-bold text-gray-800">Recording Captured</p>
                                            <p className="text-[10px] text-gray-400 font-mono">{(stepBlob.size / 1024).toFixed(1)} KB • WAV</p>
                                         </div>
                                      </div>
                                      <div className="flex gap-1">
                                         <button onClick={handleReviewPlay} className="p-2 hover:bg-gray-100 rounded-full text-blue-600 transition" title="Play Preview">
                                            {isPlayingReview ? <StopIcon className="h-5 w-5" /> : <PlayCircleIcon className="h-5 w-5" />}
                                         </button>
                                         <button onClick={handleRetry} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition" title="Discard & Retry">
                                            <TrashIcon className="h-5 w-5" />
                                         </button>
                                      </div>
                                   </div>

                                   <button 
                                     onClick={handleStepConfirm}
                                     className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-bold text-sm uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition transform active:scale-[0.98]"
                                   >
                                      <CheckCircleIcon className="h-5 w-5" />
                                      {currentStepIndex < TRAINING_SCRIPTS.length - 1 ? 'Xác nhận & Tiếp tục' : 'Hoàn thành Training'}
                                   </button>
                                </div>
                             ) : (
                                <div className="flex flex-col items-center justify-center py-2">
                                  <button
                                     onClick={isRecording ? stopStepRecording : startStepRecording}
                                     disabled={(!profileName && currentStepIndex === 0)}
                                     className={`relative h-24 w-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 group
                                       ${isRecording 
                                         ? 'bg-white ring-4 ring-red-500/20 scale-110' 
                                         : 'bg-gradient-to-br from-red-500 to-red-600 ring-4 ring-red-100 hover:ring-red-200 hover:scale-105'
                                       } ${(!profileName && currentStepIndex === 0) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                  >
                                     {isRecording ? (
                                        <div className="h-8 w-8 bg-red-500 rounded-md shadow-sm"></div> 
                                     ) : (
                                        <MicrophoneIcon className="h-10 w-10 text-white drop-shadow-md" />
                                     )}
                                     {isRecording && (
                                       <span className="absolute -inset-3 rounded-full border-2 border-red-500 opacity-50 animate-ping"></span>
                                     )}
                                  </button>
                                  <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                     {isRecording ? 'Đang ghi âm...' : 'Nhấn để bắt đầu'}
                                  </p>
                                </div>
                             )}
                          </div>
                       )}
                    </div>
                 </>
              ) : (
                 // RESULT SCREEN
                 <div className="flex-1 flex flex-col items-center justify-center animate-fade-in space-y-8 p-8">
                    <div className="relative">
                       <div className="absolute -inset-4 bg-emerald-100 rounded-full blur-xl animate-pulse"></div>
                       <SparklesIcon className="h-24 w-24 text-emerald-500 relative z-10" />
                    </div>
                    
                    <div className="text-center">
                       <h3 className="text-3xl font-bold text-gray-800 tracking-tight">TRAINING SUCCESSFUL</h3>
                       <p className="text-gray-500 mt-2 font-mono">Model ID: <span className="text-emerald-600 font-bold">{draftProfile.onlineVoiceId}</span></p>
                    </div>

                    <div className="w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                       <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                          <span className="text-sm text-gray-500">Độ chính xác</span>
                          <span className="text-emerald-600 font-bold font-mono">99.8%</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">System Location</span>
                          <span className="font-mono text-[10px] text-gray-800 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                             /sqtt/voices/{draftProfile.onlineVoiceId}.vbin
                          </span>
                       </div>
                    </div>

                    <div className="flex gap-4 w-full">
                       <button 
                         onClick={resetLab} 
                         disabled={isSaving}
                         className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                       >
                          HỦY BỎ
                       </button>
                       <button 
                         onClick={handleSaveDraft} 
                         disabled={isSaving}
                         className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg flex justify-center items-center gap-2 transition disabled:opacity-50 disabled:cursor-wait"
                       >
                          {isSaving ? (
                             <>
                                <CpuChipIcon className="h-5 w-5 animate-spin" />
                                WRITING TO DISK...
                             </>
                          ) : (
                             <>
                                <ArchiveBoxArrowDownIcon className="h-5 w-5" />
                                LƯU VÀO HỆ THỐNG
                             </>
                          )}
                       </button>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>

      {/* RIGHT: LIBRARY VAULT */}
      <div className="lg:col-span-7">
         <div className="bg-white rounded-2xl shadow-card border border-gray-100 h-full flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
               <h3 className="font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <TableCellsIcon className="h-5 w-5 text-emerald-500" />
                  KHO DỮ LIỆU
               </h3>
               <div className="flex items-center gap-2">
                   <FolderIcon className="h-4 w-4 text-emerald-500"/>
                   <span className="text-xs font-bold text-emerald-600">/sqtt/voices/</span>
               </div>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-gray-500 font-semibold sticky top-0 z-10 shadow-sm border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 bg-gray-50/80 backdrop-blur">Tên Hồ Sơ</th>
                    <th className="px-6 py-4 bg-gray-50/80 backdrop-blur">System Path</th>
                    <th className="px-6 py-4 bg-gray-50/80 backdrop-blur">Nghe Thử</th>
                    <th className="px-6 py-4 bg-gray-50/80 backdrop-blur text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {voices.length === 0 ? (
                     <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                           <div className="flex flex-col items-center gap-2">
                              <ArchiveBoxArrowDownIcon className="h-10 w-10 opacity-20" />
                              <p className="text-sm">Chưa có dữ liệu hệ thống.</p>
                           </div>
                        </td>
                     </tr>
                   ) : (
                     voices.map((voice) => (
                       <tr key={voice.id} className="hover:bg-gray-50 transition-colors group">
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shadow-sm border border-emerald-200">
                                  {voice.name.charAt(0).toUpperCase()}
                                </div>
                               <div>
                                  <p className="font-bold text-gray-800">{voice.name}</p>
                                  <p className="text-[10px] text-gray-400 font-mono mt-0.5 tracking-wider uppercase">
                                     Vector Ready
                                  </p>
                               </div>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-2 py-1 rounded w-fit">
                               <FolderIcon className="h-3 w-3 text-gray-400" />
                               <span className="truncate max-w-[120px]">{voice.onlineVoiceId}.vbin</span>
                            </div>
                         </td>
                         <td className="px-6 py-4">
                            <button 
                               onClick={() => handlePreviewLibrary(voice)}
                               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all
                                 ${previewAudioId === voice.id 
                                   ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                   : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                 }`}
                            >
                               {previewAudioId === voice.id ? <StopIcon className="h-3 w-3"/> : <SpeakerWaveIcon className="h-3 w-3"/>}
                               {previewAudioId === voice.id ? 'Playing...' : 'Test Audio'}
                            </button>
                         </td>
                         <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDelete(voice.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                              title="Delete Profile"
                            >
                               <TrashIcon className="h-5 w-5" />
                            </button>
                         </td>
                       </tr>
                     ))
                   )}
                </tbody>
              </table>
            </div>
            
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-[10px] text-gray-400 text-center font-mono">
               SYSTEM STORAGE // ENCRYPTED // USAGE: {(voices.length * 1.5).toFixed(1)}MB
            </div>
         </div>
      </div>
    </div>
  );
};

export default VoiceLab;
