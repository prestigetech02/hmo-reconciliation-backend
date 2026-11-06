'use strict';

const express = require('express');
const { getDatabaseStatus } = require('../../shared/config/database');
const { getRedisStatus } = require('../../shared/config/redis');
const config = require('../../shared/config');

const router = express.Router();

/**
 * GET /api/v1/health
 *
 * Returns application and dependency health status.
 * Database details are included in all environments for now.
 * In production, consider restricting this to internal/monitoring IPs only.
 */
router.get('/', async (_req, res) => {
  const dbStatus = getDatabaseStatus();
  const redisStatus = getRedisStatus();

  const isHealthy = dbStatus === 'connected' && (redisStatus === 'ready' || redisStatus === 'connected' || redisStatus === 'reconnecting');

  return res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      environment: config.env,
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbStatus,
        queue: redisStatus,
      },
    },
  });
});

module.exports = router;
