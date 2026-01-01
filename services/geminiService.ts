
import { GoogleGenAI, Type } from "@google/genai";
import { CityWeatherData, CityKey, HourlyForecast, DailyForecast, WeatherAlert, RoadConditions, SignificantWeatherEvent, MinuteCastData, MinuteCastEntry, PeriodOutlook } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

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

// Rate Limiting State
let rateLimitResetTime = 0;
const RATE_LIMIT_COOLDOWN = 60 * 1000; // 1 minute

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
  // Check if we are currently rate limited
  if (Date.now() < rateLimitResetTime) {
    console.warn("Gemini API rate limit active. Skipping AI fetch.");
    return { 
      data: { 
        alerts: [], 
        snowDayProbability: 0, 
        snowDayReasoning: "AI analysis paused due to high traffic.", 
        powerOutageProbability: 0, 
        powerOutageReasoning: "AI analysis paused due to high traffic.", 
        roadConditions: { status: 'Unknown', summary: 'AI analysis paused.' }, 
        significantWeather: [], 
        periodOutlooks: [], 
        minuteCast: { summary: 'Forecast temporarily unavailable.', data: [] } 
      }, 
      searchSources: [],
      aiStatus: 'rate_limited' as const
    };
  }

  const { twn_url, accuweather_url } = CITY_COORDINATES[city];
  
  const prompt = `
    Analyze the real-time and forecast weather for ${city}, New Brunswick. Use provided conditions and perform a fresh web search for active info.

    Current local conditions: ${currentTemp}°C, ${condition}.

    Based on all available info, determine:
    1.  **Active Weather Alerts:** Search for official, currently active weather alerts from sources like Environment Canada (${twn_url}). Only include alerts that are currently in effect. Exclude any ended, cancelled, or expired alerts. Provide severity, title, and description. If none, return an empty array.
    2.  **Snow Day Probability:** A number (0-100) for the next school day, with brief reasoning. If it's a weekend/holiday, the probability is 0.
    3.  **Power Outage Risk:** A number (0-100) based on high winds or ice accretion, with brief reasoning.
    4.  **Road Conditions:** Current status from official sources (e.g., NB 511). Include a one-word status ('Good', 'Fair', 'Poor', 'Unknown') and a short summary for major highways.
    5.  **7-Day Significant Weather Outlook:** Analyze the next 7 days for any major weather events (e.g., major snowfall >15cm, ice storm, hurricane remnants, extreme wind >70km/h). For each day, provide a brief description, a severity ('High', 'Moderate', 'None'), and the day's name (e.g., "Tuesday"). If no significant weather is expected for a day, set severity to 'None' and description to 'No significant weather'. Ensure there are exactly 7 entries in the array, starting with tomorrow.
    6.  **Period Outlooks:** Provide a descriptive outlook for three upcoming periods: Morning, Afternoon, and Overnight. **Crucially, these must be forward-looking.** If a period for today has already passed (e.g., it is 2 PM), provide the outlook for that period for the *next day*. For each period, provide the day ('Today' or 'Tomorrow'), temperature, condition, and a summary.
    7.  **Minute-by-Minute Forecast:** Visit ${accuweather_url} to get the AccuWeather MinuteCast. Extract the forecast summary and the detailed minute-by-minute data for the next 60 minutes. From the graph and text, create an array of 60 entries representing each minute. Each entry should have a time label (e.g., 'Now', '+15 min'), an intensity (0 for none, 0.3 for light, 0.6 for moderate, 1 for heavy), and a precipitation type ('rain', 'snow', 'ice', 'mix', 'none').
    
    Return a single JSON object that strictly follows the defined schema.
  `;
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      alerts: {
        type: Type.ARRAY,
        description: "A list of active weather alerts. Must be empty if none are active.",
        items: {
          type: Type.OBJECT,
          properties: {
            severity: { type: Type.STRING, description: "The severity of the alert.", enum: ['Minor', 'Moderate', 'Severe', 'Extreme'] },
            title: { type: Type.STRING, description: "The title of the alert." },
            description: { type: Type.STRING, description: "A brief description of the alert." },
          },
          required: ['severity', 'title', 'description']
        }
      },
      snowDayProbability: { type: Type.NUMBER, description: "Probability of a snow day, from 0 to 100." },
      snowDayReasoning: { type: Type.STRING, description: "Reasoning for the snow day probability." },
      powerOutageProbability: { type: Type.NUMBER, description: "Probability of a power outage, from 0 to 100." },
      powerOutageReasoning: { type: Type.STRING, description: "Reasoning for the power outage probability." },
      roadConditions: {
        type: Type.OBJECT,
        description: "Current road conditions.",
        properties: {
          status: { type: Type.STRING, description: "A one-word status of road conditions.", enum: ['Good', 'Fair', 'Poor', 'Unknown'] },
          summary: { type: Type.STRING, description: "A brief summary of road conditions." }
        },
        required: ['status', 'summary']
      },
      significantWeather: {
        type: Type.ARRAY,
        description: "A 7-day outlook for significant weather events.",
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.STRING, description: "The day of the week." },
            severity: { type: Type.STRING, description: "The severity of the event.", enum: ['High', 'Moderate', 'None'] },
            description: { type: Type.STRING, description: "A brief description of the significant weather." },
          },
          required: ['day', 'severity', 'description']
        }
      },
      periodOutlooks: {
        type: Type.ARRAY,
        description: "A 3-period outlook for the next 24 hours.",
        items: {
          type: Type.OBJECT,
          properties: {
            period: { type: Type.STRING, enum: ['Morning', 'Afternoon', 'Overnight'] },
            day: { type: Type.STRING, description: "The day for the outlook, e.g., 'Today' or 'Tomorrow'." },
            temp: { type: Type.STRING },
            condition: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ['period', 'day', 'temp', 'condition', 'summary']
        }
      },
      minuteCast: {
        type: Type.OBJECT,
        description: "AccuWeather MinuteCast data for the next hour.",
        properties: {
          summary: { type: Type.STRING, description: "A summary of the next hour's forecast." },
          data: {
            type: Type.ARRAY,
            description: "An array of 60 entries, one for each minute.",
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                intensity: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ['rain', 'snow', 'ice', 'mix', 'none'] }
              },
              required: ['time', 'intensity', 'type']
            }
          }
        },
        required: ['summary', 'data']
      }
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
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse JSON from Gemini:", text);
        data = { alerts: [], snowDayProbability: 0, snowDayReasoning: "AI response format error.", powerOutageProbability: 0, powerOutageReasoning: "AI response format error.", roadConditions: { status: 'Unknown', summary: 'Could not retrieve road condition data.' }, significantWeather: [], periodOutlooks: [], minuteCast: { summary: 'Could not retrieve forecast.', data: [] } };
    }
    
    const searchSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri || '',
      title: chunk.web?.title || 'Search Source'
    })).filter((s: any) => s.uri !== '') || [];

    return { data, searchSources, aiStatus: 'active' as const };
  } catch (error: any) {
    console.error("Search fetch failed", error);
    
    // Auto-disable if rate limit hit (429) or quota exceeded
    const isRateLimit = error.message?.includes('429') || error.status === 429 || error.message?.includes('exhausted');
    
    if (isRateLimit) {
        console.warn("Rate limit detected. Enabling cooldown.");
        rateLimitResetTime = Date.now() + RATE_LIMIT_COOLDOWN;
        return { 
            data: { 
                alerts: [], 
                snowDayProbability: 0, 
                snowDayReasoning: "AI analysis paused due to high traffic.", 
                powerOutageProbability: 0, 
                powerOutageReasoning: "AI analysis paused due to high traffic.", 
                roadConditions: { status: 'Unknown', summary: 'AI analysis paused.' }, 
                significantWeather: [], 
                periodOutlooks: [], 
                minuteCast: { summary: 'Forecast temporarily unavailable.', data: [] } 
            }, 
            searchSources: [],
            aiStatus: 'rate_limited' as const
        };
    }

    return { 
      data: { alerts: [], snowDayProbability: 0, snowDayReasoning: "Search failed to initialize.", powerOutageProbability: 0, powerOutageReasoning: "Search failed to initialize.", roadConditions: { status: 'Unknown', summary: 'Could not retrieve road condition data.' }, significantWeather: [], periodOutlooks: [], minuteCast: { summary: 'Could not retrieve forecast.', data: [] } }, 
      searchSources: [],
      aiStatus: 'failed' as const
    };
  }
};

export const fetchWeatherForCity = async (city: CityKey, ignoreCache: boolean = false): Promise<CityWeatherData> => {
  const cached = getCache(city);
  const now = Date.now();
  
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
      
      const validSeverities: WeatherAlert['severity'][] = ['Minor', 'Moderate', 'Severe', 'Extreme'];
      const validatedAlerts: WeatherAlert[] = (Array.isArray(searchData.alerts) ? searchData.alerts : [])
        .filter(alert => alert && typeof alert.severity === 'string' && typeof alert.title === 'string' && typeof alert.description === 'string')
        .map((alert: any) => ({
          ...alert,
          severity: validSeverities.includes(alert.severity) ? alert.severity : 'Minor',
        }));
      
      const snowDayProbability = Math.min(100, Math.max(0, Number(searchData.snowDayProbability) || 0));
      const snowDayReasoning = typeof searchData.snowDayReasoning === 'string' ? searchData.snowDayReasoning : "Standard seasonal outlook.";
      const powerOutageProbability = Math.min(100, Math.max(0, Number(searchData.powerOutageProbability) || 0));
      const powerOutageReasoning = typeof searchData.powerOutageReasoning === 'string' ? searchData.powerOutageReasoning : "Grid conditions appear stable.";


      const roadConditions: RoadConditions = (searchData.roadConditions && ['Good', 'Fair', 'Poor', 'Unknown'].includes(searchData.roadConditions.status))
        ? searchData.roadConditions
        : { status: 'Unknown', summary: 'Could not retrieve road condition data.' };
      
      const validSigWeatherSeverities: SignificantWeatherEvent['severity'][] = ['High', 'Moderate', 'None'];
      const significantWeather: SignificantWeatherEvent[] = (Array.isArray(searchData.significantWeather) ? searchData.significantWeather : [])
        .filter(event => event && typeof event.day === 'string' && typeof event.severity === 'string' && typeof event.description === 'string')
        .map((event: any) => ({
            ...event,
            severity: validSigWeatherSeverities.includes(event.severity) ? event.severity : 'None',
        }));
      
      const periodOutlooks: PeriodOutlook[] = Array.isArray(searchData.periodOutlooks) ? searchData.periodOutlooks : [];

      const minuteCast: MinuteCastData = (searchData.minuteCast && Array.isArray(searchData.minuteCast.data))
        ? searchData.minuteCast
        : { summary: 'Minute-by-minute forecast is currently unavailable.', data: [] };

      const nowTime = new Date(meteoData.current.time);
      let startIndex = -1;
      for (let i = meteoData.hourly.time.length - 1; i >= 0; i--) {
        if (new Date(meteoData.hourly.time[i]) <= nowTime) {
          startIndex = i;
          break;
        }
      }

      if (startIndex === -1) {
        startIndex = 0;
      }
      
      const timeData = meteoData.hourly.time.slice(startIndex, startIndex + 24);
      const tempData = meteoData.hourly.temperature_2m.slice(startIndex, startIndex + 24);
      const conditionData = meteoData.hourly.weather_code.slice(startIndex, startIndex + 24);
      const precipData = meteoData.hourly.precipitation_probability.slice(startIndex, startIndex + 24);

      const hourly: HourlyForecast[] = timeData.map((t: string, i: number) => ({
        time: new Date(t).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          hour12: true,
          timeZone: 'America/Moncton'
        }).replace(' ', '').toLowerCase(),
        temp: Math.round(tempData[i]),
        condition: wmoCodeToString(conditionData[i]),
        precipProb: precipData[i],
      }));

      const daily: DailyForecast[] = meteoData.daily.time.slice(0, 7).map((d: string, i: number) => {
        const dateObj = new Date(d + "T12:00:00");
        let dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        
        if (i === 0) dayLabel = "Today";
        else if (i === 1) dayLabel = "Tomorrow";

        return {
          day: dayLabel,
          high: Math.round(meteoData.daily.temperature_2m_max[i]),
          low: Math.round(meteoData.daily.temperature_2m_min[i]),
          condition: wmoCodeToString(meteoData.daily.weather_code[i]),
          precipProb: meteoData.daily.precipitation_probability_max[i],
        };
      });
      
      const lastUpdated = new Date().toLocaleString('en-CA', {
        timeZone: 'America/Moncton',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

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
        snowDayProbability,
        snowDayReasoning,
        powerOutageProbability,
        powerOutageReasoning,
        roadConditions,
        minuteCast,
        hourly,
        daily,
        significantWeather,
        periodOutlooks,
        alerts: validatedAlerts,
        lastUpdated,
        sources: searchSources,
        isStale: false,
        aiStatus: aiStatus // Store the status
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
