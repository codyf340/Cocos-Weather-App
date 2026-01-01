
import React from 'react';
import { Sparkles } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title, description }) => {
  return (
    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center text-center h-full opacity-60">
      <div className="p-3 bg-slate-800 rounded-full mb-4 border border-slate-700">
        <Sparkles className="w-8 h-8 text-slate-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-400 mb-1">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
      <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-2">Coming Soon</p>
    </div>
  );
};

export default ComingSoon;