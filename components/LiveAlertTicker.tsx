import React from 'react';
import { WeatherAlert } from '../types';
import { Radio, CheckCircle2 } from 'lucide-react';

interface LiveAlertTickerProps {
  alerts: WeatherAlert[];
  lastUpdated: string;
}

const LiveAlertTicker: React.FC<LiveAlertTickerProps> = ({ alerts, lastUpdated }) => {
  const hasAlerts = alerts && alerts.length > 0;

  if (!hasAlerts) {
    return (
      <div className="group mb-8 block bg-gradient-to-r from-emerald-900/80 to-slate-900 rounded-2xl border border-emerald-500/30 shadow-lg overflow-hidden transition-all">
        <div className="flex items-center">
          <div className="bg-emerald-600 px-4 py-3 self-stretch flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span className="text-white text-xs font-black uppercase tracking-widest">All Clear</span>
          </div>
          <div className="px-6 py-2">
             <p className="text-sm font-medium text-slate-200">No active weather warnings from Environment Canada.</p>
             <p className="text-[10px] text-slate-400 font-mono">Last checked: {lastUpdated}</p>
          </div>
        </div>
      </div>
    );
  }
  
  const renderAlertContent = (alert: WeatherAlert) => (
    <span className="flex items-center">
      <span className={`font-bold text-red-300 mr-2`}>
        {alert.severity.toUpperCase()}
      </span>
      <span className="text-slate-100">{alert.title}</span>
    </span>
  );

  return (
    <a href="#alerts-section" className="group mb-8 block bg-gradient-to-r from-red-900 via-red-800 to-slate-900 rounded-2xl border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)] overflow-hidden cursor-pointer hover:border-red-400 transition-all">
      <div className="flex items-center">
        <div className="bg-red-600 px-4 py-3 self-stretch flex items-center gap-2">
          <Radio className="w-5 h-5 text-white animate-pulse" />
          <span className="text-white text-xs font-black uppercase tracking-widest">Live Alert</span>
        </div>
        <div className="relative flex-1 h-full overflow-hidden">
            <div className="flex animate-marquee-fast whitespace-nowrap">
                {/* Render items twice for seamless loop */}
                {alerts.map((alert, index) => (
                  <div key={`a-${index}`} className="mx-6 text-sm flex items-center">
                    {renderAlertContent(alert)}
                    <span className="text-red-500 mx-6">|</span>
                  </div>
                ))}
                {alerts.map((alert, index) => (
                  <div key={`b-${index}`} className="mx-6 text-sm flex items-center">
                    {renderAlertContent(alert)}
                    <span className="text-red-500 mx-6">|</span>
                  </div>
                ))}
            </div>
        </div>
      </div>
    </a>
  );
};

export default LiveAlertTicker;