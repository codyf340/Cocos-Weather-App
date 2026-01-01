
import { GoogleGenAI, Type } from "@google/genai";
import { CityWeatherData, CityKey, HourlyForecast, DailyForecast, WeatherAlert, RoadConditions, SignificantWeatherEvent, MinuteCastData, MinuteCastEntry, PeriodOutlook } from "../types";

// Helper to check if the error is a rate limit error
const isRateLimitError = (error: any): boolean => {
  const message = error?.message?.toLowerCase() || "";
  const status = error?.status;
  return (
    status === 429 || 
    message.includes("429") || 
    message.includes("quota") || 
    message.includes("exhausted") || 
    message.includes("limit")
  );
};

const CITY_COORDINATES: Record<CityKey, { lat: number; lon: number; twn_url: string; accuweather_url: string; }> = {
  Fredericton: { 
    lat: 45.9636, 
    lon: -66.6431, 
    twn_url: 'https://www.theweathernetwork.com/en/city/ca/new-brunswick/fredericton/alerts',
    accuweather_url: 'https://www.accuweather.com/en/ca/fredericton/e3b/minute-weather-forecast/1001'
  },
  Moncton: { 
    lat: 46.0878, 
    lon: -64.7782, 
    twn_url: 'https://www.theweathernetwork.com/en/city/ca/new-brunswick/moncton/alerts',
    accuweather_url: 'https://www.accuweather.com/en/ca/moncton/e1c/minute-weather-forecast/49417'
  },
  McGivney: { 
    lat: 46.2501, 
    lon: -66.3154, 
    twn_url: 'https://www.theweathernetwork.com/en/city/ca/new-brunswick/mcgivney/alerts',
    accuweather_url: 'https://www.accuweather.com/en/ca/mcgivney/e6c/minute-weather-forecast/54315'
  },
};

export const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const pendingRequests: Record<string, Promise<CityWeatherData>> = {};

let rateLimitResetTime = 0;
const RATE_LIMIT_COOLDOWN = 60 * 1000;

export const isCurrentlyRateLimited = () => Date.now() < rateLimitResetTime;
export const getRateLimitResetTime = () => rateLimitResetTime;

const getCache = (city: CityKey): { data: CityWeatherData, timestamp: number } | null => {
  try {
    const item = localStorage.getItem(`weather_cache_v13_search_${city}`);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return null;
  }
};

const setCache = (city: CityKey, data: CityWeatherData) => {
  try {
    localStorage.setItem(`weather_cache_v13_search_${city}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {}
};

const wmoCodeToString = (code: number): string => {
  const mapping: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain', 71: 'Slight snow fall',
    73: 'Moderate snow fall', 75: 'Heavy snow fall', 77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
  };
  return mapping[code] || 'Unknown';
};

const fetchOpenMeteoData = async (city: CityKey) => {
  const { lat, lon } = CITY_COORDINATES[city];
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    minutely_15: 'precipitation,weather_code',
    timezone: 'America/Moncton',
    forecast_days: '7',
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("API_HTTP_ERROR");
  return response.json();
};

const fetchSearchGroundedData = async (city: CityKey, currentTemp: number, condition: string) => {
  if (isCurrentlyRateLimited()) {
    return { 
      data: { 
        alerts: [], 
        snowDayProbability: 0, 
        snowDayReasoning: "Advanced analysis paused due to rate limits.", 
        powerOutageProbability: 0, 
        powerOutageReasoning: "Advanced analysis paused due to rate limits.", 
        roadConditions: { status: 'Unknown', summary: 'Analysis paused.' }, 
        significantWeather: [], 
        periodOutlooks: [], 
        minuteCast: { summary: 'Detailed minute-cast temporarily unavailable.', data: [] } 
      }, 
      searchSources: [{ uri: CITY_COORDINATES[city].twn_url, title: 'Environment Canada (Uplink Paused)' }],
      aiStatus: 'rate_limited' as const
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const prompt = `
    Analyze the real-time and forecast weather for ${city}, New Brunswick. Use provided conditions and perform a fresh web search for active info.
    Current local conditions: ${currentTemp}°C, ${condition}.

    Based on all available info, determine:
    1.  **Active Weather Alerts:** Search specifically for official Environment Canada weather alerts for ${city}.
    2.  **Snow Day Probability:** Next school day cancellation probability (0-100) for NB with reasoning.
    3.  **Power Outage Risk:** Probability (0-100) based on local conditions.
    4.  **Road Conditions:** Status from NB 511.
    5.  **7-Day Significant Weather Outlook:** Key events for the next week.
    6.  **Period Outlooks:** Morning, Afternoon, Overnight.
    7.  **Minute-by-Minute Forecast:** 60-minute precipitation prediction.
    
    Return strictly JSON.
  `;
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      alerts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { severity: { type: Type.STRING, enum: ['Minor', 'Moderate', 'Severe', 'Extreme'] }, title: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['severity', 'title', 'description'] } },
      snowDayProbability: { type: Type.NUMBER },
      snowDayReasoning: { type: Type.STRING },
      powerOutageProbability: { type: Type.NUMBER },
      powerOutageReasoning: { type: Type.STRING },
      roadConditions: { type: Type.OBJECT, properties: { status: { type: Type.STRING, enum: ['Good', 'Fair', 'Poor', 'Unknown'] }, summary: { type: Type.STRING } }, required: ['status', 'summary'] },
      significantWeather: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.STRING }, severity: { type: Type.STRING, enum: ['High', 'Moderate', 'None'] }, description: { type: Type.STRING } }, required: ['day', 'severity', 'description'] } },
      periodOutlooks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { period: { type: Type.STRING, enum: ['Morning', 'Afternoon', 'Overnight'] }, day: { type: Type.STRING }, temp: { type: Type.STRING }, condition: { type: Type.STRING }, summary: { type: Type.STRING } }, required: ['period', 'day', 'temp', 'condition', 'summary'] } },
      minuteCast: { type: Type.OBJECT, properties: { summary: { type: Type.STRING }, data: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { time: { type: Type.STRING }, intensity: { type: Type.NUMBER }, type: { type: Type.STRING, enum: ['rain', 'snow', 'ice', 'mix', 'none'] } }, required: ['time', 'intensity', 'type'] } } }, required: ['summary', 'data'] }
    },
    required: ['alerts', 'snowDayProbability', 'snowDayReasoning', 'powerOutageProbability', 'powerOutageReasoning', 'roadConditions', 'significantWeather', 'periodOutlooks', 'minuteCast']
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text || '{}';
    const data = JSON.parse(text);
    const searchSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri || '',
      title: chunk.web?.title || 'Search Source'
    })).filter((s: any) => s.uri !== '') || [];

    return { data, searchSources, aiStatus: 'active' as const };
  } catch (error: any) {
    if (isRateLimitError(error)) {
        rateLimitResetTime = Date.now() + RATE_LIMIT_COOLDOWN;
        return { 
            data: { 
              alerts: [], 
              snowDayProbability: 0, 
              snowDayReasoning: "Advanced analysis paused due to rate limits.", 
              powerOutageProbability: 0, 
              powerOutageReasoning: "Advanced analysis paused due to rate limits.", 
              roadConditions: { status: 'Unknown', summary: 'Analysis paused.' }, 
              significantWeather: [], 
              periodOutlooks: [], 
              minuteCast: { summary: 'Detailed minute-cast temporarily unavailable.', data: [] } 
            }, 
            searchSources: [{ uri: CITY_COORDINATES[city].twn_url, title: 'Environment Canada (Uplink Paused)' }],
            aiStatus: 'rate_limited' as const
        };
    }

    return { 
      data: { alerts: [], snowDayProbability: 0, snowDayReasoning: "Service initialization error.", powerOutageProbability: 0, powerOutageReasoning: "Service initialization error.", roadConditions: { status: 'Unknown', summary: 'Could not retrieve road conditions.' }, significantWeather: [], periodOutlooks: [], minuteCast: { summary: 'Forecast error.', data: [] } }, 
      searchSources: [],
      aiStatus: 'failed' as const
    };
  }
};

export const fetchWeatherForCity = async (city: CityKey, ignoreCache: boolean = false): Promise<CityWeatherData> => {
  const cached = getCache(city);
  const now = Date.now();
  
  if (isCurrentlyRateLimited() && cached) {
      return { ...cached.data, isStale: true, cacheTimestamp: cached.timestamp, aiStatus: 'rate_limited' };
  }

  if (!ignoreCache && cached && (now - cached.timestamp < CACHE_TTL)) {
    return { ...cached.data, isStale: false, cacheTimestamp: cached.timestamp };
  }

  if (pendingRequests[city]) return pendingRequests[city];
  
  const fetchLogic = async (): Promise<CityWeatherData> => {
    try {
      const meteoData = await fetchOpenMeteoData(city);
      const currentCondition = wmoCodeToString(meteoData.current.weather_code);
      const currentTemp = Math.round(meteoData.current.temperature_2m);
      const feelsLikeTemp = Math.round(meteoData.current.apparent_temperature);

      const { data: searchData, searchSources, aiStatus } = await fetchSearchGroundedData(city, currentTemp, currentCondition);
      
      const lastUpdated = new Date().toLocaleString('en-CA', {
        timeZone: 'America/Moncton',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const nowTime = new Date(meteoData.current.time);
      let startIndex = meteoData.hourly.time.findIndex((t: string) => new Date(t) >= nowTime);
      if (startIndex === -1) startIndex = 0;
      
      const hourly = meteoData.hourly.time.slice(startIndex, startIndex + 24).map((t: string, i: number) => ({
        time: new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'America/Moncton' }).replace(' ', '').toLowerCase(),
        temp: Math.round(meteoData.hourly.temperature_2m[startIndex + i]),
        condition: wmoCodeToString(meteoData.hourly.weather_code[startIndex + i]),
        precipProb: meteoData.hourly.precipitation_probability[startIndex + i],
      }));

      const daily = meteoData.daily.time.slice(0, 7).map((d: string, i: number) => ({
        day: i === 0 ? "Today" : i === 1 ? "Tomorrow" : new Date(d + "T12:00:00").toLocaleDateString('en-US', { weekday: 'long' }),
        high: Math.round(meteoData.daily.temperature_2m_max[i]),
        low: Math.round(meteoData.daily.temperature_2m_min[i]),
        condition: wmoCodeToString(meteoData.daily.weather_code[i]),
        precipProb: meteoData.daily.precipitation_probability_max[i],
      }));

      const finalData: CityWeatherData = {
        cityName: city,
        stationName: `Lat ${meteoData.latitude.toFixed(2)}, Lon ${meteoData.longitude.toFixed(2)}`,
        currentTemp,
        feelsLike: feelsLikeTemp,
        condition: currentCondition,
        high: Math.round(meteoData.daily.temperature_2m_max[0]),
        low: Math.round(meteoData.daily.temperature_2m_min[0]),
        humidity: meteoData.current.relative_humidity_2m,
        windSpeed: Math.round(meteoData.current.wind_speed_10m),
        snowDayProbability: searchData.snowDayProbability,
        snowDayReasoning: searchData.snowDayReasoning,
        powerOutageProbability: searchData.powerOutageProbability,
        powerOutageReasoning: searchData.powerOutageReasoning,
        roadConditions: searchData.roadConditions,
        minuteCast: searchData.minuteCast,
        hourly,
        daily,
        significantWeather: searchData.significantWeather,
        periodOutlooks: searchData.periodOutlooks,
        alerts: searchData.alerts,
        lastUpdated,
        sources: searchSources,
        isStale: aiStatus === 'rate_limited',
        cacheTimestamp: Date.now(),
        aiStatus
      };

      setCache(city, finalData);
      return finalData;
    } catch (error) {
      console.error(`Failed to fetch weather for ${city}:`, error);
      const staleData = getCache(city);
      if (staleData) {
        return { ...staleData.data, isStale: true, cacheTimestamp: staleData.timestamp };
      }
      throw error;
    } finally {
      delete pendingRequests[city];
    }
  };

  pendingRequests[city] = fetchLogic();
  return pendingRequests[city];
};
