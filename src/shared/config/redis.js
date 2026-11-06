'use strict';

const { Redis } = require('ioredis');
const config = require('../config');

let redisClient = null;

/**
 * Returns a shared Redis client instance (singleton).
 * BullMQ requires a dedicated connection per Queue/Worker;
 * use getRedisConnection() to get a fresh connection for those.
 */
function getRedisClient() {
  if (!redisClient) {
    redisClient = createConnection();
  }
  return redisClient;
}

/**
 * Creates a new Redis connection.
 * BullMQ requires separate connection instances for each Queue and Worker.
 * Call this when initialising queues or workers.
 */
function getRedisConnection() {
  return createConnection();
}

function createConnection() {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Required by BullMQ
  });

  client.on('connect', () => console.log('[Redis] Connected'));
  client.on('error', (err) => console.error('[Redis] Error:', err.message));

  return client;
}

/**
 * Returns the Redis connection status string.
 * Used by the health check endpoint.
 */
function getRedisStatus() {
  if (!redisClient) return 'not_initialised';
  return redisClient.status; // 'ready', 'connecting', 'end', etc.
}

module.exports = { getRedisClient, getRedisConnection, getRedisStatus };
