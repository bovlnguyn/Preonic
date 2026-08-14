import { buildWeatherCardFromApiResponse, checkWeatherThresholds } from '../services/weather.service';

describe('buildWeatherCardFromApiResponse', () => {
  it('maps live weather payload into UI-friendly weather card data', () => {
    const card = buildWeatherCardFromApiResponse('Đà Nẵng', {
      current: {
        temperature_2m: 33,
        relative_humidity_2m: 78,
        precipitation_probability: 80,
        weather_code: 61,
        wind_speed_10m: 20,
      },
      daily: {
        weather_code: [61],
        temperature_2m_max: [35],
        temperature_2m_min: [26],
        precipitation_sum: [120],
      },
    });

    expect(card.province).toBe('Đà Nẵng');
    expect(card.temp).toBe(33);
    expect(card.condition).toBe('Mưa');
    expect(card.risk).toBe('Ngập úng và mưa lớn');
    expect(card.source).toBe('live');
  });
});


describe('checkWeatherThresholds', () => {
  const calmWeather = {
    temp: 30,
    humidity: 70,
    windSpeed: 10,
    rain1h: 0,
    rain24h: 0,
    description: 'Trời quang',
    icon: '01d',
  };

  it('does not infer drought or heavy rain from current rain alone', () => {
    const alerts = checkWeatherThresholds(calmWeather);
    expect(alerts.some((alert) => alert.type === 'drought')).toBe(false);
    expect(alerts.some((alert) => alert.type === 'heavy_rain')).toBe(false);
  });

  it('detects drought only from enough historical daily rainfall data', () => {
    const alerts = checkWeatherThresholds(calmWeather, {
      todayRainMm: 0,
      recentRainMm: 2,
      recentDays: 14,
    });
    expect(alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'drought', severity: 'critical' }),
    ]));
  });

  it('uses real daily precipitation sum for heavy-rain alert', () => {
    const alerts = checkWeatherThresholds(calmWeather, {
      todayRainMm: 120,
      recentRainMm: 40,
      recentDays: 14,
    });
    expect(alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'heavy_rain', severity: 'warning' }),
    ]));
    expect(alerts.some((alert) => alert.type === 'drought')).toBe(false);
  });
});
