'use strict';

require('dotenv').config();

/**
 * Central configuration module.
 * All environment variables are read and validated here.
 * No other file should call process.env directly.
 */

function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key, defaultValue) {
  return process.env[key] ?? defaultValue;
}

const config = {
  env: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '5000'), 10),
  apiPrefix: optional('API_PREFIX', '/api/v1'),

  db: {
    uri: required('MONGODB_URI'),
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  redis: {
    host: optional('REDIS_HOST', '127.0.0.1'),
    port: parseInt(optional('REDIS_PORT', '6379'), 10),
    password: optional('REDIS_PASSWORD', undefined),
  },

  upload: {
    maxFileSizeMb: parseInt(optional('MAX_FILE_SIZE_MB', '20'), 10),
    dest: optional('UPLOAD_DEST', 'uploads/'),
    allowedMimeTypes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'image/png',
      'image/jpeg',
    ],
    allowedExtensions: ['.csv', '.xls', '.xlsx', '.pdf', '.png', '.jpg', '.jpeg'],
  },

  rateLimit: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    maxRequests: parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
    authMax: parseInt(optional('AUTH_RATE_LIMIT_MAX', '10'), 10),
  },

  cors: {
    allowedOrigins: optional('ALLOWED_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
  },
};

module.exports = config;
