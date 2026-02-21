
import React, { useEffect, useState, useRef } from 'react';
import { getLogs, deleteLog } from '../services/storageService';
import { HistoryLog as LogType } from '../types';
import { 
  PlayIcon, 
  StopIcon, 
  TrashIcon, 
  ArrowPathIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  CloudArrowDownIcon,
  SpeakerWaveIcon,
  DocumentTextIcon
} from '@heroicons/react/24/solid';

interface HistoryLogProps {
  refreshTrigger: number;
  onRebroadcast: (text: string) => void;
}

const HistoryLog: React.FC<HistoryLogProps> = ({ refreshTrigger, onRebroadcast }) => {
  const [logs, setLogs] = useState<LogType[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadLogs();
  }, [refreshTrigger]);

  useEffect(() => {
    filterData();
  }, [logs, searchTerm, filterDate]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const loadLogs = async () => {
    const data = await getLogs();
    setLogs(data);
  };

  const filterData = () => {
    let res = [...logs];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      res = res.filter(l => l.rawText.toLowerCase().includes(lower) || l.configSummary.toLowerCase().includes(lower));
    }
    if (filterDate) {
      res = res.filter(l => {
        const d = new Date(l.timestamp).toISOString().split('T')[0];
        return d === filterDate;
      });
    }
    setFilteredLogs(res);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa nhật ký này?")) {
      await deleteLog(id);
      loadLogs();
    }
  };

  const handlePlay = (log: LogType) => {
    if (!log.audioBlob) return;
    if (playingId === log.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();

    try {
      const rawBase64 = log.audioBlob.includes(',') ? log.audioBlob.split(',')[1] : log.audioBlob;
      const byteNumbers = new Array(rawBase64.length);
      const binaryString = window.atob(rawBase64);
      for (let i = 0; i < binaryString.length; i++) {
          byteNumbers[i] = binaryString.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {type: 'audio/wav'});
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.play();
      setPlayingId(log.id);
    } catch (e) {
      console.error("Audio play error", e);
    }
  };

  const handleDownload = (log: LogType) => {
    if (!log.audioBlob) return;
    const rawBase64 = log.audioBlob.includes(',') ? log.audioBlob.split(',')[1] : log.audioBlob;
    const binaryString = window.atob(rawBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Broadcast_${new Date(log.timestamp).getTime()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-200 flex flex-col h-[600px] animate-fade-in overflow-hidden">
      {/* HEADER & FILTERS */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
           <SpeakerWaveIcon className="h-6 w-6 text-sqtt-primary" />
           <h3 className="font-bold text-gray-800 uppercase tracking-wide text-sm">NHẬT KÝ PHÁT THANH</h3>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
           {/* Date Picker */}
           <div className="relative">
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-sm"
              />
              <CalendarDaysIcon className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
           </div>

           {/* Search */}
           <div className="relative flex-1 md:w-64">
              <input 
                type="text" 
                placeholder="Tìm nội dung..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-sm"
              />
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
           </div>
        </div>
      </div>

      {/* TABLE CONTENT */}
      <div className="flex-1 overflow-auto bg-white custom-scrollbar">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 font-extrabold text-[10px] uppercase tracking-wider border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 w-32 border-r border-gray-200/50">Thời gian</th>
              <th className="px-6 py-4">Nội dung văn bản</th>
              <th className="px-6 py-4 w-48 border-l border-gray-200/50">Cấu hình</th>
              <th className="px-6 py-4 w-24 text-center border-l border-gray-200/50">Audio</th>
              <th className="px-6 py-4 w-32 text-right border-l border-gray-200/50">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-gray-400 italic bg-gray-50/50">
                   <div className="flex flex-col items-center">
                     <DocumentTextIcon className="h-10 w-10 opacity-20 mb-3"/>
                     Không tìm thấy dữ liệu phù hợp.
                   </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="group odd:bg-white even:bg-gray-50/50 hover:bg-emerald-50/40 transition-colors">
                  {/* TIME */}
                  <td className="px-6 py-3.5 align-top border-r border-gray-100 group-hover:border-emerald-100/30">
                    <div className="font-bold text-gray-800 text-xs">{new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</div>
                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">{new Date(log.timestamp).toLocaleDateString('vi-VN')}</div>
                  </td>
                  
                  {/* CONTENT */}
                  <td className="px-6 py-3.5 align-top">
                    <p className="font-medium text-gray-700 line-clamp-2 text-xs leading-relaxed" title={log.rawText}>
                      {log.rawText}
                    </p>
                    <div className="mt-2 flex gap-2">
                       <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${log.mode === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {log.mode}
                       </span>
                       <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-mono">
                          {log.duration.toFixed(1)}s
                       </span>
                    </div>
                  </td>

                  {/* CONFIG */}
                  <td className="px-6 py-3.5 align-top border-l border-gray-100 group-hover:border-emerald-100/30">
                    <div className="text-[10px] text-gray-500 font-mono bg-white border border-gray-200 px-2 py-1 rounded w-fit max-w-full truncate" title={log.configSummary}>
                       {log.configSummary}
                    </div>
                  </td>

                  {/* AUDIO */}
                  <td className="px-6 py-3.5 align-middle text-center border-l border-gray-100 group-hover:border-emerald-100/30">
                    {log.audioBlob ? (
                       <button 
                         onClick={() => handlePlay(log)}
                         className={`h-8 w-8 rounded-full flex items-center justify-center transition-all mx-auto shadow-sm
                           ${playingId === log.id 
                             ? 'bg-sqtt-primary text-white shadow-emerald-200 scale-110' 
                             : 'bg-white text-gray-500 border border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                           }`}
                       >
                          {playingId === log.id ? <StopIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4 ml-0.5" />}
                       </button>
                    ) : (
                       <span className="text-xs text-gray-300 italic">--</span>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-3.5 align-middle text-right border-l border-gray-100 group-hover:border-emerald-100/30">
                     <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onRebroadcast(log.rawText)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition" 
                          title="Phát lại"
                        >
                           <ArrowPathIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDownload(log)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition" 
                          title="Tải xuống"
                        >
                           <CloudArrowDownIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(log.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition" 
                          title="Xóa"
                        >
                           <TrashIcon className="h-4 w-4" />
                        </button>
                     </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* FOOTER */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-500 flex justify-between font-bold uppercase tracking-wider">
         <span>Tổng số bản ghi: {logs.length}</span>
         <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Local Storage Encrypted</span>
      </div>
    </div>
  );
};

export default HistoryLog;
