import { Router, RequestHandler } from 'express';
import {
  getWeather,
  getCurrentWeather,
  getDailyForecast,
  getProvinceCoordsList,
  getThresholds,
  getWeatherAlerts,
  getWeatherUnreadCount,
  markWeatherAlertRead,
  markAllWeatherAlertsRead,
} from '../controller/weather.controller';
import { protect } from '../middlewares/auth.middlewares';
import { validateWeatherAlertIdParam } from '../middlewares/validation';

const router = Router();

router.get('/forecast', getWeather);
router.get('/current', getCurrentWeather);
router.get('/daily-forecast', getDailyForecast);
router.get('/provinces', getProvinceCoordsList);
router.get('/thresholds', getThresholds);
router.get('/alerts', protect as RequestHandler, getWeatherAlerts as RequestHandler);
router.get('/alerts/unread-count', protect as RequestHandler, getWeatherUnreadCount as RequestHandler);
router.patch('/alerts/read-all', protect as RequestHandler, markAllWeatherAlertsRead as RequestHandler);
router.patch('/alerts/:id/read', protect as RequestHandler, validateWeatherAlertIdParam as RequestHandler[], markWeatherAlertRead as RequestHandler);

export default router;
