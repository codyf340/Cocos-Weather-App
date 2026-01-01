
import React from 'react';
import { Map } from 'lucide-react';

interface WeatherRadarProps {
  lat: number;
  lon: number;
  cityName: string;
}

const WeatherRadar: React.FC<WeatherRadarProps> = ({ lat, lon, cityName }) => {
  const zoom = 7;
  // RainViewer embed URL customized for dark theme, animated radar, and specified location.
  const radarUrl = `https://www.rainviewer.com/map.html?loc=${lat},${lon},${zoom}&oFa=0&oFC=0&oU=0&oCS=1&oF=0&oAP=1&c=3&o=83&lm=1&layer=radar&sm=1&sn=1&l=1&lng=en&d=1&h=1`;

  return (
    <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 shadow-xl h-[450px] flex flex-col">
      <h3 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex-shrink-0">
        <Map className="w-4 h-4 text-slate-500" />
        Live Weather Radar
      </h3>
      <div className="flex-grow rounded-2xl overflow-hidden border border-slate-700/50">
        <iframe
          key={cityName} // Using key ensures the iframe reloads when the city changes
          src={radarUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
          title={`Live Weather Radar for ${cityName}`}
        ></iframe>
      </div>
    </div>
  );
};

// Memoize the component to prevent the iframe from reloading on every re-render of the parent
export default React.memo(WeatherRadar);
