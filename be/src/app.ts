import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';

import { isDatabaseConnected } from './config/database';
import { createLogger } from './utils/logger';

const log        = createLogger('App');
const API_PREFIX = process.env.API_PREFIX ?? '/api/v1';

const app: Application = express();

// ══════════════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════════════

// Security headers
app.use(helmet());

// CORS — đọc từ .env, hỗ trợ nhiều origin
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS?.split(',') ?? []),
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép request không có origin (Postman, mobile...)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,             // Cần cho httpOnly cookie refresh token
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser (dùng cho refresh token httpOnly cookie)
app.use(cookieParser());

// Gzip compression
app.use(compression());

// HTTP request logger (chỉ dev)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static file serve (ảnh upload)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ══════════════════════════════════════════════════════
// DB HEALTH GUARD
// Trả 503 nếu DB chưa sẵn sàng — giữ nguyên từ file gốc
// ══════════════════════════════════════════════════════
app.use(`${API_PREFIX}`, (req: Request, res: Response, next: NextFunction) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      status:  'error',
      message: 'Database is temporarily unavailable. Please try again later.',
    });
  }
  next();
});

// ══════════════════════════════════════════════════════
// HEALTH CHECK — public, không cần DB
// ══════════════════════════════════════════════════════
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status:    'success',
    message:   'PreOnic API is running',
    database:  isDatabaseConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ══════════════════════════════════════════════════════
// ROUTES — import và gắn vào đây
// ══════════════════════════════════════════════════════
// import authRoutes       from './routes/auth.routes';
// import productRoutes    from './routes/product.routes';
// import contractRoutes   from './routes/contract.routes';
// import escrowRoutes     from './routes/escrow.routes';
// import paymentRoutes    from './routes/payment.routes';
// import weatherRoutes    from './routes/weather.routes';
// import notifRoutes      from './routes/notification.routes';
// import messagingRoutes  from './routes/messaging.routes';
// import uploadRoutes     from './routes/upload.routes';
// import partnerRoutes    from './routes/partner-rating.routes';
// import farmerRoutes     from './routes/farmer.routes';
// import enterpriseRoutes from './routes/enterprise.routes';

// app.use(`${API_PREFIX}/auth`,           authRoutes);
// app.use(`${API_PREFIX}/products`,       productRoutes);
// app.use(`${API_PREFIX}/contracts`,      contractRoutes);
// app.use(`${API_PREFIX}/escrow`,         escrowRoutes);
// app.use(`${API_PREFIX}/payment`,        paymentRoutes);
// app.use(`${API_PREFIX}/weather`,        weatherRoutes);
// app.use(`${API_PREFIX}/notifications`,  notifRoutes);
// app.use(`${API_PREFIX}/messaging`,      messagingRoutes);
// app.use(`${API_PREFIX}/upload`,         uploadRoutes);
// app.use(`${API_PREFIX}/partner-ratings`,partnerRoutes);
// app.use(`${API_PREFIX}/farmer`,         farmerRoutes);
// app.use(`${API_PREFIX}/enterprise`,     enterpriseRoutes);

// ══════════════════════════════════════════════════════
// 404 HANDLER
// ══════════════════════════════════════════════════════
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    status:  'error',
    message: `Route not found`,
  });
});

// ══════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER
// ══════════════════════════════════════════════════════
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status  = err.statusCode ?? err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';

  log.error(`[${status}] ${message}`);
  if (process.env.NODE_ENV === 'development') {
    log.error(err.stack);
  }

  res.status(status).json({
    success: false,
    status:  'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;