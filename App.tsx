
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
  Cpu,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const cities: CityKey[] = ['Fredericton', 'Moncton', 'McGivney'];

const CITY_COORDINATES: Record<CityKey, { lat: number; lon: number }> = {
  Fredericton: { lat: 45.9636, lon: -66.6431 },
  Moncton: { lat: 46.0878, lon: -64.7782 },
  McGivney: { lat: 46.2501, lon: -66.3154 },
};

const getAlertConfig = (severity: string) => {
  const s = severity.toLowerCase();
  if (s === 'extreme') return { wrapper: 'bg-red-950/40 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.2)]', badge: 'bg-red-600', title: 'text-white', desc: 'text-red-100', iconColor: 'text-red-400' };
  if (s === 'severe') return { wrapper: 'bg-red-900/20 border-red-500/40', badge: 'bg-red-500', title: 'text-white', desc: 'text-red-100/90', iconColor: 'text-red-300' };
  if (s === 'moderate') return { wrapper: 'bg-orange-900/20 border-orange-500/40', badge: 'bg-orange-500', title: 'text-white', desc: 'text-orange-100/90', iconColor: 'text-orange-300' };
  return { wrapper: 'bg-amber-900/10 border-amber-500/30', badge: 'bg-amber-500', title: 'text-amber-50', desc: 'text-amber-100/80', iconColor: 'text-amber-400' };
};

const App: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<CityKey>(cities[0]);
  const [weatherData, setWeatherData] = useState<Record<CityKey, CityWeatherData | null>>({
    Fredericton: null, Moncton: null, McGivney: null,
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
    if (existingData && !existingData.isStale && !isManual) return;
    if (isManual) { if (refreshing) return; setRefreshing(true); } else if (!existingData) { setLoading(true); }
    setGlobalAlertStatus(prev => ({ ...prev, status: 'checking' }));
    setError(null);
    try {
      const data = await fetchWeatherForCity(city, isManual);
      setWeatherData(prev => ({ ...prev, [city]: data }));
      setGlobalAlertStatus({ status: 'success', lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      if (data.isStale) setError({ type: 'QUOTA_STALE', message: `Displaying cached data. Connection busy.` });
    } catch (err: any) {
       setGlobalAlertStatus(prev => ({ ...prev, status: 'error' }));
       setError({ type: 'PROXY', message: `Weather services unreachable. Please refresh.` });
    } finally { setLoading(false); setRefreshing(false); }
  }, [weatherData, refreshing]);

  const handleRefresh = useCallback(() => { if (!refreshing) loadCityData(selectedCity, true); }, [loadCityData, selectedCity, refreshing]);

  useEffect(() => { loadCityData(selectedCity, false); }, [selectedCity, loadCityData]);

  useEffect(() => {
    let timer: any;
    const currentData = weatherData[selectedCity];
    if (currentData?.isStale && currentData.cacheTimestamp) {
      const remainingSeconds = Math.max(0, Math.round((CACHE_TTL - (Date.now() - currentData.cacheTimestamp)) / 1000));
      setCountdown(remainingSeconds);
      timer = setInterval(() => setCountdown(p => (p === null || p <= 1) ? 0 : p - 1), 1000);
    } else setCountdown(null);
    return () => clearInterval(timer);
  }, [weatherData, selectedCity]);

  const currentData = weatherData[selectedCity];

  return (
    <div className="min-h-screen pb-20 selection:bg-red-500/30">
      <header className="sticky top-0 z-[100] transition-all duration-300">
        {/* Launch Announcement Banner */}
        <div className="bg-amber-500 text-slate-950 py-2 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[pulse_3s_infinite] opacity-50"></div>
          <p className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] uppercase relative z-10 flex items-center justify-center gap-3">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>APP LAUNCH - COMING SOON, SOME FEATURES WILL TEMPORARILY BE UNAVAILABLE</span>
            <Sparkles className="w-3 h-3 shrink-0" />
          </p>
        </div>
        
        <div className="bg-red-600 h-1 w-full"></div>
        <div className="glass-panel border-b border-white/5 py-4">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                <span className="text-2xl font-black text-white italic">BC</span>
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">BIG COCO'S</h1>
                <p className="text-[10px] font-bold text-red-500 tracking-[0.2em] uppercase mt-1">Premium Weather Bureau</p>
              </div>
            </div>

            <div className="flex items-center bg-slate-800/40 p-1.5 rounded-2xl border border-white/5">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    selectedCity === city 
                      ? 'bg-white text-slate-900 shadow-xl' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMonitoring(!isMonitoring)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all duration-300 ${
                  isMonitoring 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                    : 'bg-slate-800/40 border-white/5 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Activity className={`w-3.5 h-3.5 ${isMonitoring ? 'animate-pulse' : ''}`} />
                {isMonitoring ? 'LIVE MONITOR ON' : 'START MONITOR'}
              </button>
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-3 rounded-2xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        <GlobalAlertStatus status={globalAlertStatus.status} lastChecked={globalAlertStatus.lastChecked} />
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-12 space-y-12">
        {loading && !currentData ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-semibold animate-pulse tracking-widest text-xs uppercase">Initializing Premium Analytics...</p>
          </div>
        ) : currentData ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <LiveAlertTicker alerts={currentData.alerts} lastUpdated={currentData.lastUpdated} />

            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-panel rounded-[2.5rem] p-10 overflow-hidden relative">
                {/* Decorative background glow */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-600/10 rounded-full blur-[100px]"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between h-full">
                  <div className="space-y-6 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                      <MapPin className="w-3 h-3 text-red-500" /> {currentData.cityName}, New Brunswick
                    </div>
                    <div>
                      <h2 className="text-8xl md:text-9xl font-extrabold tracking-tighter text-white">{currentData.currentTemp}°</h2>
                      <p className="text-xl font-medium text-slate-400">RealFeel® {currentData.feelsLike}°</p>
                    </div>
                    <div className="flex items-center gap-3 p-1.5 bg-white/5 rounded-2xl w-fit mx-auto md:mx-0">
                      <div className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs">OFFICIAL</div>
                      <span className="text-[10px] font-bold text-slate-500 pr-4 uppercase tracking-widest">{currentData.condition}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center md:items-end justify-between h-full gap-8 mt-12 md:mt-0">
                    <WeatherIcon condition={currentData.condition} className="w-40 h-40 text-white drop-shadow-2xl" />
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <div className="glass-card p-4 rounded-3xl text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Wind</p>
                        <p className="text-lg font-black text-white">{currentData.windSpeed} <span className="text-[10px] text-slate-400">km/h</span></p>
                      </div>
                      <div className="glass-card p-4 rounded-3xl text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Humidity</p>
                        <p className="text-lg font-black text-white">{currentData.humidity}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <OutlookSummary outlooks={currentData.periodOutlooks} />
                <div className="glass-panel rounded-[2rem] p-8 space-y-6">
                  <h3 className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase border-b border-white/5 pb-4">Daily Range</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <ThermometerSun className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">High Temperature</p>
                        <p className="text-2xl font-black text-white">{currentData.high}°</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <ThermometerSnowflake className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Low Temperature</p>
                        <p className="text-2xl font-black text-white">{currentData.low}°</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-700" />
                  </div>
                </div>
              </div>
            </div>

            {currentData.minuteCast && (
              <NextHourOutlook data={currentData.minuteCast} currentTemp={currentData.currentTemp} feelsLike={currentData.feelsLike} currentCondition={currentData.condition} />
            )}

            <HourlyForecast data={currentData.hourly} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 glass-panel rounded-[2.5rem] p-8">
                    <h3 className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-8">
                      <Calendar className="w-4 h-4" /> 7-Day Extended Forecast
                    </h3>
                    <div className="space-y-1">
                        {currentData.daily.map((day, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                              <div className="w-32">
                                <p className="font-bold text-slate-200">{day.day}</p>
                              </div>
                              <div className="flex items-center gap-4 flex-1">
                                <WeatherIcon condition={day.condition} className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-widest hidden md:block">{day.condition}</span>
                              </div>
                              <div className="flex items-center gap-8">
                                {day.precipProb > 15 && <div className="flex items-center gap-2 text-xs font-bold text-blue-400"><Umbrella className="w-3.5 h-3.5" />{day.precipProb}%</div>}
                                <div className="flex items-center gap-4 w-20 justify-end">
                                  <span className="font-bold text-white">{day.high}°</span>
                                  <span className="font-medium text-slate-600">{day.low}°</span>
                                </div>
                              </div>
                          </div>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-2">
                  <SignificantWeatherOutlook events={currentData.significantWeather} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SnowDayPredictor probability={currentData.snowDayProbability} reasoning={currentData.snowDayReasoning} />
                <PowerOutagePredictor probability={currentData.powerOutageProbability} reasoning={currentData.powerOutageReasoning} />
                <ComingSoon title="Lightning Tracker" description="Hyper-local storm cell triangulation" />
                <RoadConditions status={currentData.roadConditions.status} summary={currentData.roadConditions.summary} />
            </div>

            <WeatherRadar lat={CITY_COORDINATES[selectedCity].lat} lon={CITY_COORDINATES[selectedCity].lon} cityName={selectedCity} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div id="alerts-section" className="space-y-4">
                  <h3 className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Active Advisories
                  </h3>
                  {currentData.alerts?.length > 0 ? (
                    currentData.alerts.map((alert, idx) => {
                      const style = getAlertConfig(alert.severity);
                      return (
                        <div key={idx} className={`${style.wrapper} border p-8 rounded-[2rem] relative overflow-hidden`}>
                          <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/5 blur-3xl"></div>
                          <div className="flex items-center justify-between mb-4">
                            <span className={`${style.badge} text-[9px] uppercase px-3 py-1 rounded-full tracking-[0.2em] font-black text-white`}>{alert.severity}</span>
                            <AlertTriangle className={`w-5 h-5 ${style.iconColor}`} />
                          </div>
                          <h4 className={`${style.title} font-extrabold text-xl mb-3 tracking-tight`}>{alert.title}</h4>
                          <p className={`${style.desc} text-xs leading-relaxed font-medium`}>{alert.description}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="glass-panel border-dashed border-white/10 p-12 rounded-[2rem] text-center">
                      <p className="text-xs text-slate-600 font-bold uppercase tracking-widest italic">All advisory channels currently clear</p>
                    </div>
                  )}
                </div>

                <div className="glass-panel rounded-[2rem] p-10 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-10">System Integrity</h3>
                    <div className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 mb-8">
                       <div className={`p-4 rounded-2xl ${currentData.isStale ? 'bg-amber-500/20' : 'bg-red-600/20'}`}>
                         <Database className={`w-8 h-8 ${currentData.isStale ? 'text-amber-500' : 'text-red-500'}`} />
                       </div>
                       <div>
                         <p className="text-lg font-extrabold text-white">{currentData.isStale ? 'LOCAL CACHE ACTIVE' : 'REAL-TIME UPLINK'}</p>
                         <p className="text-[9px] text-slate-500 font-black tracking-widest uppercase">Verified Satellite Feeds</p>
                       </div>
                    </div>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8">
                      Precision data synthesized from Open-Meteo High-Resolution models and verified official reports. Last hardware sync at <span className="text-white">{currentData.lastUpdated}</span>.
                    </p>
                  </div>
                  {currentData.sources?.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Authenticated Sources</p>
                      {currentData.sources.map((source, idx) => (
                        <a key={idx} href={source.uri} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-slate-400 transition-all group border border-transparent hover:border-white/10">
                          <span className="truncate">{source.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
            </div>
          </div>
        ) : null}
      </main>
      <footer className="max-w-7xl mx-auto px-6 mt-20 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mb-8"></div>
        <p className="text-[9px] text-slate-600 font-black tracking-[0.3em] uppercase">Big Coco's Weather Bureau • New Brunswick Division • © 2024</p>
      </footer>
    </div>
  );
};

export default App;
