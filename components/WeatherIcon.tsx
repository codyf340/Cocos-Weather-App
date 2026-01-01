
import React from 'react';
import { Cloud, CloudRain, CloudSnow, Sun } from 'lucide-react';

const WeatherIcon = ({ condition, className }: { condition: string, className?: string }) => {
  const cond = condition.toLowerCase();
  if (cond.includes('snow')) return <CloudSnow className={className} />;
  if (cond.includes('rain') || cond.includes('drizzle')) return <CloudRain className={className} />;
  if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('fog')) return <Cloud className={className} />;
  if (cond.includes('clear')) return <Sun className={className} />;
  return <Cloud className={className} />;
};

export default WeatherIcon;
