
import React from 'react';
import { SignificantWeatherEvent } from '../types';
import { ShieldCheck, CloudLightning, CloudSnow, Wind, AlertTriangle, CloudSun } from 'lucide-react';

interface SignificantWeatherOutlookProps {
  events: SignificantWeatherEvent[];
}

const SignificantWeatherOutlook: React.FC<SignificantWeatherOutlookProps> = ({ events }) => {

  const getEventStyle = (severity: SignificantWeatherEvent['severity']) => {
    switch (severity) {
      case 'High':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
          textColor: 'text-red-300',
          bgColor: 'bg-red-900/30'
        };
      case 'Moderate':
        return {
          icon: <CloudLightning className="w-5 h-5 text-orange-400" />,
          textColor: 'text-orange-300',
          bgColor: 'bg-orange-900/30'
        };
      case 'None':
      default:
        return {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
          textColor: 'text-slate-400',
          bgColor: 'bg-slate-800/30'
        };
    }
  };
  
  // Create a placeholder array if events are not yet loaded or empty
  const displayEvents = (events && events.length > 0) 
    ? events.slice(0, 5) 
    : Array.from({ length: 5 }).map((_, i) => ({
        day: `Day ${i + 1}`,
        severity: 'None' as 'None',
        description: '...'
      }));


  return (
    <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 shadow-xl">
      <h3 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
        <CloudSun className="w-4 h-4 text-slate-500" />
        5-Day Significant Weather Outlook
      </h3>
      <div className="space-y-3">
        {displayEvents.map((event, idx) => {
          const { icon, textColor, bgColor } = getEventStyle(event.severity);
          return (
            <div key={idx} className={`flex items-center gap-4 p-3 rounded-lg ${bgColor}`}>
              <div className="flex-shrink-0">
                {icon}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-slate-200">{event.day}</p>
              </div>
              <div className="flex-1 text-right">
                <p className={`font-semibold text-sm ${textColor}`}>{event.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SignificantWeatherOutlook;
