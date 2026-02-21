
import React, { useEffect, useState } from 'react';
import { getStats } from '../services/storageService';
import { DashboardStats } from '../types';
import { ChartBarIcon, ClockIcon, ServerIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

const Dashboard: React.FC<{ refreshTrigger: number }> = ({ refreshTrigger }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalChars: 0,
    totalDuration: 0,
    storageUsed: '0 KB'
  });

  useEffect(() => {
    const loadStats = async () => {
      const data = await getStats();
      setStats(data);
    };
    loadStats();
  }, [refreshTrigger]);

  const cards = [
    {
      label: 'Tổng Ký Tự',
      value: stats.totalChars.toLocaleString(),
      subValue: '+12% hiệu suất',
      icon: ChartBarIcon,
      bg: 'bg-white',
      accentColor: 'text-blue-600',
      accentBg: 'bg-blue-50',
      borderColor: 'border-blue-100'
    },
    {
      label: 'Thời Lượng (Giây)',
      value: stats.totalDuration.toFixed(1),
      subValue: 'Đã xử lý',
      icon: ClockIcon,
      bg: 'bg-white',
      accentColor: 'text-emerald-600',
      accentBg: 'bg-emerald-50',
      borderColor: 'border-emerald-100'
    },
    {
      label: 'Lưu Trữ Cục Bộ',
      value: stats.storageUsed,
      subValue: 'IndexedDB Secure',
      icon: ServerIcon,
      bg: 'bg-white',
      accentColor: 'text-purple-600',
      accentBg: 'bg-purple-50',
      borderColor: 'border-purple-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card, idx) => (
        <div 
          key={idx} 
          className={`relative overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-black/10 transition-all duration-300 p-6 group border ${card.borderColor}`}
        >
          {/* Decorative Background Blob */}
          <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${card.accentBg} opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
               <div className={`p-3 rounded-xl ${card.accentBg} ${card.accentColor} border border-white shadow-sm`}>
                  <card.icon className="h-6 w-6" />
               </div>
               <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${card.accentBg} ${card.accentColor} uppercase tracking-wide`}>
                  <ArrowTrendingUpIcon className="h-3 w-3" />
                  Realtime
               </span>
            </div>
            
            <div>
               <h3 className="text-3xl font-extrabold text-gray-800 tracking-tight mb-1">{card.value}</h3>
               <div className="flex items-center gap-2">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{card.label}</p>
                 <span className="text-[10px] text-gray-300">•</span>
                 <p className="text-xs font-medium text-gray-500">{card.subValue}</p>
               </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
