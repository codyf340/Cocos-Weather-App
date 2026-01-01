
import React from 'react';
import { HourlyForecast } from '../types';
import WeatherIcon from './WeatherIcon';
import { Clock, Umbrella } from 'lucide-react';

interface HourlyForecastProps {
  data: HourlyForecast[];
}

const HourlyForecastComponent: React.FC<HourlyForecastProps> = ({ data }) => {
  return (
    <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 shadow-xl">
      <h3 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
        <Clock className="w-4 h-4 text-slate-500" />
        24-Hour Forecast
      </h3>
      <div className="flex overflow-x-auto space-x-4 pb-4 no-scrollbar">
        {data.map((hour, idx) => (
          <div key={idx} className="flex-shrink-0 w-24 bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center transition-all hover:bg-white/10 hover:border-white/10">
            <p className="text-sm font-bold text-slate-400 uppercase mb-2">{hour.time}</p>
            <WeatherIcon condition={hour.condition} className="w-8 h-8 text-white mb-2" />
            <p className="text-xs text-slate-300 font-medium mb-2 h-8 flex items-center justify-center">{hour.condition}</p>
            <p className="text-lg font-black text-slate-100 mb-2">{hour.temp}°</p>
            {hour.precipProb > 10 ? (
               <div className="flex items-center gap-1 text-xs text-blue-300 font-medium">
                 <Umbrella className="w-3 h-3" />
                 <span>{hour.precipProb}%</span>
               </div>
            ) : <div className="h-[18px]"></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HourlyForecastComponent;
