
import React from 'react';
import { CalendarOff, GraduationCap } from 'lucide-react';

interface SnowDayPredictorProps {
  probability: number;
  reasoning: string;
}

const SnowDayPredictor: React.FC<SnowDayPredictorProps> = ({ probability, reasoning }) => {
  const isSchoolClosed = reasoning.toLowerCase().includes('closed') || 
                        reasoning.toLowerCase().includes('weekend') ||
                        reasoning.toLowerCase().includes('holiday') ||
                        reasoning.toLowerCase().includes('break') ||
                        reasoning.toLowerCase().includes('christmas');

  const getTheme = (p: number) => {
    if (isSchoolClosed) return { color: 'text-slate-500', stroke: '#334155', bg: 'bg-slate-900/40', border: 'border-white/5' };
    if (p > 70) return { color: 'text-red-500', stroke: '#ef4444', bg: 'bg-red-950/20', border: 'border-red-500/20' };
    if (p > 40) return { color: 'text-amber-500', stroke: '#f59e0b', bg: 'bg-amber-950/20', border: 'border-amber-500/20' };
    return { color: 'text-emerald-500', stroke: '#10b981', bg: 'bg-emerald-950/20', border: 'border-emerald-500/20' };
  };

  const theme = getTheme(probability);
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (probability / 100) * circumference;

  return (
    <div className={`p-8 rounded-[2.5rem] border ${theme.bg} ${theme.border} transition-all duration-500 glass-card`}>
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className={`w-4 h-4 ${theme.color}`} />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">CANCELLATION ANALYTICS</h3>
          </div>
          <h4 className="text-xl font-extrabold text-white tracking-tight">Snow Day Predictor</h4>
        </div>
        
        <div className="relative flex items-center justify-center">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke={theme.stroke}
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className={`absolute text-sm font-black text-white`}>{isSchoolClosed ? '--' : `${probability}%`}</span>
        </div>
      </div>
      
      <div className="p-5 rounded-2xl bg-black/20 border border-white/5">
        <p className="text-xs leading-relaxed font-medium text-slate-300 italic">
          "{reasoning || "Compiling regional meteorological reports for upcoming session..."}"
        </p>
      </div>
    </div>
  );
};

export default SnowDayPredictor;
