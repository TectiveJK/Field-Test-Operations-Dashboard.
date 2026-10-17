"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";
import {
  fetchWeather,
  formatMs,
  formatTemp,
  readWeatherCache,
  weatherIconKind,
  weatherLine,
  type WeatherReading,
} from "@/lib/weather";

function ConditionIcon({ code }: { code: number }) {
  const kind = weatherIconKind(code);
  const className = "size-3.5 shrink-0";
  switch (kind) {
    case "sun":
      return <Sun className={className} />;
    case "sun-cloud":
      return <CloudSun className={className} />;
    case "fog":
      return <CloudFog className={className} />;
    case "drizzle":
      return <CloudDrizzle className={className} />;
    case "rain":
      return <CloudRain className={className} />;
    case "snow":
      return <CloudSnow className={className} />;
    case "storm":
      return <CloudLightning className={className} />;
    default:
      return <Cloud className={className} />;
  }
}

export function WeatherWidget() {
  const [reading, setReading] = useState<WeatherReading | null>(() => readWeatherCache());
  const [status, setStatus] = useState<"loading" | "live" | "cached" | "empty">(() =>
    readWeatherCache() ? "cached" : "loading"
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await fetchWeather();
        if (cancelled) return;
        setReading(next);
        setStatus("live");
      } catch {
        if (cancelled) return;
        const cached = readWeatherCache();
        if (cached) {
          setReading(cached);
          setStatus("cached");
        } else {
          setStatus("empty");
        }
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 10 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (status === "loading" && !reading) {
    return <p className="text-[11px] text-slate-500">Weather…</p>;
  }
  if (!reading) {
    return <p className="text-[11px] text-slate-500">Weather unavailable</p>;
  }

  const stale = status === "cached";
  return (
    <div
      className="text-[11px] leading-tight text-slate-700"
      title={`${reading.place}${stale ? " · last reading" : ""} · ${weatherLine(reading)}`}
    >
      <p className="flex items-center justify-end gap-1 font-medium">
        <ConditionIcon code={reading.code} />
        <span>{reading.condition}</span>
        <span className="font-mono">{formatTemp(reading.temperatureC)}</span>
      </p>
      <p className="font-mono text-slate-600">
        wind {formatMs(reading.windMs)}
        <span className="text-slate-400"> · </span>
        gust {formatMs(reading.gustMs)}
      </p>
    </div>
  );
}
