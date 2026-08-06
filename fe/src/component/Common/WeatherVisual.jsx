import React, { useMemo } from "react";

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const getWeatherScene = (icon = "", description = "") => {
  const code = String(icon).slice(0, 2);
  const isNight = String(icon).endsWith("n");
  const text = normalizeText(description);

  // Ưu tiên mã icon từ API để cảnh nền luôn đúng với trạng thái thực tế.
  const sceneByCode = {
    "01": "clear",
    "02": "partly-cloudy",
    "03": "cloudy",
    "04": "cloudy",
    "09": "drizzle",
    "10": "rain",
    "11": "thunder",
    "13": "snow",
    "50": "mist",
  };

  if (sceneByCode[code]) {
    return { kind: sceneByCode[code], isNight };
  }

  // Fallback khi API không trả icon: kiểm tra hiện tượng mạnh trước.
  if (/giong|sam|set|thunder|storm/.test(text)) return { kind: "thunder", isNight };
  if (/tuyet|snow/.test(text)) return { kind: "snow", isNight };
  if (/suong|mu|mist|fog|haze/.test(text)) return { kind: "mist", isNight };
  if (/mua phun|mua rao nhe|drizzle|shower/.test(text)) return { kind: "drizzle", isNight };
  if (/mua|rain/.test(text)) return { kind: "rain", isNight };
  if (/nhieu may|may day|am u|overcast|cloud/.test(text)) return { kind: "cloudy", isNight };
  if (/it may|may rai rac|partly/.test(text)) return { kind: "partly-cloudy", isNight };
  if (/troi quang|quang may|clear|nang/.test(text)) return { kind: "clear", isNight };

  return { kind: "partly-cloudy", isNight };
};

const RAIN_DROPS = Array.from({ length: 30 }, (_, index) => ({
  left: `${(index * 13 + 4) % 100}%`,
  delay: `${-((index * 0.16) % 1.9)}s`,
  duration: `${0.8 + (index % 5) * 0.11}s`,
  opacity: 0.55 + (index % 4) * 0.1,
}));

const SNOW_FLAKES = Array.from({ length: 24 }, (_, index) => ({
  left: `${(index * 17 + 9) % 100}%`,
  delay: `${-((index * 0.33) % 4.5)}s`,
  duration: `${3.8 + (index % 6) * 0.42}s`,
  size: `${4 + (index % 4) * 2}px`,
}));

const STARS = Array.from({ length: 16 }, (_, index) => ({
  left: `${(index * 23 + 6) % 95}%`,
  top: `${(index * 19 + 8) % 70}%`,
  delay: `${-((index * 0.21) % 2.4)}s`,
}));

function Cloud({ className = "" }) {
  return (
    <span className={`weather-cloud ${className}`}>
      <i />
      <b />
      <em />
      <small />
    </span>
  );
}

export default function WeatherVisual({ icon, description, compact = false, className = "" }) {
  const scene = useMemo(() => getWeatherScene(icon, description), [icon, description]);
  const hasRain = ["drizzle", "rain", "thunder"].includes(scene.kind);
  const hasClouds = ["partly-cloudy", "cloudy", "drizzle", "rain", "thunder", "snow", "mist"].includes(scene.kind);
  const showSun = !scene.isNight && ["clear", "partly-cloudy"].includes(scene.kind);
  const showMoon = scene.isNight && ["clear", "partly-cloudy"].includes(scene.kind);
  const showStars = scene.isNight && ["clear", "partly-cloudy"].includes(scene.kind);
  const heroMode = !compact;

  return (
    <div
      className={`weather-visual weather-visual--${scene.kind} ${scene.isNight ? "is-night" : "is-day"} ${compact ? "is-compact" : "is-hero"} ${className}`}
      aria-hidden="true"
    >
      <div className="weather-visual__sky" />
      <div className="weather-visual__haze" />

      {showMoon && <span className="weather-moon" />}

      {showStars && (
        <div className="weather-stars">
          {STARS.map((star, index) => (
            <span
              key={index}
              style={{ "--star-left": star.left, "--star-top": star.top, "--star-delay": star.delay }}
            />
          ))}
        </div>
      )}

      {showSun && (
        <span className="weather-sun">
          <i className="weather-sun__halo" />
          <i className="weather-sun__core" />
          <i className="weather-sun__rays" />
        </span>
      )}

      {hasClouds && (
        <div className="weather-cloud-layer">
          <Cloud className="weather-cloud--back" />
          <Cloud className="weather-cloud--mid" />
          <Cloud className="weather-cloud--front" />
          {heroMode && ["cloudy", "rain", "thunder", "mist"].includes(scene.kind) ? <Cloud className="weather-cloud--extra" /> : null}
        </div>
      )}

      {hasRain && (
        <div className={`weather-rain ${scene.kind === "drizzle" ? "is-light" : ""}`}>
          {RAIN_DROPS.map((drop, index) => (
            <span
              key={index}
              style={{
                "--drop-left": drop.left,
                "--drop-delay": drop.delay,
                "--drop-duration": drop.duration,
                "--drop-opacity": drop.opacity,
              }}
            />
          ))}
        </div>
      )}

      {scene.kind === "thunder" && (
        <div className="weather-lightning" aria-hidden="true">
          <span />
          <span />
        </div>
      )}

      {scene.kind === "snow" && (
        <div className="weather-snow">
          {SNOW_FLAKES.map((flake, index) => (
            <span
              key={index}
              style={{
                "--flake-left": flake.left,
                "--flake-delay": flake.delay,
                "--flake-duration": flake.duration,
                "--flake-size": flake.size,
              }}
            />
          ))}
        </div>
      )}

      {scene.kind === "mist" && (
        <div className="weather-mist">
          <span />
          <span />
          <span />
          <span />
        </div>
      )}

      <div className="weather-visual__glow weather-visual__glow--left" />
      <div className="weather-visual__glow weather-visual__glow--right" />
      <div className="weather-visual__shine" />
    </div>
  );
}
