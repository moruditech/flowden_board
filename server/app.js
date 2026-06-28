'use strict';

const express        = require('express');
const helmet         = require('helmet');
const cors           = require('cors');
const morgan         = require('morgan');
const compression    = require('compression');
const cookieParser   = require('cookie-parser');
const mongoSanitize  = require('express-mongo-sanitize');
const hpp            = require('hpp');

const env            = require('./src/config/env');
const { globalLimiter }  = require('./src/shared/middleware/rateLimiter');
const requestLogger  = require('./src/shared/middleware/requestLogger');
const notFound       = require('./src/shared/middleware/notFound');
const errorHandler   = require('./src/shared/middleware/errorHandler');
const routes         = require('./src/routes/index');

/**
 * createApp — Express application factory.
 *
 * Returns a configured Express app without starting the HTTP server.
 * Separating app creation from server startup makes integration testing
 * easy — tests import createApp() and wrap it with supertest directly.
 */
function createApp() {
  const app = express();

  // ── Trust proxy ───────────────────────────────────────────────────────────
  // Required for accurate req.ip and rate limiting behind Nginx / load balancers
  app.set('trust proxy', 1);

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = env.CLIENT_URL.split(',').map((o) => o.trim());

  app.use(cors({
    origin(origin, callback) {
      // Allow requests with no origin (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    credentials:     true,
    methods:         ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders:  ['Content-Type', 'Authorization'],
    exposedHeaders:  ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  }));

  // ── Body parsers ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // ── Data sanitisation ─────────────────────────────────────────────────────
  // Strips $ and . from user input to prevent NoSQL injection attacks
  app.use(mongoSanitize());

  // Prevents HTTP Parameter Pollution (e.g. ?sort=asc&sort=desc)
  app.use(hpp());

  // ── Compression ───────────────────────────────────────────────────────────
  app.use(compression());

  // ── Request logging ───────────────────────────────────────────────────────
  if (env.isDevelopment()) {
    // Human-readable, coloured output for local development
    app.use(morgan('dev'));
  } else if (env.isProduction()) {
    // Structured JSON log per request in production
    app.use(requestLogger);
  }
  // Silent in test environment

  // ── Global rate limiter ───────────────────────────────────────────────────
  app.use(globalLimiter);

  // ── Health check ──────────────────────────────────────────────────────────
  // No auth required — used by Docker healthcheck and load balancers
  app.get('/health', (req, res) => {
    res.status(200).json({
      status:    'ok',
      timestamp: new Date().toISOString(),
      uptime:    Math.floor(process.uptime()),
      env:       env.NODE_ENV,
    });
  });

  // ── API v1 routes ─────────────────────────────────────────────────────────
  app.use('/api/v1', routes);

  // ── Error handling (must be last) ─────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
