import { Request } from 'express';

// ── Chỉ lưu các field cần thiết trong request ──
export interface AuthUserPayload {
  id:       string;
  email:    string;
  role:     'farmer' | 'enterprise' | 'admin';
  fullName: string;
}

// ── Request có kèm user sau khi xác thực JWT ──
export interface AuthRequest extends Request {
  user?: AuthUserPayload;   // ← dùng AuthUserPayload thay vì User
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

// ── Payload bên trong JWT token ──
export interface JwtUserPayload {
  id:   string;
  role: 'farmer' | 'enterprise' | 'admin';
  iat?: number;
  exp?: number;
}

// ── Khuôn dạng response chuẩn trả về client ──
export interface ApiResponse<T = any> {
  success: boolean;
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

// ── Dữ liệu thời tiết hiện tại (chuẩn hoá từ các provider) ──
export interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  rain1h: number;
  rain24h: number;
  description: string;
  icon: string;
}

export type WeatherAlertType = 'extreme_heat' | 'extreme_cold' | 'heavy_rain' | 'strong_wind' | 'drought';
export type WeatherAlertSeverity = 'warning' | 'critical';

export interface WeatherThresholds {
  extremeHeatTemp: number;
  extremeColdTemp: number;
  heavyRainMm: number;
  strongWindKmh: number;
  droughtMm: number;
  droughtDays: number;
}