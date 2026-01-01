
import React from 'react';
import { PeriodOutlook } from '../types';
import { Sunrise, Sun, Moon, Sparkles } from 'lucide-react';

interface OutlookSummaryProps {
  outlooks: PeriodOutlook[];
}

const getPeriodIcon = (period: string) => {
  switch (period) {
    case 'Morning': return <Sunrise className="w-6 h-6 text-orange-400" />;
    case 'Afternoon': return <Sun className="w-6 h-6 text-yellow-400" />;
    case 'Overnight': return <Moon className="w-6 h-6 text-blue-400" />;
    default: return <Sparkles className="w-6 h-6 text-slate-400" />;
  }
};

const OutlookSummary: React.FC<OutlookSummaryProps> = ({ outlooks }) => {
  if (!outlooks || outlooks.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {outlooks.map((item, idx) => (
        <div key={idx} className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-5 hover:bg-slate-900/60 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
                {getPeriodIcon(item.period)}
              </div>
              <div>
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 leading-none">{item.period}</h4>
                <p className="text-[10px] text-slate-500 font-bold">{item.day}</p>
              </div>
            </div>
            <span className="text-xl font-black text-white">{item.temp}</span>
          </div>
          <p className="text-sm font-bold text-slate-200 mb-1">{item.condition}</p>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">{item.summary}</p>
        </div>
      ))}
    </div>
  );
};

export default OutlookSummary;
