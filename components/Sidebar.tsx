
import React from 'react';
import { 
  MicrophoneIcon, 
  BookOpenIcon, 
  Cog6ToothIcon, 
  ClockIcon, 
  ShieldCheckIcon,
  FingerPrintIcon,
  SignalIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'tts', label: 'Console Phát Thanh', sub: 'Chuyển đổi văn bản', icon: MicrophoneIcon },
    { id: 'voice-lab', label: 'Phòng Thu Giọng', sub: 'Huấn luyện & Clone AI', icon: FingerPrintIcon },
    { id: 'library', label: 'Thư Viện Kịch Bản', sub: 'Mẫu bài giảng', icon: BookOpenIcon },
    { id: 'history', label: 'Nhật Ký Hoạt Động', sub: 'Lịch sử phát thanh', icon: ClockIcon },
    { id: 'config', label: 'Cấu Hình Hệ Thống', sub: 'Kết nối AI Engine', icon: Cog6ToothIcon },
  ];

  return (
    <div className="w-72 h-screen flex flex-col bg-white border-r border-gray-200 fixed left-0 top-0 z-50 shadow-2xl shadow-gray-900/10">
      {/* Brand Section */}
      <div className="h-24 flex items-center px-8 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
        <div className="flex items-center gap-3.5">
           <div className="relative">
             <div className="h-11 w-11 rounded-2xl bg-[#0B6E4F] flex items-center justify-center text-white shadow-lg shadow-emerald-900/20 transform hover:scale-105 transition-transform duration-300">
                <ShieldCheckIcon className="h-6 w-6" />
             </div>
             <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
               <div className="bg-emerald-500 h-2.5 w-2.5 rounded-full animate-pulse"></div>
             </div>
           </div>
           <div>
              <h1 className="font-extrabold text-xl tracking-tight text-gray-800 leading-none">SQTT<span className="text-[#0B6E4F]">.AI</span></h1>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest mt-1 uppercase">Desktop Pro</p>
           </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-8 px-5 space-y-2">
        <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest px-4 mb-4 flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
           Chức năng chính
        </div>
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden
                    ${isActive 
                      ? 'bg-[#0B6E4F] text-white shadow-lg shadow-emerald-700/30 translate-x-1' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  )}
                  <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'text-white scale-110' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <div className="text-left flex-1">
                    <div className={`font-bold text-sm tracking-wide ${isActive ? 'text-white' : 'text-gray-700'}`}>{item.label}</div>
                    <div className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-emerald-100' : 'text-gray-400'}`}>{item.sub}</div>
                  </div>
                  {isActive && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer System Status (Replaces User Profile) */}
      <div className="p-6 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
           <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trạng thái hệ thống</span>
              <SignalIcon className="h-3 w-3 text-[#0B6E4F]" />
           </div>
           
           <div className="flex items-center gap-3">
              <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                 <div className="absolute top-0 left-0 h-full w-[98%] bg-[#0B6E4F] rounded-full"></div>
              </div>
              <span className="text-xs font-bold text-[#0B6E4F]">98%</span>
           </div>
           
           <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 border border-emerald-100">
                 <div className="h-1.5 w-1.5 rounded-full bg-[#0B6E4F] animate-pulse"></div>
                 <span className="text-[10px] font-bold text-emerald-800">Online</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">v1.1.0</span>
           </div>
        </div>
        
        <div className="mt-4 text-center">
           <p className="text-[9px] text-gray-300 font-medium">© 2025 SQTT MILITARY BROADCAST</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
