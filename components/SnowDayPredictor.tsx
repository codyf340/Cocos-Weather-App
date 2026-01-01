
import React from 'react';
import { CalendarOff } from 'lucide-react';

interface SnowDayPredictorProps {
  probability: number;
  reasoning: string;
}

const SnowDayPredictor: React.FC<SnowDayPredictorProps> = ({ probability, reasoning }) => {
  const isSchoolClosed = reasoning.toLowerCase().includes('closed') || 
                        reasoning.toLowerCase().includes('weekend') ||
                        reasoning.toLowerCase().includes('holiday') ||
                        reasoning.toLowerCase().includes('march break') ||
                        reasoning.toLowerCase().includes('christmas');

  const getProbabilityColor = (p: number) => {
    if (isSchoolClosed) return 'text-slate-400 bg-slate-800/50 border-slate-700';
    if (p > 70) return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (p > 40) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    return 'text-green-400 bg-green-400/10 border-green-400/20';
  };

  const getCircleColor = (p: number) => {
    if (isSchoolClosed) return '#94a3b8'; // Slate-400
    if (p > 70) return '#f87171';
    if (p > 40) return '#fb923c';
    return '#4ade80';
  };

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (probability / 100) * circumference;

  return (
    <div className={`p-6 rounded-2xl border ${getProbabilityColor(probability)} transition-all duration-500`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
            {isSchoolClosed && <CalendarOff className="w-5 h-5" />}
            Snow Day Predictor
          </h3>
          <p className="text-sm opacity-80">Odds for the next school day</p>
        </div>
        {!isSchoolClosed ? (
          <div className="relative flex items-center justify-center">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="opacity-20"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke={getCircleColor(probability)}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute text-lg font-bold">{probability}%</span>
          </div>
        ) : (
          <div className="bg-slate-700/50 p-3 rounded-full">
            <CalendarOff className="w-8 h-8 text-slate-400" />
          </div>
        )}
      </div>
      <p className="text-sm leading-relaxed font-medium">
        {reasoning || "Analyzing current data for potential cancellations..."}
      </p>
    </div>
  );
};

export default SnowDayPredictor;
