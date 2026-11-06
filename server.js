'use strict';

const app = require('./src/app');
const config = require('./src/shared/config');
const { connectDatabase } = require('./src/shared/config/database');
const { getRedisClient } = require('./src/shared/config/redis');

async function startServer() {
  try {
    // 1. Connect to MongoDB Atlas
    await connectDatabase();

    // 2. Initialise Redis (optional — required only for background job queues)
    //    Server starts without Redis; auth endpoints are unaffected.
    try {
      const redis = getRedisClient();
      // Silence unhandled connection errors — they are logged by the client itself
      redis.on('error', () => {});
    } catch (redisErr) {
      console.warn('[Redis] Not available — background queues disabled:', redisErr.message);
    }

    // 3. Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(
        `[Server] Running in ${config.env} mode on port ${config.port}`,
      );
      console.log(`[Server] Health: http://localhost:${config.port}${config.apiPrefix}/health`);
    });

    // ─── Graceful Shutdown ──────────────────────────────────────────────────
    const shutdown = (signal) => {
      console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });

      // Force exit if shutdown takes too long
      setTimeout(() => {
        console.error('[Server] Forced exit after timeout.');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    // Catch unhandled rejections — log and exit so the process manager restarts
    process.on('unhandledRejection', (reason) => {
      console.error('[Server] Unhandled Rejection:', reason);
      shutdown('unhandledRejection');
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
}

startServer();
