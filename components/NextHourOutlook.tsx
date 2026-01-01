
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
  const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 shadow-xl">
      {/* Header */}
      <p className="text-center font-bold text-lg mb-4">{data.summary}</p>
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
        {/* Left side: Current condition */}
        <div className="flex items-center gap-3">
          <WeatherIcon condition={currentCondition} className="w-12 h-12 text-slate-300" />
          <div>
            <p className="text-sm text-slate-400">{timeString}</p>
            <p className="font-bold text-lg">{currentCondition}</p>
          </div>
        </div>
        {/* Right side: Temp */}
        <div className="text-right">
          <p className="text-4xl font-bold">{currentTemp}°c</p>
          <p className="text-sm text-slate-400">RealFeel® {feelsLike}°</p>
        </div>
      </div>
      
      {/* Graph */}
      <PrecipitationGraph data={data.data} />
    </div>
  );
};

export default NextHourOutlook;
