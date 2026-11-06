'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./shared/config');
const requestId = require('./shared/middleware/requestId');
const errorHandler = require('./shared/middleware/errorHandler');
const AppError = require('./shared/utils/AppError');

// ─── Route Modules ────────────────────────────────────────────────────────────
const healthRoutes = require('./modules/dashboard/health.routes');
const { authRouter, userRouter } = require('./modules/auth/auth.routes');
// Future modules registered here as they are built:
// const documentRoutes    = require('./modules/documents/documents.routes');
// const reconcileRoutes   = require('./modules/reconciliation/reconciliation.routes');
// const exceptionRoutes   = require('./modules/exceptions/exceptions.routes');
// const dashboardRoutes   = require('./modules/dashboard/dashboard.routes');
// const providerRoutes    = require('./modules/providers/providers.routes');

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin) return callback(null, true);
      if (config.cors.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS policy does not allow origin: ${origin}`));
    },
    credentials: true,
  }),
);

// ─── Request Logging ──────────────────────────────────────────────────────────
if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// ─── Request ID ───────────────────────────────────────────────────────────────
app.use(requestId);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        details: [],
      },
    },
  }),
);

// ─── Routes ───────────────────────────────────────────────────────────────────
const API = config.apiPrefix;

app.use(`${API}/health`,  healthRoutes);
app.use(`${API}/auth`,    authRouter);
app.use(`${API}/users`,   userRouter);
// app.use(`${API}/imports`,             documentRoutes);
// app.use(`${API}/reconciliation`,      reconcileRoutes);
// app.use(`${API}/exceptions`,          exceptionRoutes);
// app.use(`${API}/dashboard`,           dashboardRoutes);
// app.use(`${API}/hmos`,                providerRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found.`, 404, 'NOT_FOUND'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be registered last
app.use(errorHandler);

module.exports = app;
