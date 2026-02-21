
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TTSConverter from './components/TTSConverter';
import HistoryLog from './components/HistoryLog';
import VoiceLab from './components/VoiceLab';
import AiConfigPanel from './components/AiConfigPanel';
import LectureLibrary from './components/LectureLibrary';
import { MagnifyingGlassIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tts');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [prefillText, setPrefillText] = useState('');

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Clear prefill text when manually navigating so we don't accidentally reload old scripts
    setPrefillText('');
  };

  const handleUseScript = (text: string) => {
     setPrefillText(text);
     setActiveTab('tts');
  };

  return (
    <div className="flex min-h-screen bg-dot-pattern text-gray-100 font-sans selection:bg-emerald-500 selection:text-white">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      
      <main className="ml-72 flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Professional Header - Floating/Glass Style */}
        <header className="h-20 flex-shrink-0 px-8 flex justify-between items-center z-40 sticky top-0">
           {/* Background blur overlay for header only when scrolling (optional, here static) */}
           <div className="absolute inset-0 bg-[#0B6E4F]/90 backdrop-blur-md border-b border-white/10 z-0"></div>

           <div className="relative z-10 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-white/10 text-white border border-white/10 shadow-sm">
                 <Bars3BottomLeftIcon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                 <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
                    Trung Tâm Điều Hành
                 </h1>
                 <p className="text-[11px] text-emerald-200 font-medium tracking-wide">
                    Hệ thống đang hoạt động ổn định
                 </p>
              </div>
           </div>

           <div className="relative z-10 flex items-center gap-4">
              {/* Search Bar - High Contrast Professional */}
              <div className="relative hidden md:block group">
                 <input 
                   type="text" 
                   placeholder="Tìm kiếm nhanh (Ctrl+K)..." 
                   className="bg-black/20 border border-white/10 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:bg-white focus:text-gray-900 focus:border-white focus:ring-2 focus:ring-white/20 outline-none w-72 transition-all text-white placeholder-emerald-200/60 shadow-inner"
                 />
                 <MagnifyingGlassIcon className="h-5 w-5 text-emerald-200 absolute left-3 top-2.5 group-focus-within:text-gray-500 transition-colors" />
              </div>
           </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
           <div className="max-w-7xl mx-auto h-full pb-10">
              {activeTab === 'tts' && (
                <div className="animate-slide-up space-y-8">
                   <Dashboard refreshTrigger={refreshTrigger} />
                   <TTSConverter onConversionComplete={triggerRefresh} externalText={prefillText} />
                   <div className="pt-8 border-t border-white/10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-1 w-1 bg-emerald-400 rounded-full"></div>
                        <h3 className="text-xs font-bold text-emerald-100 uppercase tracking-widest">Hoạt động gần đây</h3>
                      </div>
                      <HistoryLog refreshTrigger={refreshTrigger} onRebroadcast={handleUseScript} />
                   </div>
                </div>
              )}

              {activeTab === 'voice-lab' && (
                 <div className="animate-slide-up h-full">
                    <VoiceLab />
                 </div>
              )}

              {activeTab === 'library' && (
                 <div className="animate-slide-up h-full">
                    <LectureLibrary onUseScript={handleUseScript} />
                 </div>
              )}

              {activeTab === 'config' && (
                 <div className="animate-slide-up h-full">
                    <AiConfigPanel />
                 </div>
              )}
              
              {activeTab === 'history' && (
                 <div className="animate-slide-up h-full flex flex-col">
                    <HistoryLog refreshTrigger={refreshTrigger} onRebroadcast={handleUseScript} />
                 </div>
              )}
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;
