
import React from 'react';
import { ZapOff } from 'lucide-react';

interface PowerOutagePredictorProps {
  probability: number;
  reasoning: string;
}

const PowerOutagePredictor: React.FC<PowerOutagePredictorProps> = ({ probability, reasoning }) => {
  const getProbabilityColor = (p: number) => {
    if (p > 60) return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (p > 30) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  };

  const getCircleColor = (p: number) => {
    if (p > 60) return '#f87171'; // Red
    if (p > 30) return '#facc15'; // Yellow
    return '#34d399'; // Emerald
  };

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (probability / 100) * circumference;

  return (
    <div className={`p-6 rounded-2xl border ${getProbabilityColor(probability)} transition-all duration-500`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
            <ZapOff className="w-5 h-5" />
            Power Outage Risk
          </h3>
          <p className="text-sm opacity-80">Grid stability forecast</p>
        </div>
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
      </div>
      <p className="text-sm leading-relaxed font-medium">
        {reasoning || "Grid conditions appear stable."}
      </p>
    </div>
  );
};

export default PowerOutagePredictor;
