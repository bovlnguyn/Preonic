import https from 'https';
import { URL } from 'url';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { WeatherAlert } from '../models/WeatherAlert.entity';
import { Notification } from '../models/Notification.entity';
import { AppError } from '../middlewares/error.middleware';
import { WeatherAlertType, WeatherAlertSeverity, WeatherData, WeatherThresholds } from '../types';
import { WEATHER_API, WEATHER_THRESHOLDS } from '../constants';
import { PROVINCE_COORDS, ProvinceCoord } from '../data/provinces';
import { createLogger } from '../utils/logger';
import {
  ForecastSummary,
  RainfallContext,
  fetchRainfallContext,
  openMeteoProvider,
  openWeatherMapProvider,
} from './weather-providers';

const log = createLogger('Weather');

const FORECAST_DAYS = 5;

// ════════════════════════════════════════════════════════════════
// Weather cards cho FE — thời tiết hiện tại + dự báo theo tỉnh/thành
// ════════════════════════════════════════════════════════════════

export type DailyForecastItem = {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  condition: string;
  risk: string;
};

export type WeatherCard = {
  province: string;
  temp: number;
  humidity: number;
  wind: number;
  condition: string;
  risk: string;
  advice: string;
  source: 'live' | 'fallback';
  dailyForecast: DailyForecastItem[];
};

type WeatherApiResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation_probability?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
  };
};

const normalizeProvinceName = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
};

const getProvinceCoords = (province: string): ProvinceCoord => {
  const normalized = normalizeProvinceName(province);
  const aliasMap: Record<string, string> = {
    'ha noi': 'Ha Noi',
    'hanoi': 'Ha Noi',
    'ho chi minh': 'Ho Chi Minh',
    'hcm': 'Ho Chi Minh',
    'tp hcm': 'Ho Chi Minh',
    'tp.hcm': 'Ho Chi Minh',
    'da nang': 'Da Nang',
    'da-nang': 'Da Nang',
    'dak lak': 'Dak Lak',
    'daklak': 'Dak Lak',
    'dong thap': 'Dong Thap',
    'dongthap': 'Dong Thap',
    'dong tháp': 'Dong Thap',
    'thua thien hue': 'Hue',
    'thừa thiên huế': 'Hue',
  };

  const resolvedName = aliasMap[normalized] ?? province;
  const coords = PROVINCE_COORDS[resolvedName] ?? PROVINCE_COORDS[province];

  return coords ?? WEATHER_API.DEFAULT_COORDS;
};

const findStaticProvinceCoords = (province?: string): ProvinceCoord | null => {
  if (!province?.trim()) return null;
  const fallback = getProvinceCoords(province);
  const isDefaultBecauseUnknown =
    fallback.lat === WEATHER_API.DEFAULT_COORDS.lat &&
    fallback.lng === WEATHER_API.DEFAULT_COORDS.lng &&
    normalizeProvinceName(province) !== normalizeProvinceName(WEATHER_API.DEFAULT_PROVINCE) &&
    normalizeProvinceName(province) !== 'hanoi';
  return isDefaultBecauseUnknown ? null : fallback;
};

const getWeatherConditionLabel = (weatherCode: number): string => {
  switch (weatherCode) {
    case 0:
      return 'Quang đãng';
    case 1:
    case 2:
      return 'Có mây';
    case 3:
      return 'U ám';
    case 45:
    case 48:
      return 'Sương mù';
    case 51:
    case 53:
    case 55:
      return 'Mưa nhỏ';
    case 61:
    case 63:
    case 65:
      return 'Mưa';
    case 66:
    case 67:
      return 'Mưa tuyết';
    case 71:
    case 73:
    case 75:
    case 77:
      return 'Tuyết';
    case 80:
    case 81:
    case 82:
      return 'Mưa rào';
    case 95:
    case 96:
    case 99:
      return 'Dông';
    default:
      return 'Thời tiết ấm áp';
  }
};

const getWeatherRisk = (temp: number, humidity: number, wind: number, precipitation: number): string => {
  if (precipitation >= 80) {
    return 'Ngập úng và mưa lớn';
  }
  if (temp >= 38) {
    return 'Nắng nóng';
  }
  if (wind >= 50) {
    return 'Gió mạnh';
  }
  if (humidity >= 85) {
    return 'Độ ẩm cao';
  }
  return 'Ổn định';
};

const getWeatherAdvice = (risk: string, temp: number, precipitation: number): string => {
  if (risk === 'Ngập úng và mưa lớn') {
    return 'Chuẩn bị rãnh thoát nước và hạn chế phun thuốc trước mưa.';
  }
  if (risk === 'Nắng nóng') {
    return 'Ưu tiên thu hoạch buổi sáng và che phủ đêm cho cây trồng.';
  }
  if (risk === 'Gió mạnh') {
    return 'Kiểm tra hệ thống neo, giàn và hàng rào trước thời tiết gió lớn.';
  }
  if (risk === 'Độ ẩm cao') {
    return 'Theo dõi sâu bệnh và giữ không khí lưu thông tốt cho kho.';
  }
  if (precipitation >= 60) {
    return 'Bảo vệ sản phẩm khỏi ẩm mốc và giữ bề mặt khô ráo.';
  }
  if (temp <= 15) {
    return 'Giữ lớp phủ và kiểm tra độ ấm cho cây non.';
  }
  return 'Tiếp tục theo dõi điều kiện thực địa trong ngày.';
};

const buildDailyForecast = (data: WeatherApiResponse): DailyForecastItem[] => {
  const daily = data.daily ?? {};

  return Array.from({ length: FORECAST_DAYS }, (_, index) => {
    const maxTemp = daily.temperature_2m_max?.[index] ?? 30;
    const minTemp = daily.temperature_2m_min?.[index] ?? 22;
    const precipitation = daily.precipitation_sum?.[index] ?? 0;
    const weatherCode = daily.weather_code?.[index] ?? 0;
    const risk = getWeatherRisk(maxTemp, 70, 12, precipitation);

    return {
      date: daily.time?.[index] ?? new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      maxTemp: Math.round(maxTemp),
      minTemp: Math.round(minTemp),
      precipitation: Math.round(precipitation),
      condition: getWeatherConditionLabel(weatherCode),
      risk,
    };
  });
};

export const buildWeatherCardFromApiResponse = (province: string, data: WeatherApiResponse): WeatherCard => {
  const current = data.current ?? {};
  const daily = data.daily ?? {};
  const temperature = current.temperature_2m ?? daily.temperature_2m_max?.[0] ?? 25;
  const humidity = current.relative_humidity_2m ?? 65;
  const wind = current.wind_speed_10m ?? 12;
  const precipitation = current.precipitation_probability ?? daily.precipitation_sum?.[0] ?? 0;
  const weatherCode = current.weather_code ?? daily.weather_code?.[0] ?? 0;

  const risk = getWeatherRisk(temperature, humidity, wind, precipitation);

  return {
    province,
    temp: Math.round(temperature),
    humidity: Math.round(humidity),
    wind: Math.round(wind),
    condition: getWeatherConditionLabel(weatherCode),
    risk,
    advice: getWeatherAdvice(risk, temperature, precipitation),
    source: 'live',
    dailyForecast: buildDailyForecast(data),
  };
};

const buildFallbackWeatherCard = (province: string): WeatherCard => ({
  province,
  temp: 29,
  humidity: 72,
  wind: 12,
  condition: 'Đang lấy dữ liệu',
  risk: 'Chưa có cập nhật',
  advice: 'Hệ thống đang thử kết nối lại với nguồn thời tiết trực tuyến.',
  source: 'fallback',
  dailyForecast: [],
});

const fetchWeatherData = async (coords: ProvinceCoord): Promise<WeatherApiResponse> => {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(coords.lat));
  url.searchParams.set('longitude', String(coords.lng));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum');
  url.searchParams.set('forecast_days', String(FORECAST_DAYS));
  url.searchParams.set('timezone', 'Asia/Bangkok');

  return new Promise<WeatherApiResponse>((resolve, reject) => {
    const req = https.get(url.toString(), (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(WEATHER_API.TIMEOUT_MS, () => {
      req.destroy(new Error('Weather API request timed out'));
    });
  });
};

export const getWeatherForecast = async (provinceNames: string[] = []): Promise<WeatherCard[]> => {
  const provinces = provinceNames.filter(Boolean);
  const targets = provinces.length > 0 ? provinces : [WEATHER_API.DEFAULT_PROVINCE];

  const cards = await Promise.all(
    targets.map(async (province) => {
      try {
        const coords = getProvinceCoords(province);
        const data = await fetchWeatherData(coords);
        return buildWeatherCardFromApiResponse(province, data);
      } catch {
        return buildFallbackWeatherCard(province);
      }
    })
  );

  return cards;
};

// ════════════════════════════════════════════════════════════════
// Cảnh báo thời tiết cực đoan — nắng nóng, mưa lớn, gió mạnh, rét đậm, hạn hán
// ════════════════════════════════════════════════════════════════

const THRESHOLDS: WeatherThresholds = {
  extremeHeatTemp: WEATHER_THRESHOLDS.EXTREME_HEAT_TEMP,
  extremeColdTemp: WEATHER_THRESHOLDS.EXTREME_COLD_TEMP,
  heavyRainMm: WEATHER_THRESHOLDS.HEAVY_RAIN_MM,
  strongWindKmh: WEATHER_THRESHOLDS.STRONG_WIND_KMH,
  droughtMm: WEATHER_THRESHOLDS.DROUGHT_MM,
  droughtDays: WEATHER_THRESHOLDS.DROUGHT_DAYS,
};

const ALERT_TYPE_LABELS: Record<WeatherAlertType, string> = {
  extreme_heat: 'Nắng nóng cực điểm',
  extreme_cold: 'Rét đậm cực mạnh',
  heavy_rain: 'Mưa lớn',
  strong_wind: 'Gió mạnh / Bão',
  drought: 'Hạn hán',
};

const ALERT_MESSAGES: Record<WeatherAlertType, { warning: string; critical: string }> = {
  extreme_heat: {
    warning: 'Cảnh báo nắng nóng: Nhiệt độ đang tăng cao, có thể ảnh hưởng đến cây trồng.',
    critical: 'CẢNH BÁO KHẨN CẤP: Nắng nóng cực điểm! Cần bảo vệ cây trồng ngay lập tức.',
  },
  extreme_cold: {
    warning: 'Cảnh báo rét đậm: Nhiệt độ đang giảm mạnh, có thể gây hại cho cây trồng.',
    critical: 'CẢNH BÁO KHẨN CẤP: Rét đậm cực mạnh! Cần bảo vệ cây trồng ngay lập tức.',
  },
  heavy_rain: {
    warning: 'Cảnh báo mưa lớn: Lượng mưa tăng cao, có nguy cơ ngập úng.',
    critical: 'CẢNH BÁO KHẨN CẤP: Mưa cực lớn! Nguy cơ ngập úng và sạt lở đất.',
  },
  strong_wind: {
    warning: 'Cảnh báo gió mạnh: Tốc độ gió đang tăng, có thể ảnh hưởng đến cây trồng.',
    critical: 'CẢNH BÁO KHẨN CẤP: Bão/gió cực mạnh! Cần cố định nhà kính, nhà lưới ngay.',
  },
  drought: {
    warning: 'Cảnh báo hạn hán: Lượng mưa thấp kéo dài, cần tăng cường tưới tiêu.',
    critical: 'CẢNH BÁO KHẨN CẤP: Hạn hán nghiêm trọng! Cần biện pháp tưới tiêu khẩn cấp.',
  },
};

type DetectedWeatherAlert = {
  type: WeatherAlertType;
  severity: WeatherAlertSeverity;
  detail: string;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const sleep = (delayMs: number) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

type ResolvedWeatherLocation = {
  coords: ProvinceCoord;
  precision: 'province' | 'district';
  resolvedName: string;
};

type GeocodingResult = {
  name?: string;
  latitude?: number;
  longitude?: number;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
};

type GeocodingResponse = { results?: GeocodingResult[] };

const LOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const locationCache = new Map<string, { value: ResolvedWeatherLocation; expiresAt: number }>();

const normalizeLocationText = (value?: string): string =>
  normalizeProvinceName(value || '')
    .replace(/^(quan|huyen|thi xa|thanh pho)\s+/, '')
    .replace(/\s+(city|province)$/g, '')
    .trim();

const provinceMatchesGeocode = (result: GeocodingResult, province: string): boolean => {
  const expected = normalizeLocationText(province);
  if (!expected) return true;
  const candidates = [result.admin1, result.admin2, result.admin3]
    .map(normalizeLocationText)
    .filter(Boolean);
  return candidates.some((candidate) =>
    candidate === expected || candidate.includes(expected) || expected.includes(candidate)
  );
};

const fetchGeocodingResults = async (name: string): Promise<GeocodingResult[]> => {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name);
  url.searchParams.set('count', '20');
  url.searchParams.set('language', 'vi');
  url.searchParams.set('format', 'json');
  url.searchParams.set('countryCode', 'VN');

  return new Promise<GeocodingResult[]>((resolve, reject) => {
    const req = https.get(url.toString(), (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const payload = JSON.parse(raw) as GeocodingResponse;
          resolve(payload.results || []);
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(WEATHER_API.TIMEOUT_MS, () => {
      req.destroy(new Error('Weather geocoding request timed out'));
    });
  });
};

const geocodeDistrict = async (province: string, district: string): Promise<ResolvedWeatherLocation | null> => {
  const rawDistrict = district.trim();
  const strippedDistrict = rawDistrict.replace(/^(Quận|Huyện|Thị xã|Thành phố)\s+/i, '').trim();
  const candidates = [rawDistrict, strippedDistrict];
  if (/^\d+$/.test(strippedDistrict)) candidates.push(`District ${strippedDistrict}`);

  for (const candidate of [...new Set(candidates.filter(Boolean))]) {
    try {
      const results = await fetchGeocodingResults(candidate);
      const match = results.find((result) =>
        result.country_code?.toUpperCase() === 'VN' &&
        Number.isFinite(result.latitude) &&
        Number.isFinite(result.longitude) &&
        provinceMatchesGeocode(result, province)
      );
      if (match?.latitude != null && match?.longitude != null) {
        return {
          coords: { lat: Number(match.latitude), lng: Number(match.longitude) },
          precision: 'district',
          resolvedName: match.name || rawDistrict,
        };
      }
    } catch (error) {
      log.warn('District geocoding failed', `${province}/${district}: ${getErrorMessage(error)}`);
    }
  }
  return null;
};

const geocodeProvince = async (province: string): Promise<ProvinceCoord | null> => {
  try {
    const results = await fetchGeocodingResults(province);
    const match = results.find((result) =>
      result.country_code?.toUpperCase() === 'VN' &&
      Number.isFinite(result.latitude) &&
      Number.isFinite(result.longitude)
    );
    if (match?.latitude != null && match?.longitude != null) {
      return { lat: Number(match.latitude), lng: Number(match.longitude) };
    }
  } catch (error) {
    log.warn('Province geocoding failed', `${province}: ${getErrorMessage(error)}`);
  }
  return null;
};

async function resolveWeatherLocation(province?: string, district?: string): Promise<ResolvedWeatherLocation> {
  const requestedProvince = province?.trim() || WEATHER_API.DEFAULT_PROVINCE;
  const requestedDistrict = district?.trim() || '';
  const cacheKey = `${normalizeProvinceName(requestedProvince)}|${normalizeProvinceName(requestedDistrict)}`;
  const cached = locationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  if (requestedDistrict) {
    const districtLocation = await geocodeDistrict(requestedProvince, requestedDistrict);
    if (districtLocation) {
      locationCache.set(cacheKey, { value: districtLocation, expiresAt: Date.now() + LOCATION_CACHE_TTL_MS });
      return districtLocation;
    }
  }

  const staticCoords = findStaticProvinceCoords(requestedProvince);
  const coords = staticCoords || await geocodeProvince(requestedProvince);
  if (!coords) {
    throw new AppError('Không thể xác định tọa độ khu vực đã chọn', 400);
  }

  const value: ResolvedWeatherLocation = {
    coords,
    precision: 'province',
    resolvedName: requestedProvince,
  };
  locationCache.set(cacheKey, { value, expiresAt: Date.now() + LOCATION_CACHE_TTL_MS });
  return value;
}

const userRepo = () => AppDataSource.getRepository(User);
const alertRepo = () => AppDataSource.getRepository(WeatherAlert);
const notificationRepo = () => AppDataSource.getRepository(Notification);

// Gọi provider chính (OWM nếu có key) → fallback Open-Meteo, dùng cho phát hiện cảnh báo.
async function fetchCurrentWeatherWithFallback(lat: number, lng: number): Promise<WeatherData> {
  if (openWeatherMapProvider.isAvailable()) {
    try {
      return await openWeatherMapProvider.fetchCurrent(lat, lng);
    } catch (error) {
      log.error('OpenWeatherMap error', getErrorMessage(error));
    }
  }
  return openMeteoProvider.fetchCurrent(lat, lng);
}

// Gọi provider chính (OWM nếu có key) → fallback Open-Meteo, dùng cho dự báo có icon/mô tả.
async function fetchForecastWithFallback(lat: number, lng: number): Promise<ForecastSummary[]> {
  if (openWeatherMapProvider.isAvailable()) {
    try {
      return await openWeatherMapProvider.fetchForecast(lat, lng);
    } catch (error) {
      log.error('OpenWeatherMap forecast error', getErrorMessage(error));
    }
  }
  try {
    return await openMeteoProvider.fetchForecast(lat, lng);
  } catch (error) {
    log.error('Open-Meteo forecast error', getErrorMessage(error));
    return [];
  }
}

/**
 * Thời tiết hiện tại của 1 tỉnh (kèm icon/mô tả) — dùng cho hero card ở FE
 */
export async function getCurrentWeatherForProvince(
  province?: string,
  district?: string
): Promise<WeatherData & {
  latitude: number;
  longitude: number;
  locationPrecision: 'province' | 'district';
  resolvedLocation: string;
}> {
  const location = await resolveWeatherLocation(province, district);
  const weather = await fetchCurrentWeatherWithFallback(location.coords.lat, location.coords.lng);
  return {
    ...weather,
    latitude: location.coords.lat,
    longitude: location.coords.lng,
    locationPrecision: location.precision,
    resolvedLocation: location.resolvedName,
  };
}

/**
 * Dự báo 5 ngày của tỉnh/quận đã chọn.
 */
export async function getDailyForecastForProvince(
  province?: string,
  district?: string
): Promise<ForecastSummary[]> {
  const location = await resolveWeatherLocation(province, district);
  return fetchForecastWithFallback(location.coords.lat, location.coords.lng);
}

/**
 * Toạ độ tất cả tỉnh/thành — dùng cho FE (bản đồ Windy, ...)
 */
export function getProvinceCoordsMap(): Record<string, ProvinceCoord> {
  return { ...PROVINCE_COORDS };
}

/**
 * Đối chiếu dữ liệu thời tiết hiện tại với ngưỡng cảnh báo hệ thống
 */
export function checkWeatherThresholds(
  weather: WeatherData,
  rainfall?: RainfallContext
): DetectedWeatherAlert[] {
  const alerts: DetectedWeatherAlert[] = [];

  if (weather.temp > THRESHOLDS.extremeHeatTemp + 5) {
    alerts.push({ type: 'extreme_heat', severity: 'critical', detail: `Nhiệt độ ${weather.temp}°C vượt ngưỡng ${THRESHOLDS.extremeHeatTemp}°C` });
  } else if (weather.temp > THRESHOLDS.extremeHeatTemp) {
    alerts.push({ type: 'extreme_heat', severity: 'warning', detail: `Nhiệt độ ${weather.temp}°C vượt ngưỡng ${THRESHOLDS.extremeHeatTemp}°C` });
  }

  if (weather.temp < THRESHOLDS.extremeColdTemp - 3) {
    alerts.push({ type: 'extreme_cold', severity: 'critical', detail: `Nhiệt độ ${weather.temp}°C thấp hơn ngưỡng ${THRESHOLDS.extremeColdTemp}°C` });
  } else if (weather.temp < THRESHOLDS.extremeColdTemp) {
    alerts.push({ type: 'extreme_cold', severity: 'warning', detail: `Nhiệt độ ${weather.temp}°C thấp hơn ngưỡng ${THRESHOLDS.extremeColdTemp}°C` });
  }

  // Mưa lớn dùng precipitation_sum thực của ngày, KHÔNG nhân rain1h × 24.
  if (rainfall) {
    const dailyRain = Math.max(0, rainfall.todayRainMm || 0);
    if (dailyRain > THRESHOLDS.heavyRainMm * 1.5) {
      alerts.push({ type: 'heavy_rain', severity: 'critical', detail: `Tổng lượng mưa ngày ${dailyRain.toFixed(0)}mm vượt ngưỡng ${THRESHOLDS.heavyRainMm}mm/ngày` });
    } else if (dailyRain > THRESHOLDS.heavyRainMm) {
      alerts.push({ type: 'heavy_rain', severity: 'warning', detail: `Tổng lượng mưa ngày ${dailyRain.toFixed(0)}mm vượt ngưỡng ${THRESHOLDS.heavyRainMm}mm/ngày` });
    }
  }

  if (weather.windSpeed > THRESHOLDS.strongWindKmh * 1.5) {
    alerts.push({ type: 'strong_wind', severity: 'critical', detail: `Tốc độ gió ${weather.windSpeed.toFixed(0)}km/h vượt ngưỡng ${THRESHOLDS.strongWindKmh}km/h` });
  } else if (weather.windSpeed > THRESHOLDS.strongWindKmh) {
    alerts.push({ type: 'strong_wind', severity: 'warning', detail: `Tốc độ gió ${weather.windSpeed.toFixed(0)}km/h vượt ngưỡng ${THRESHOLDS.strongWindKmh}km/h` });
  }

  // Hạn hán chỉ được kết luận khi có đủ dữ liệu mưa lịch sử đúng số ngày cấu hình.
  if (rainfall && rainfall.recentDays >= THRESHOLDS.droughtDays) {
    const recentRain = Math.max(0, rainfall.recentRainMm || 0);
    if (recentRain <= THRESHOLDS.droughtMm * 0.5) {
      alerts.push({
        type: 'drought',
        severity: 'critical',
        detail: `Tổng lượng mưa ${rainfall.recentDays} ngày gần nhất ${recentRain.toFixed(1)}mm, thấp hơn ngưỡng ${THRESHOLDS.droughtMm}mm/${THRESHOLDS.droughtDays} ngày`,
      });
    } else if (recentRain <= THRESHOLDS.droughtMm) {
      alerts.push({
        type: 'drought',
        severity: 'warning',
        detail: `Tổng lượng mưa ${rainfall.recentDays} ngày gần nhất ${recentRain.toFixed(1)}mm, thấp hơn ngưỡng ${THRESHOLDS.droughtMm}mm/${THRESHOLDS.droughtDays} ngày`,
      });
    }
  }

  return alerts;
}

// Tạo bản ghi WeatherAlert + Notification cho 1 user, có chống trùng trong DUPLICATE_ALERT_WINDOW_MS.
// Trả về true nếu tạo mới (dùng để đếm alertCount).
async function createAlertForUser(
  user: User,
  province: string,
  weather: WeatherData,
  alert: DetectedWeatherAlert
): Promise<boolean> {
  const since = new Date(Date.now() - WEATHER_API.DUPLICATE_ALERT_WINDOW_MS);
  const existingAlert = await alertRepo()
    .createQueryBuilder('alert')
    .where('alert.userId = :userId', { userId: user.id })
    .andWhere('alert.alertType = :alertType', { alertType: alert.type })
    .andWhere('alert.createdAt >= :since', { since })
    .getOne();

  if (existingAlert) return false;

  const message = ALERT_MESSAGES[alert.type][alert.severity];

  const savedAlert = await alertRepo().save(
    alertRepo().create({
      userId: user.id,
      alertType: alert.type,
      severity: alert.severity,
      province,
      district: user.district,
      latitude: user.latitude,
      longitude: user.longitude,
      temperature: weather.temp,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      rain1h: weather.rain1h,
      rain24h: weather.rain24h,
      weatherDescription: weather.description,
      weatherIcon: weather.icon,
      thresholdExceeded: alert.detail,
      message,
    })
  );

  await notificationRepo().save(
    notificationRepo().create({
      userId: user.id,
      type: 'weather_alert',
      title: `Cảnh báo thời tiết: ${ALERT_TYPE_LABELS[alert.type]}`,
      message,
      relatedId: savedAlert.id,
      relatedModel: 'WeatherAlert',
      severity: alert.severity,
    })
  );

  return true;
}

async function fetchWeatherAssessment(lat: number, lng: number): Promise<{
  weather: WeatherData;
  rainfall?: RainfallContext;
}> {
  const [weather, rainfallResult] = await Promise.all([
    fetchCurrentWeatherWithFallback(lat, lng),
    fetchRainfallContext(lat, lng, THRESHOLDS.droughtDays)
      .then((value) => ({ ok: true as const, value }))
      .catch((error) => {
        log.warn('Rainfall history unavailable', getErrorMessage(error));
        return { ok: false as const };
      }),
  ]);

  const rainfall = rainfallResult.ok ? rainfallResult.value : undefined;
  return {
    weather: rainfall ? { ...weather, rain24h: rainfall.todayRainMm } : weather,
    rainfall,
  };
}

/**
 * Kiểm tra thời tiết cho toàn bộ user có vị trí — dùng cho cron job
 */
export async function runWeatherCheckForAllUsers(): Promise<number> {
  let alertCount = 0;

  const users = await userRepo()
    .createQueryBuilder('user')
    .where('user.isActive = :isActive', { isActive: true })
    .andWhere('(user.province IS NOT NULL OR user.latitude IS NOT NULL)')
    .getMany();

  const provinceMap = new Map<string, User[]>();
  const coordUsers: User[] = [];

  for (const user of users) {
    if (user.latitude != null && user.longitude != null) {
      coordUsers.push(user);
    } else if (user.province) {
      const existing = provinceMap.get(user.province) || [];
      existing.push(user);
      provinceMap.set(user.province, existing);
    }
  }

  for (const [province, provinceUsers] of provinceMap.entries()) {
    try {
      const location = await resolveWeatherLocation(province);
      const { weather, rainfall } = await fetchWeatherAssessment(location.coords.lat, location.coords.lng);
      const detectedAlerts = checkWeatherThresholds(weather, rainfall);
      for (const alert of detectedAlerts) {
        for (const user of provinceUsers) {
          if (await createAlertForUser(user, province, weather, alert)) alertCount++;
        }
      }
    } catch (error) {
      log.error(`Weather check failed for province ${province}`, getErrorMessage(error));
    }

    // Rate limiting: 60 calls/min trên gói free
    await sleep(WEATHER_API.RATE_LIMIT_DELAY_MS);
  }

  for (const user of coordUsers) {
    try {
      const { weather, rainfall } = await fetchWeatherAssessment(user.latitude, user.longitude);
      const detectedAlerts = checkWeatherThresholds(weather, rainfall);
      for (const alert of detectedAlerts) {
        if (await createAlertForUser(user, user.province || 'Unknown', weather, alert)) alertCount++;
      }
    } catch (error) {
      log.error(`Weather check failed for user ${user.id}`, getErrorMessage(error));
    }

    await sleep(WEATHER_API.RATE_LIMIT_DELAY_MS);
  }

  return alertCount;
}

/**
 * Dọn dẹp cảnh báo cũ đã đọc (>30 ngày) — dùng cho cron job
 */
export async function cleanupOldAlerts(): Promise<number> {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);

  const result = await alertRepo()
    .createQueryBuilder()
    .delete()
    .from(WeatherAlert)
    .where('isRead = :isRead', { isRead: true })
    .andWhere('createdAt < :cutoff', { cutoff })
    .execute();

  return result.affected || 0;
}

/**
 * Lấy danh sách cảnh báo thời tiết của 1 user
 */
export async function getAlertsForUser(
  userId: string,
  page: number = 1,
  limit: number = 20,
  province?: string,
  district?: string
) {
  const safePage = Math.max(1, Math.trunc(page || 1));
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit || 20)));
  const qb = alertRepo()
    .createQueryBuilder('alert')
    .where('alert.userId = :userId', { userId });

  if (province?.trim()) {
    qb.andWhere('alert.province = :province', { province: province.trim() });
  }
  if (district?.trim()) {
    qb.andWhere('alert.district = :district', { district: district.trim() });
  }

  const [alerts, total] = await qb
    .orderBy('alert.createdAt', 'DESC')
    .skip((safePage - 1) * safeLimit)
    .take(safeLimit)
    .getManyAndCount();

  return {
    alerts,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

/**
 * Đánh dấu 1 cảnh báo là đã đọc
 */
export async function markAlertAsRead(alertId: string, userId: string) {
  const alert = await alertRepo().findOne({ where: { id: alertId, userId } });
  if (!alert) throw new AppError('Cảnh báo không tồn tại', 404);

  if (!alert.isRead) {
    alert.isRead = true;
    await alertRepo().save(alert);
  }

  return alert;
}

/**
 * Đánh dấu toàn bộ cảnh báo của user là đã đọc
 */
export async function markAllAlertsAsRead(
  userId: string,
  province?: string,
  district?: string
): Promise<void> {
  const qb = alertRepo()
    .createQueryBuilder()
    .update(WeatherAlert)
    .set({ isRead: true })
    .where('userId = :userId', { userId })
    .andWhere('isRead = :isRead', { isRead: false });

  if (province?.trim()) qb.andWhere('province = :province', { province: province.trim() });
  if (district?.trim()) qb.andWhere('district = :district', { district: district.trim() });

  await qb.execute();
}

/**
 * Đếm số cảnh báo chưa đọc của user
 */
export async function getUnreadAlertCount(userId: string): Promise<number> {
  return alertRepo().count({ where: { userId, isRead: false } });
}

/**
 * Lấy ngưỡng cảnh báo hệ thống (hiển thị ở FE)
 */
export function getWeatherThresholds(): WeatherThresholds {
  return { ...THRESHOLDS };
}
