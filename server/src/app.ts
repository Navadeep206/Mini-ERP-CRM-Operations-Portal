import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config';

const app: Application = express();

// Secure HTTP headers with Helmet
app.use(helmet());

// Secure Cross-Origin Resource Sharing (allow localhost for dev, CLIENT_URL for prod)
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: config.env === 'development' ? '*' : clientUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Protect payload overflow by restricting body size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging suitable for development / production
if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Rate limit credentials login routes to prevent brute-force attacks
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
    });
  },
});

app.use('/api/auth/login', loginRateLimiter);

// Root route for cloud deployment health check compatibility
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Nexus ERP API Server is running',
    environment: config.env,
  });
});

// API Routes
app.use('/api', apiRouter);

// Catch-all route handler for undefined endpoints
app.use((req: Request, _res: Response, next: NextFunction) => {
  const error: any = new Error(`Route not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Centralized error handler middleware
app.use(errorHandler);

export default app;
