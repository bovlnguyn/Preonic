import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import {
  getWeatherForecast,
  getCurrentWeatherForProvince,
  getDailyForecastForProvince,
  getProvinceCoordsMap,
  getAlertsForUser,
  markAlertAsRead,
  markAllAlertsAsRead,
  getUnreadAlertCount,
  getWeatherThresholds,
} from '../services/weather.service';
import { sendError } from '../utils/controller.util';

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
    sendError(res, error, 'Không thể lấy dữ liệu thời tiết');
  }
};

export const getCurrentWeather = async (req: Request, res: Response) => {
  try {
    const province = typeof req.query.province === 'string' ? req.query.province : undefined;
    const weather = await getCurrentWeatherForProvince(province);

    res.status(200).json({ success: true, data: weather });
  } catch (error: any) {
    sendError(res, error, 'Không thể lấy thời tiết hiện tại');
  }
};

export const getDailyForecast = async (req: Request, res: Response) => {
  try {
    const province = typeof req.query.province === 'string' ? req.query.province : undefined;
    const forecast = await getDailyForecastForProvince(province);

    res.status(200).json({ success: true, data: forecast });
  } catch (error: any) {
    sendError(res, error, 'Không thể lấy dự báo thời tiết');
  }
};

export const getProvinceCoordsList = async (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: getProvinceCoordsMap() });
};

export const getThresholds = async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: getWeatherThresholds(),
  });
};

export const getWeatherAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await getAlertsForUser(req.user!.id, page, limit);

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    sendError(res, error, 'Không thể lấy danh sách cảnh báo thời tiết');
  }
};

export const getWeatherUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const unreadCount = await getUnreadAlertCount(req.user!.id);

    res.status(200).json({ success: true, data: { unreadCount } });
  } catch (error: any) {
    sendError(res, error, 'Không thể lấy số cảnh báo chưa đọc');
  }
};

export const markWeatherAlertRead = async (req: AuthRequest, res: Response) => {
  try {
    const alert = await markAlertAsRead(req.params.id, req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu cảnh báo là đã đọc',
      data: { alert },
    });
  } catch (error: any) {
    sendError(res, error, 'Không thể đánh dấu cảnh báo là đã đọc');
  }
};

export const markAllWeatherAlertsRead = async (req: AuthRequest, res: Response) => {
  try {
    await markAllAlertsAsRead(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tất cả cảnh báo là đã đọc',
    });
  } catch (error: any) {
    sendError(res, error, 'Không thể đánh dấu tất cả cảnh báo');
  }
};
