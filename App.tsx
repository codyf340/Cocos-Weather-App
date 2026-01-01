
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWeatherForCity, CACHE_TTL } from './services/geminiService';
import { CityWeatherData, CityKey } from './types';
import SnowDayPredictor from './components/SnowDayPredictor';
import PowerOutagePredictor from './components/PowerOutagePredictor';
import RoadConditions from './components/RoadConditions';
import LiveAlertTicker from './components/LiveAlertTicker';
import WeatherIcon from './components/WeatherIcon';
import HourlyForecast from './components/HourlyForecast';
import GlobalAlertStatus from './components/GlobalAlertStatus';
import SignificantWeatherOutlook from './components/SignificantWeatherOutlook';
import WeatherRadar from './components/WeatherRadar';
import NextHourOutlook from './components/NextHourOutlook';
import OutlookSummary from './components/OutlookSummary';
import ComingSoon from './components/ComingSoon';

import { 
  Wind, 
  Droplets, 
  AlertTriangle, 
  RefreshCw,
  MapPin,
  ExternalLink,
  Zap,
  RotateCcw,
  Radio,
  Calendar,
  Clock,
  Database,
  Bell,
  Activity,
  Umbrella,
  ThermometerSun,
  ThermometerSnowflake,
  Cpu
} from 'lucide-react';

const cities: CityKey[] = ['Fredericton', 'Moncton', 'McGivney'];

const CITY_COORDINATES: Record<CityKey, { lat: number; lon: number }> = {
  Fredericton: { lat: 45.9636, lon: -66.6431 },
  Moncton: { lat: 46.0878, lon: -64.7782 },
  McGivney: { lat: 46.2501, lon: -66.3154 },
};

const getAlertConfig = (severity: string) => {
  const s = severity.toLowerCase();
  
  if (s === 'extreme') {
    return {
      wrapper: 'bg-red-950 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]',
      badge: 'bg-red-600 text-white shadow-lg shadow-red-500/50 animate-pulse',
      title: 'text-white',
      desc: 'text-red-100',
      iconColor: 'text-white'
    };
  }
  
  if (s === 'severe') {
    return {
      wrapper: 'bg-red-900/60 border-red-500/60',
      badge: 'bg-red-500 text-white',
      title: 'text-white',
      desc: 'text-red-100/90',
      iconColor: 'text-red-200'
    };
  }
  
  if (s === 'moderate') {
    return {
      wrapper: 'bg-orange-900/60 border-orange-500/60',
      badge: 'bg-orange-500 text-white',
      title: 'text-white',
      desc: 'text-orange-100/90',
      iconColor: 'text-orange-200'
    };
  }
  
  return {
    wrapper: 'bg-yellow-900/40 border-yellow-500/40',
    badge: 'bg-yellow-500 text-slate-900 font-bold',
    title: 'text-yellow-50',
    desc: 'text-yellow-100/80',
    iconColor: 'text-yellow-400'
  };
};

const App: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<CityKey>(cities[0]);
  const [weatherData, setWeatherData] = useState<Record<CityKey, CityWeatherData | null>>({
    Fredericton: null,
    Moncton: null,
    McGivney: null,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<{ type: string, message: string } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [globalAlertStatus, setGlobalAlertStatus] = useState<{ status: 'idle' | 'checking' | 'success' | 'error', lastChecked: string | null }>({ status: 'idle', lastChecked: null });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const sentAlertsRef = useRef<Set<string>>(new Set());

  const loadCityData = useCallback(async (city: CityKey, isManual: boolean = false) => {
    const existingData = weatherData[city];
    // Don't fetch if we have fresh, non-stale data, unless it's a manual refresh.
    if (existingData && !existingData.isStale && !isManual) {
      return;
    }

    if (isManual) {
      if (refreshing) return;
      setRefreshing(true);
    } else if (!existingData) {
      // Show full-page loader only if there's no data at all for this city.
      setLoading(true);
    }
    setGlobalAlertStatus(prev => ({ ...prev, status: 'checking' }));
    setError(null);

    try {
      const data = await fetchWeatherForCity(city, isManual);
      setWeatherData(prev => ({ ...prev, [city]: data }));
      
      setGlobalAlertStatus({
        status: 'success',
        lastChecked: new Date().toLocaleString('en-CA', {
          timeZone: 'America/Moncton',
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      });

      if (data.isStale) {
         setError({
          type: 'QUOTA_STALE',
          message: `Showing previously saved weather for ${city}. The API is currently busy.`
        });
      }

    } catch (err: any) {
       setGlobalAlertStatus(prev => ({ ...prev, status: 'error' }));
       const message = err.message || '';
       if (message === 'API_HTTP_ERROR') {
        setError({ type: 'PROXY', message: `The weather data service is temporarily unavailable. Please try refreshing.` });
      } else {
        setError({ type: 'GENERAL', message: `An unexpected error occurred while fetching data for ${city}.` });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weatherData, refreshing]);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    loadCityData(selectedCity, true);
  }, [loadCityData, selectedCity, refreshing]);

  // Effect for initial load and for when the selected city changes.
  useEffect(() => {
    loadCityData(selectedCity, false);
  }, [selectedCity, loadCityData]);
  
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const currentData = weatherData[selectedCity];
    if (currentData?.isStale && currentData.cacheTimestamp) {
      const remainingMs = CACHE_TTL - (Date.now() - currentData.cacheTimestamp);
      const remainingSeconds = Math.max(0, Math.round(remainingMs / 1000));
      
      setCountdown(remainingSeconds);

      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            handleRefresh();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(null);
    }

    return () => clearInterval(timer);
  }, [weatherData, selectedCity, handleRefresh]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isMonitoring) {
      // Refresh only the currently selected city.
      interval = setInterval(() => { loadCityData(selectedCity, true); }, 900000); // 15 minutes
    }
    return () => clearInterval(interval);
  }, [isMonitoring, selectedCity, loadCityData]);

  useEffect(() => {
    if (!isMonitoring) return;
    const currentCityData = weatherData[selectedCity];
    if (currentCityData?.alerts?.length) {
      currentCityData.alerts.forEach(alert => {
        const alertId = `${selectedCity}-${alert.title}-${currentCityData.lastUpdated}`;
        if (!sentAlertsRef.current.has(alertId)) {
          if (Notification.permission === 'granted') {
             new Notification(`⚠️ ${alert.severity} Weather Alert: ${selectedCity}`, {
              body: alert.title,
              icon: '/weather-icon.png'
            });
          }
          sentAlertsRef.current.add(alertId);
        }
      });
    }
  }, [weatherData, selectedCity, isMonitoring]);

  const handleToggleMonitoring = async () => {
    if (!('Notification' in window)) {
      alert("This browser does not support desktop notifications");
      return;
    }
    if (isMonitoring) {
      setIsMonitoring(false);
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setIsMonitoring(true);
      new Notification("Live Monitoring Active 📡", {
        body: "Big Coco's App will now poll for real-time weather updates."
      });
      loadCityData(selectedCity, true);
    } else {
      alert("Please allow notifications to enable Live Monitoring.");
    }
  };

  const currentData = weatherData[selectedCity];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <header className="sticky top-0 z-50 shadow-2xl">
        <div className="bg-red-600 text-white text-center py-2 font-bold text-lg tracking-wider">
          Big Coco's Weather App
        </div>
        <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
               <div className="flex items-center gap-2 text-[10px] text-red-400 font-bold uppercase tracking-wider">
                  <Database className="w-3 h-3" />
                  <span>Source: Open-Meteo &amp; Gemini</span>
               </div>
               {currentData?.aiStatus === 'rate_limited' && (
                 <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                   <Cpu className="w-3 h-3" />
                   <span>AI Limit Reached • Features Paused</span>
                 </div>
               )}
             </div>
            <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
              <div className="flex bg-slate-800 rounded-xl p-1 shadow-inner border border-slate-700/50 order-2 md:order-1">
                {cities.map((city) => (
                  <button key={city} onClick={() => setSelectedCity(city)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCity === city ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>{city}</button>
                ))}
              </div>
              <div className="flex gap-2 order-1 md:order-2 w-full md:w-auto justify-end">
                <button onClick={handleToggleMonitoring} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-bold shadow-lg ${isMonitoring ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20 animate-pulse' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'}`} title={isMonitoring ? "Stop Live Monitoring" : "Start Live Monitoring (Auto-Refresh + Alerts)"}>
                  {isMonitoring ? (<><Activity className="w-4 h-4 animate-spin" /><span className="hidden sm:inline">Live Monitor ON</span></>) : (<><Bell className="w-4 h-4" /><span className="hidden sm:inline">Start Live Monitor</span></>)}
                </button>
                <button onClick={handleRefresh} disabled={loading || refreshing} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl border border-slate-700 transition-all disabled:opacity-50 text-sm font-bold text-slate-300 hover:text-white">
                  <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <GlobalAlertStatus status={globalAlertStatus.status} lastChecked={globalAlertStatus.lastChecked} />

      <main className="max-w-6xl mx-auto px-4 pt-8">
        {error && (
          <div className={`mb-8 p-4 rounded-2xl border flex flex-col gap-4 transition-all ${
            error.type === 'PROXY' ? 'bg-orange-500/10 border-orange-500/20 text-orange-200' :
            error.type === 'QUOTA_STALE' ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 
            'bg-red-500/10 border-red-500/20 text-red-200'
          }`}>
            <div className="flex items-center gap-4">
              <AlertTriangle className={`w-8 h-8 shrink-0 ${error.type === 'PROXY' ? 'text-orange-500' : error.type === 'QUOTA_STALE' ? 'text-amber-500' : 'text-red-500'}`} />
              <div className="flex-1">
                <h3 className="font-bold">{
                  error.type === 'PROXY' ? 'Connection Unstable' : 
                  error.type === 'QUOTA_STALE' ? 'API Busy (Using Saved Data)' : 'System Alert'
                }</h3>
                <p className="text-sm opacity-80">{error.message}</p>
              </div>
              <button onClick={handleRefresh} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold self-start">
                {error.type === 'QUOTA_STALE' ? 'Refresh Now' : 'Try Again'}
              </button>
            </div>
            {error.type === 'QUOTA_STALE' && countdown !== null && (
              <div className="flex items-center gap-3 px-2">
                <div className="w-full bg-slate-900/50 rounded-full h-2 border border-slate-700/50 overflow-hidden"><div className="bg-amber-500 h-full rounded-full" style={{ width: `${(countdown / (CACHE_TTL / 1000)) * 100}%`, transition: 'width 1s linear' }}></div></div>
                <p className="text-xs font-mono font-bold text-amber-300 whitespace-nowrap">{Math.floor(countdown / 60)}:{('0' + (countdown % 60)).slice(-2)}</p>
              </div>
            )}
          </div>
        )}

        {loading && !weatherData[selectedCity] ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-12 h-12 text-red-500 animate-spin" />
            <p className="text-slate-400 font-medium">Fetching weather for {selectedCity}...</p>
          </div>
        ) : currentData ? (
          <div className="space-y-8">
            <LiveAlertTicker alerts={currentData.alerts} lastUpdated={currentData.lastUpdated} />

            {/* Current Conditions Module */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-700/50">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-red-500" />
                                <div>
                                    <h2 className="text-2xl font-bold">{currentData.cityName}</h2>
                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5"><Radio className="w-3 h-3" /> {currentData.stationName}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {isMonitoring && (<div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>LIVE</div>)}
                                {currentData.isStale && (<div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 bg-amber-500/20 text-amber-400"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" />Cached</div>)}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                           <WeatherIcon condition={currentData.condition} className="w-24 h-24 text-red-400" />
                           <div>
                              <p className="text-7xl md:text-8xl font-black tracking-tighter">{currentData.currentTemp}°</p>
                              <p className="text-lg font-bold text-slate-300 -mt-2">Feels like {currentData.feelsLike}°</p>
                           </div>
                        </div>
                    </div>
                    <div className="w-full md:w-auto grid grid-cols-2 md:grid-cols-1 gap-4 text-sm md:text-right">
                        <p className="text-2xl font-semibold text-slate-200 col-span-2 md:col-span-1">{currentData.condition}</p>
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 justify-end"><p className="font-bold">{currentData.high}°</p><p className="text-slate-400">High</p><ThermometerSun className="w-5 h-5 text-red-400" /></div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 justify-end"><p className="font-bold">{currentData.low}°</p><p className="text-slate-400">Low</p><ThermometerSnowflake className="w-5 h-5 text-blue-400" /></div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 justify-end"><p className="font-bold">{currentData.humidity}%</p><p className="text-slate-400">Humidity</p><Droplets className="w-5 h-5 text-blue-400" /></div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 justify-end"><p className="font-bold">{currentData.windSpeed} <span className="text-xs text-slate-400">km/h</span></p><p className="text-slate-400">Wind</p><Wind className="w-5 h-5 text-slate-400" /></div>
                    </div>
                </div>
            </div>

            <OutlookSummary outlooks={currentData.periodOutlooks} />
            
            {currentData.minuteCast && (
              <NextHourOutlook 
                data={currentData.minuteCast}
                currentTemp={currentData.currentTemp}
                feelsLike={currentData.feelsLike}
                currentCondition={currentData.condition}
              />
            )}

            <HourlyForecast data={currentData.hourly} />

            {/* 7-Day & Significant Outlook */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-900/50 rounded-3xl p-6 border border-slate-800 shadow-xl">
                    <h3 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4"><Calendar className="w-4 h-4 text-slate-500" />7-Day Forecast</h3>
                    <div className="space-y-2">
                        {currentData.daily.map((day, idx) => (
                          <div key={idx} className="grid grid-cols-4 md:grid-cols-5 items-center p-2 rounded-lg hover:bg-white/5 transition-all">
                              <p className="font-bold text-slate-200 col-span-1 md:col-span-2">{day.day}</p>
                              <div className="flex items-center gap-2 text-slate-300">
                                <WeatherIcon condition={day.condition} className="w-6 h-6" />
                                <span className="text-xs hidden md:block">{day.condition}</span>
                              </div>
                              {day.precipProb > 15 && <div className="flex items-center gap-1 text-xs font-bold text-blue-300"><Umbrella className="w-3 h-3" />{day.precipProb}%</div>}
                              <div className="flex items-center gap-3 justify-end ml-auto col-start-4 md:col-start-5">
                                <p className="font-bold text-base">{day.high}°</p>
                                <p className="font-medium text-base text-slate-400">{day.low}°</p>
                              </div>
                          </div>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-2">
                  <SignificantWeatherOutlook events={currentData.significantWeather} />
                </div>
            </div>

            {/* Predictors & Conditions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SnowDayPredictor probability={currentData.snowDayProbability} reasoning={currentData.snowDayReasoning} />
                <PowerOutagePredictor probability={currentData.powerOutageProbability} reasoning={currentData.powerOutageReasoning} />
                <ComingSoon title="Thunderstorm Outlook" description="Advanced storm cell prediction" />
                {currentData.roadConditions && <RoadConditions status={currentData.roadConditions.status} summary={currentData.roadConditions.summary} />}
            </div>

            <WeatherRadar lat={CITY_COORDINATES[selectedCity].lat} lon={CITY_COORDINATES[selectedCity].lon} cityName={selectedCity} />
            
            {/* Alerts & Verification */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div id="alerts-section" className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1"><AlertTriangle className="w-4 h-4 text-red-500" />Alerts & Warnings</h3>
                  {currentData.alerts?.length > 0 ? (
                    currentData.alerts.map((alert, idx) => {
                      const style = getAlertConfig(alert.severity);
                      return (
                        <div key={idx} className={`${style.wrapper} border p-5 rounded-2xl transition-all`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`${style.badge} text-[10px] uppercase px-3 py-1 rounded-full tracking-wider font-bold flex items-center gap-1`}>{alert.severity === 'Extreme' && <AlertTriangle className="w-3 h-3" />} {alert.severity}</span>
                            <AlertTriangle className={`w-5 h-5 ${style.iconColor}`} />
                          </div>
                          <h4 className={`${style.title} font-bold text-lg mb-2 leading-tight`}>{alert.title}</h4>
                          <p className={`${style.desc} text-xs leading-relaxed font-medium`}>{alert.description}</p>
                        </div>
                      );
                    })
                  ) : (<div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center"><p className="text-xs text-slate-500 italic">No active weather alerts.</p></div>)}
                </div>
                <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 flex flex-col justify-between shadow-xl">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Verification</h3>
                    <div className="flex items-center gap-3 mb-6 bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                       <Database className={`w-8 h-8 ${currentData.isStale ? 'text-amber-500' : 'text-red-500'}`} />
                       <div>
                         <p className="text-sm font-bold text-slate-200">{currentData.isStale ? 'Using Offline Backup' : 'Live Official Data'}</p>
                         <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Open-Meteo &amp; Gemini</p>
                       </div>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">Extracted from: <span className="font-bold text-slate-300">{currentData.stationName}</span>. {currentData.isStale && " API connection is currently limited, showing last successful sync."}</p>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-800/50 p-3 rounded-xl text-center border border-slate-700/30">Data as of: {currentData.lastUpdated}</div>
                  </div>
                  {currentData.sources?.length > 0 && (
                    <div className="space-y-2 mt-8">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Sources</p>
                      {currentData.sources.map((source, idx) => (<a key={idx} href={source.uri} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 transition-all border border-transparent hover:border-slate-700"><span className="truncate max-w-[200px]">{source.title}</span><ExternalLink className="w-3 h-3 text-red-400" /></a>))}
                    </div>
                  )}
                </div>
            </div>
            <footer className="text-center text-slate-600 text-[10px] py-6 border-t border-slate-900/50 uppercase tracking-widest font-bold"><p>Estimates provided for informational purposes. Official closures are announced via EECD NB.</p></footer>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;
