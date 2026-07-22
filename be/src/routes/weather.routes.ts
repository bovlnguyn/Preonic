import { Router } from 'express';
import { getWeather } from '../controller/weather.controller';

const router = Router();

router.get('/forecast', getWeather);

export default router;
