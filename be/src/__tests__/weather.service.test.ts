import { buildWeatherCardFromApiResponse } from '../services/weather.service';

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
