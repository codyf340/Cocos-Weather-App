
import React from 'react';
import { Car, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { RoadConditions } from '../types';

const RoadConditions: React.FC<RoadConditions> = ({ status, summary }) => {
  const getConditionConfig = (s: RoadConditions['status']) => {
    switch (s) {
      case 'Good':
        return {
          color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
        };
      case 'Fair':
        return {
          color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
          icon: <AlertTriangle className="w-8 h-8 text-yellow-400" />,
        };
      case 'Poor':
        return {
          color: 'text-red-400 bg-red-400/10 border-red-400/20',
          icon: <AlertTriangle className="w-8 h-8 text-red-400" />,
        };
      default:
        return {
          color: 'text-slate-400 bg-slate-800/50 border-slate-700',
          icon: <Car className="w-8 h-8 text-slate-400" />,
        };
    }
  };

  const config = getConditionConfig(status);

  return (
    <div className={`p-6 rounded-2xl border ${config.color} transition-all duration-500`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
            <Car className="w-5 h-5" />
            Road Conditions
          </h3>
          <p className="text-sm opacity-80">Latest travel advisory</p>
        </div>
        <div className="bg-slate-900/20 p-3 rounded-full border border-white/5">
          {config.icon}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-2xl font-black">{status}</p>
        <p className="text-sm leading-relaxed font-medium flex-1">
          {summary || "Could not retrieve road condition data."}
        </p>
      </div>
    </div>
  );
};

export default RoadConditions;
