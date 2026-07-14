import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import './config/passport';
import passport from 'passport';
import contractRoutes from './routes/contract.routes';
// Import Routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import enterpriseRoutes from './routes/enterprise.routes';

// Import Config/Utils
import { isDatabaseConnected } from './config/database';
import { createLogger } from './utils/logger';

const log = createLogger('App');
const API_PREFIX = process.env.API_PREFIX ?? '/api/v1';

const app: Application = express();

// ══════════════════════════════════════════════════════
// 1. GLOBAL MIDDLEWARES (Phải đặt trước các Route)
// ══════════════════════════════════════════════════════
app.use(helmet()); // Security headers

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS?.split(',') ?? []),
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Body parsing (BẮT BUỘC ĐẶT TRƯỚC ROUTES)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());
// Thêm sau dòng app.use(cookieParser());
app.use(passport.initialize());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ══════════════════════════════════════════════════════
// 2. DB HEALTH GUARD
// ══════════════════════════════════════════════════════
app.use(`${API_PREFIX}`, (req: Request, res: Response, next: NextFunction) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      success: false,
      status: 'error',
      message: 'Database is temporarily unavailable. Please try again later.',
    });
  }
  next();
});

// ══════════════════════════════════════════════════════
// 3. ROUTES
// ══════════════════════════════════════════════════════
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'PreOnic API is running',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Gắn các route vào đây
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/contracts`, contractRoutes);
app.use(`${API_PREFIX}/enterprise`, enterpriseRoutes);
// Các route khác bạn sẽ mở comment và thêm vào sau...

// ══════════════════════════════════════════════════════
// 4. ERROR HANDLING (Phải đặt sau cùng)
// ══════════════════════════════════════════════════════

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    status: 'error',
    message: `Route not found`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.statusCode ?? err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';

  log.error(`[${status}] ${message}`);
  
  res.status(status).json({
    success: false,
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;