
import React from 'react';
import { HourlyForecast } from '../types';
import WeatherIcon from './WeatherIcon';
import { Clock, Umbrella } from 'lucide-react';

interface HourlyForecastProps {
  data: HourlyForecast[];
}

const HourlyForecastComponent: React.FC<HourlyForecastProps> = ({ data }) => {
  return (
    <div className="glass-panel rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl"></div>
      <h3 className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">
        <Clock className="w-4 h-4" /> 24-Hour Chronological Sequence
      </h3>
      <div className="flex overflow-x-auto space-x-5 pb-6 no-scrollbar snap-x snap-mandatory">
        {data.map((hour, idx) => (
          <div key={idx} className="flex-shrink-0 w-32 glass-card rounded-3xl p-6 flex flex-col items-center text-center snap-start">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{hour.time}</p>
            <WeatherIcon condition={hour.condition} className="w-10 h-10 text-white mb-4 drop-shadow-lg" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter h-8 flex items-center mb-2">{hour.condition}</p>
            <p className="text-2xl font-black text-white mb-3">{hour.temp}°</p>
            <div className="h-5">
              {hour.precipProb > 10 && (
                <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-400">
                  <Umbrella className="w-3 h-3" />
                  <span>{hour.precipProb}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HourlyForecastComponent;
