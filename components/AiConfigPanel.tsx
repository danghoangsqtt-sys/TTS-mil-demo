
import React, { useState, useEffect } from 'react';
import { 
  CpuChipIcon, 
  ServerStackIcon, 
  BoltIcon, 
  ArrowPathIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  QuestionMarkCircleIcon,
  RocketLaunchIcon,
  GlobeAltIcon
} from '@heroicons/react/24/solid';
import { checkOllamaHealth, fetchOllamaModels, getOllamaUrl } from '../services/geminiService';
import { OllamaModel } from '../types';

const AiConfigPanel: React.FC = () => {
  const [host, setHost] = useState(getOllamaUrl());
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    checkConnection();
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleHostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHost(e.target.value);
    localStorage.setItem('SQTT_OLLAMA_HOST', e.target.value);
  };

  const checkConnection = async () => {
    setStatus('checking');
    addLog(`Pinging AI Host at ${host}...`);
    const isAlive = await checkOllamaHealth();
    
    if (isAlive) {
      setStatus('connected');
      addLog("Connection Successful: Ollama Service is online.");
      refreshModels();
    } else {
      setStatus('disconnected');
      addLog("Connection Failed: Ensure Ollama is running and CORS is configured.");
    }
  };

  const refreshModels = async () => {
    addLog("Fetching installed models manifest...");
    const m = await fetchOllamaModels();
    setModels(m);
    addLog(`Found ${m.length} models installed locally.`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép lệnh vào bộ nhớ tạm!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full animate-fade-in">
      
      {/* LEFT: CONFIG & STATUS */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-card relative overflow-hidden">
           <div className={`absolute top-0 right-0 p-4 opacity-[0.03] transform scale-150`}>
              <CpuChipIcon className="h-32 w-32 text-gray-900" />
           </div>

           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
              <ServerStackIcon className="h-6 w-6 text-sqtt-primary" />
              CẤU HÌNH KẾT NỐI
           </h2>

           <div className="space-y-4 relative z-10">
              <div>
                 <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Host Address (URL)</label>
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={host}
                      onChange={handleHostChange}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-700 font-mono text-sm focus:border-emerald-500 focus:bg-white outline-none transition-all"
                      placeholder="http://localhost:11434"
                    />
                    <button 
                      onClick={checkConnection}
                      className="px-6 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 transition"
                    >
                      <ArrowPathIcon className={`h-5 w-5 ${status === 'checking' ? 'animate-spin' : ''}`} />
                      PING
                    </button>
                 </div>
              </div>

              <div className={`flex items-center gap-4 p-4 rounded-xl border ${status === 'connected' ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className={`h-3 w-3 rounded-full shadow-sm ${
                    status === 'connected' ? 'bg-emerald-500' : 
                    status === 'disconnected' ? 'bg-red-500' : 'bg-amber-500'
                  }`}></div>
                  <div className="flex-1">
                     <p className={`text-sm font-bold ${status === 'connected' ? 'text-emerald-800' : 'text-gray-800'}`}>
                        {status === 'connected' ? 'SYSTEM ONLINE' : status === 'disconnected' ? 'SYSTEM OFFLINE' : 'DIAGNOSING...'}
                     </p>
                     <p className="text-xs text-gray-500 font-mono">
                        {status === 'connected' ? 'Ready for inference.' : 'Cannot reach AI Service.'}
                     </p>
                  </div>
              </div>
           </div>
        </div>

        {/* Models List */}
        <div className="bg-white rounded-2xl border border-gray-200 flex-1 flex flex-col shadow-card overflow-hidden">
           <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <BoltIcon className="h-5 w-5 text-sqtt-primary" />
                 INSTALLED MODELS
              </h3>
              <span className="text-xs bg-gray-100 border border-gray-200 text-gray-600 font-bold px-2 py-1 rounded font-mono">{models.length} DETECTED</span>
           </div>
           
           <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-sm text-left border-collapse">
                 <thead className="bg-gray-100 text-gray-600 font-extrabold text-[10px] uppercase tracking-wider border-b border-gray-200">
                    <tr>
                       <th className="px-6 py-4">Model Tag</th>
                       <th className="px-6 py-4">Size</th>
                       <th className="px-6 py-4">Modified</th>
                       <th className="px-6 py-4">Format</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 text-gray-700">
                    {models.length === 0 ? (
                       <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                             {status === 'connected' 
                               ? "No models found. Run 'ollama pull' in terminal." 
                               : "Connect to Ollama to view models."}
                          </td>
                       </tr>
                    ) : (
                       models.map((m) => (
                          <tr key={m.digest} className="group odd:bg-white even:bg-gray-50/50 hover:bg-emerald-50/40 transition-colors">
                             <td className="px-6 py-3.5 font-bold text-emerald-700 font-mono group-hover:text-emerald-800">{m.name}</td>
                             <td className="px-6 py-3.5 text-gray-600 font-medium">{(m.size / 1024 / 1024 / 1024).toFixed(2)} GB</td>
                             <td className="px-6 py-3.5 text-gray-500 text-xs">{new Date(m.modified_at).toLocaleDateString()}</td>
                             <td className="px-6 py-3.5 text-gray-400 text-[10px] font-bold uppercase tracking-wide">
                                <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">{m.details.format} ({m.details.quantization_level})</span>
                             </td>
                          </tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Terminal Logs (Kept dark for contrast) */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 font-mono text-xs h-32 overflow-y-auto shadow-inner">
           <div className="text-gray-500 border-b border-gray-800 pb-1 mb-2">SYSTEM LOGS</div>
           {logs.map((l, i) => (
              <div key={i} className="text-gray-300 mb-1">> {l}</div>
           ))}
        </div>
      </div>

      {/* RIGHT: INSTRUCTION GUIDE */}
      <div className="lg:col-span-5">
         <div className="bg-emerald-700 text-white rounded-2xl shadow-xl border border-emerald-600 h-full flex flex-col relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="px-6 py-5 border-b border-white/20 flex items-center gap-3 relative z-10">
               <QuestionMarkCircleIcon className="h-6 w-6 text-white" />
               <div>
                  <h3 className="font-bold text-lg text-white">HƯỚNG DẪN TÍCH HỢP</h3>
                  <p className="text-xs text-gray-100 font-medium">Setup Guide for New Users</p>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative z-10">
               
               {/* STEP 1 */}
               <div className="relative pl-6 border-l-2 border-white/40">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-emerald-800 border-2 border-white"></div>
                  <h4 className="font-bold text-white text-base mb-2 flex items-center gap-2">
                     BƯỚC 1: Tải & Cài đặt Ollama
                     <GlobeAltIcon className="h-4 w-4" />
                  </h4>
                  <p className="text-sm text-white font-medium mb-3 text-justify leading-relaxed">
                     Ollama là nền tảng chạy AI offline nhẹ và mạnh mẽ nhất hiện nay. Bạn cần tải phần mềm này về máy tính.
                  </p>
                  <a 
                    href="https://ollama.com/download" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-900 font-bold rounded-lg hover:bg-emerald-50 transition text-sm shadow-md"
                  >
                     <RocketLaunchIcon className="h-4 w-4" />
                     Tải xuống tại Ollama.com
                  </a>
               </div>

               {/* STEP 2 */}
               <div className="relative pl-6 border-l-2 border-white/40">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-emerald-800 border-2 border-white"></div>
                  <h4 className="font-bold text-white text-base mb-2">BƯỚC 2: Kiểm tra cài đặt</h4>
                  <p className="text-sm text-white font-medium mb-3 text-justify">
                     Sau khi cài đặt xong, hãy mở <strong>PowerShell</strong> (Windows) hoặc <strong>Terminal</strong> (Mac/Linux) và gõ lệnh sau để đảm bảo Ollama đã chạy:
                  </p>
                  <div className="bg-black/30 rounded border border-white/20 p-3 flex justify-between items-center group backdrop-blur-sm">
                     <code className="text-white font-mono text-sm">ollama --version</code>
                     <button onClick={() => copyToClipboard('ollama --version')} className="text-gray-300 hover:text-white transition">
                        <ClipboardDocumentIcon className="h-4 w-4" />
                     </button>
                  </div>
               </div>

               {/* STEP 3 */}
               <div className="relative pl-6 border-l-2 border-white/40">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-emerald-800 border-2 border-white"></div>
                  <h4 className="font-bold text-white text-base mb-2">BƯỚC 3: Tải Model Tiếng Việt</h4>
                  <p className="text-sm text-white font-medium mb-3 text-justify">
                     Hệ thống cần một mô hình AI hiểu tiếng Việt tốt. Chúng tôi khuyến nghị <strong>VinALLAMA</strong> hoặc <strong>PhoGPT</strong>. Chạy lệnh sau trong Terminal để tải về (khoảng 4GB):
                  </p>
                  <div className="bg-black/30 rounded border border-white/20 p-3 flex justify-between items-center mb-2 backdrop-blur-sm">
                     <code className="text-yellow-300 font-mono text-sm">ollama run vinallama-7b-chat</code>
                     <button onClick={() => copyToClipboard('ollama run vinallama-7b-chat')} className="text-gray-300 hover:text-white transition">
                        <ClipboardDocumentIcon className="h-4 w-4" />
                     </button>
                  </div>
                  <p className="text-xs text-white/80 italic">Lưu ý: Quá trình tải có thể mất 5-10 phút tùy mạng.</p>
               </div>

               {/* STEP 4 */}
               <div className="relative pl-6 border-l-2 border-white/40">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-emerald-800 border-2 border-white"></div>
                  <h4 className="font-bold text-white text-base mb-2">BƯỚC 4: Kết nối</h4>
                  <p className="text-sm text-white font-medium mb-3 text-justify">
                     Quay lại màn hình này, nhấn nút <strong>PING</strong>. Nếu đèn trạng thái chuyển sang màu <span className="text-emerald-900 font-bold bg-white px-1.5 py-0.5 rounded text-xs mx-1">XANH</span>, hệ thống đã sẵn sàng hoạt động.
                  </p>
               </div>
               
               {/* TROUBLESHOOT */}
               <div className="mt-8 bg-white/10 border border-white/20 p-4 rounded-xl">
                  <h5 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                     <XCircleIcon className="h-4 w-4" />
                     Xử lý lỗi kết nối (CORS Issue)
                  </h5>
                  <p className="text-xs text-white font-medium mb-2">
                     Nếu PING thất bại dù Ollama đang chạy, có thể do trình duyệt chặn kết nối. Hãy tắt Ollama và chạy lại với lệnh sau để cho phép kết nối từ ứng dụng:
                  </p>
                  <div className="bg-black/40 p-2 rounded border border-white/10">
                     <code className="text-xs text-gray-400 font-mono block mb-1"># Windows PowerShell:</code>
                     <code className="text-xs text-emerald-300 font-mono">$env:OLLAMA_ORIGINS="*"; ollama serve</code>
                  </div>
               </div>

            </div>
         </div>
      </div>
    </div>
  );
};

export default AiConfigPanel;
