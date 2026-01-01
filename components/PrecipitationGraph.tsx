
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { MinuteCastEntry } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PRECIPITATION_COLORS = {
  rain: ['#fde047', '#fb923c', '#ef4444'], // yellow-300, orange-400, red-500
  snow: ['#7dd3fc', '#3b82f6', '#1d4ed8'], // sky-300, blue-500, blue-700
  ice: ['#f9a8d4', '#d946ef', '#7e22ce'],  // pink-300, fuchsia-500, purple-700
  mix: ['#c4b5fd', '#a78bfa', '#7c3aed'],  // violet-300, violet-400, violet-600
};

const getColor = (type: MinuteCastEntry['type'], intensity: number): string => {
  if (type === 'none' || intensity === 0) return 'transparent';
  const colorSet = PRECIPITATION_COLORS[type];
  if (intensity > 0.66) return colorSet[2];
  if (intensity > 0.33) return colorSet[1];
  return colorSet[0];
};

const LegendItem: React.FC<{ type: keyof typeof PRECIPITATION_COLORS, name: string }> = ({ type, name }) => (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{name}</span>
      {PRECIPITATION_COLORS[type].map(color => (
        <div key={color} style={{ backgroundColor: color }} className="w-3 h-3 rounded-full"></div>
      ))}
    </div>
);

const PrecipitationGraph: React.FC<{ data: MinuteCastEntry[] }> = ({ data }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: true });

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Return 60 empty points for layout purposes if no data is present.
      return Array.from({ length: 60 }, () => ({
        time: '',
        intensity: 0,
        type: 'none' as 'none',
      }));
    }
    // Trust the API provides minute-by-minute data and use it directly.
    return data.slice(0, 60);
  }, [data]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  const checkScrollability = () => {
    const el = scrollContainerRef.current;
    if (el) {
        const atStart = el.scrollLeft < 10;
        const atEnd = el.scrollWidth - el.scrollLeft - el.clientWidth < 10;
        setCanScroll({ left: !atStart, right: !atEnd });
    }
  }

  useEffect(() => {
    const el = scrollContainerRef.current;
    checkScrollability();
    el?.addEventListener('scroll', checkScrollability);
    window.addEventListener('resize', checkScrollability);
    return () => {
        el?.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
    }
  }, []);

  return (
    <div className="relative">
      {/* Scroll Buttons */}
      <button 
        onClick={() => handleScroll('left')} 
        className={`absolute top-1/2 -translate-y-1/2 -left-3 z-10 p-1 rounded-full bg-slate-700/50 hover:bg-slate-600 disabled:opacity-0 disabled:pointer-events-none transition-all`}
        disabled={!canScroll.left}
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button 
        onClick={() => handleScroll('right')} 
        className={`absolute top-1/2 -translate-y-1/2 -right-3 z-10 p-1 rounded-full bg-slate-700/50 hover:bg-slate-600 disabled:opacity-0 disabled:pointer-events-none transition-all`}
        disabled={!canScroll.right}
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Graph Area */}
      <div className="flex gap-4">
        <div className="flex flex-col justify-between text-xs text-slate-400 font-medium h-28 py-1">
          <span>Heavy</span>
          <span>Light</span>
        </div>
        <div ref={scrollContainerRef} className="flex-1 overflow-x-auto no-scrollbar relative h-28 border-b-2 border-l-2 border-slate-700">
          <div className="flex items-end h-full w-max">
            {chartData.map((entry, minute) => (
                <div key={minute} className="w-2.5 h-full flex flex-col justify-end items-center relative">
                   <div 
                     className="w-1.5 rounded-t"
                     style={{ 
                         height: `${entry.intensity * 100}%`,
                         backgroundColor: getColor(entry.type, entry.intensity),
                         transition: 'height 0.3s ease, background-color 0.3s ease',
                         minHeight: entry.intensity > 0 ? '2px' : '0'
                     }}
                   ></div>
                   {entry.time && (
                     <div className="absolute -bottom-5 text-[10px] text-slate-500 font-bold whitespace-nowrap">
                       {entry.time}
                     </div>
                   )}
                </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-slate-300">
        <LegendItem type="rain" name="Rain" />
        <LegendItem type="snow" name="Snow" />
        <LegendItem type="ice" name="Ice" />
        <LegendItem type="mix" name="Mix" />
      </div>
    </div>
  );
};

export default PrecipitationGraph;
