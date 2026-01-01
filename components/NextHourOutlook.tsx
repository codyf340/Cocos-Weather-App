
import React from 'react';
import { MinuteCastData } from '../types';
import WeatherIcon from './WeatherIcon';
import PrecipitationGraph from './PrecipitationGraph';

interface NextHourOutlookProps {
  data: MinuteCastData;
  currentTemp: number;
  feelsLike: number;
  currentCondition: string;
}

const NextHourOutlook: React.FC<NextHourOutlookProps> = ({ data, currentTemp, feelsLike, currentCondition }) => {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="glass-panel rounded-[2.5rem] p-10 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-red-600/5 blur-[100px]"></div>
      
      <div className="relative z-10 flex flex-col gap-10">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <div className="p-5 rounded-[2rem] bg-white/5 border border-white/10">
              <WeatherIcon condition={currentCondition} className="w-12 h-12 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">System Time: {timeString}</p>
              <h4 className="text-2xl font-extrabold text-white tracking-tight">{currentCondition}</h4>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-5xl font-black text-white leading-none mb-2">{currentTemp}°C</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Atmospheric RealFeel® {feelsLike}°</p>
          </div>
        </div>

        <div className="space-y-8">
           <div className="flex items-center gap-4">
             <div className="h-px bg-red-600 w-12"></div>
             <p className="text-sm font-bold text-slate-200 tracking-tight">{data.summary}</p>
           </div>
           <PrecipitationGraph data={data.data} />
        </div>
      </div>
    </div>
  );
};

export default NextHourOutlook;
