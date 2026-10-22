export const WEATHER_CACHE_KEY = "tective-ftod-weather-v1";

/** Tective B.V., Rotterdamseweg 370 A13, Delft. */
export const TECTIVE_DELFT = { lat: 51.9918, lon: 4.3714, label: "Delft" };

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export type WeatherReading = {
  condition: string;
  code: number;
  temperatureC: number;
  windMs: number;
  gustMs: number;
  fetchedAt: string;
  place: string;
};

type CacheEnvelope = {
  kind: "tective-ftod-weather";
  v: 1;
  reading: WeatherReading;
};

function wmoLabel(code: number) {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code === 51 || code === 53 || code === 55) return "Drizzle";
  if (code === 56 || code === 57) return "Freezing drizzle";
  if (code === 61 || code === 63 || code === 65) return "Rain";
  if (code === 66 || code === 67) return "Freezing rain";
  if (code === 71 || code === 73 || code === 75 || code === 77) return "Snow";
  if (code === 80 || code === 81 || code === 82) return "Showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm + hail";
  return "Weather";
}

export function weatherIconKind(code: number) {
  if (code === 0 || code === 1) return "sun" as const;
  if (code === 2) return "sun-cloud" as const;
  if (code === 3) return "cloud" as const;
  if (code === 45 || code === 48) return "fog" as const;
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) return "drizzle" as const;
  if (code === 61 || code === 63 || code === 65 || code === 80 || code === 81 || code === 82) {
    return "rain" as const;
  }
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) {
    return "snow" as const;
  }
  if (code === 95 || code === 96 || code === 99) return "storm" as const;
  return "cloud" as const;
}

export function formatTemp(c: number) {
  return `${Math.round(c)}°C`;
}

export function formatMs(value: number) {
  return `${value.toFixed(1)} m/s`;
}

export function weatherLine(reading: WeatherReading) {
  return `${reading.condition}  ${formatTemp(reading.temperatureC)}  wind ${formatMs(reading.windMs)}  gust ${formatMs(reading.gustMs)}`;
}

export function readWeatherCache(): WeatherReading | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (parsed?.kind !== "tective-ftod-weather" || !parsed.reading) return null;
    return parsed.reading;
  } catch {
    return null;
  }
}

function writeWeatherCache(reading: WeatherReading) {
  try {
    const payload: CacheEnvelope = { kind: "tective-ftod-weather", v: 1, reading };
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export async function fetchWeather(place = TECTIVE_DELFT): Promise<WeatherReading> {
  const query = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    current: "temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m",
    wind_speed_unit: "ms",
    timezone: "Europe/Amsterdam",
  });
  const response = await fetch(`${FORECAST_URL}?${query.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Weather service could not be reached.");
  const data = (await response.json()) as {
    current?: {
      temperature_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
      wind_gusts_10m?: number;
    };
  };
  const current = data.current;
  if (
    !current ||
    typeof current.temperature_2m !== "number" ||
    typeof current.weather_code !== "number" ||
    typeof current.wind_speed_10m !== "number" ||
    typeof current.wind_gusts_10m !== "number"
  ) {
    throw new Error("Weather response was incomplete.");
  }
  const reading: WeatherReading = {
    condition: wmoLabel(current.weather_code),
    code: current.weather_code,
    temperatureC: current.temperature_2m,
    windMs: current.wind_speed_10m,
    gustMs: current.wind_gusts_10m,
    fetchedAt: new Date().toISOString(),
    place: place.label,
  };
  writeWeatherCache(reading);
  return reading;
}
