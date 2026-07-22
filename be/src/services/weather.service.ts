import https from 'https';
import { URL } from 'url';
import { WEATHER_API } from '../constants';
import { PROVINCE_COORDS, ProvinceCoord } from '../data/provinces';

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
    .replace(/[\u0300-\u036f]/g, '')
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
  };

  const resolvedName = aliasMap[normalized] ?? province;
  const coords = PROVINCE_COORDS[resolvedName] ?? PROVINCE_COORDS[province];

  return coords ?? WEATHER_API.DEFAULT_COORDS;
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
  const daysCount = 7;

  return Array.from({ length: daysCount }, (_, index) => {
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
  url.searchParams.set('forecast_days', '7');
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
