import { Request, Response } from 'express';
import { getWeatherForecast } from '../services/weather.service';

export const getWeather = async (req: Request, res: Response) => {
  try {
    const rawProvinces = req.query.provinces;
    const provinces = typeof rawProvinces === 'string'
      ? rawProvinces.split(',').map((item) => item.trim()).filter(Boolean)
      : [];

    const weatherCards = await getWeatherForecast(provinces);

    res.status(200).json({
      success: true,
      data: {
        weatherCards,
        count: weatherCards.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message ?? 'Không thể lấy dữ liệu thời tiết',
    });
  }
};
