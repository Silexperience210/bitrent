/**
 * BitRent Backend Server
 * Phase 2: Nostr Authentication & Security
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/env.js';

// Middleware imports
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimit } from './middleware/rateLimit.js';

// Routes imports
import authRoutes from './routes/auth.js';
import healthRoutes from './routes/health.js';
import clientRoutes from './routes/client.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';

const app = express();

/**
 * Security Middleware
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.isProduction() ? [] : undefined,
    },
  },
  hsts: config.isProduction() ? { maxAge: 31536000, includeSubDomains: true } : undefined,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

/**
 * CORS Configuration
 */
app.use(cors({
  origin: config.api.corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * Request Parsing Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/**
 * Logging Middleware
 */
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
});

/**
 * API Rate Limiting
 */
app.use('/api/', apiRateLimit);

/**
 * Health Check Route (no auth required)
 */
app.use('/api/health', healthRoutes);

/**
 * Authentication Routes
 */
app.use('/api/auth', authRoutes);

/**
 * Client Routes (protected)
 */
app.use('/api/client', clientRoutes);

/**
 * Admin Routes (protected, admin-only)
 */
app.use('/api/admin', adminRoutes);

/**
 * Payment Routes (protected)
 */
app.use('/api/payments', paymentRoutes);

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

/**
 * Global Error Handler
 */
app.use(errorHandler);

/**
 * Start Server
 */
const PORT = config.port || 3000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║          BitRent Backend Server                        ║
║          Phase 2: Nostr Authentication                 ║
╚═══════════════════════════════════════════════════════╝

🚀 Server running on port ${PORT}
🌍 Environment: ${config.nodeEnv}
📡 CORS Origin: ${config.api.corsOrigin}
🔐 JWT Secret: ${config.jwt.secret ? '✓ Set' : '✗ Missing'}
🗄️  Database: ${config.supabase.url ? '✓ Configured' : '✗ Missing'}

Available Routes:
- POST   /api/auth/nostr-challenge     Generate challenge
- POST   /api/auth/nostr-verify        Verify signature & login
- GET    /api/auth/profile             Get user profile
- POST   /api/auth/refresh             Refresh token
- POST   /api/auth/logout              Logout

- GET    /api/health/status            Health check

Start time: ${new Date().toISOString()}
  `);
});

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[SERVER] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[SERVER] SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('[SERVER] Server closed');
    process.exit(0);
  });
});

/**
 * Unhandled Promise Rejection
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
