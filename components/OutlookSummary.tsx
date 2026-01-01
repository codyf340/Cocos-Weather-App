
import React from 'react';
import { PeriodOutlook } from '../types';
import { Sunrise, Sun, Moon, Sparkles } from 'lucide-react';

interface OutlookSummaryProps {
  outlooks: PeriodOutlook[];
}

const getPeriodIcon = (period: string) => {
  switch (period) {
    case 'Morning': return <Sunrise className="w-5 h-5 text-orange-400" />;
    case 'Afternoon': return <Sun className="w-5 h-5 text-yellow-400" />;
    case 'Overnight': return <Moon className="w-5 h-5 text-blue-400" />;
    default: return <Sparkles className="w-5 h-5 text-slate-400" />;
  }
};

const OutlookSummary: React.FC<OutlookSummaryProps> = ({ outlooks }) => {
  if (!outlooks || outlooks.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4">
      {outlooks.map((item, idx) => (
        <div key={idx} className="glass-panel rounded-3xl p-6 hover:bg-white/[0.05] transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                {getPeriodIcon(item.period)}
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none mb-1">{item.period}</h4>
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{item.day}</p>
              </div>
            </div>
            <span className="text-xl font-black text-white group-hover:text-red-500 transition-colors">{item.temp}</span>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-white uppercase tracking-wider">{item.condition}</p>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{item.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OutlookSummary;
