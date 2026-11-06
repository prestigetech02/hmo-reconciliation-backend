'use strict';

const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const { QUEUES } = require('./constants');

/**
 * Queue instances — created once and reused.
 * Each Queue requires its own Redis connection per BullMQ requirements.
 */
const documentProcessingQueue = new Queue(QUEUES.DOCUMENT_PROCESSING, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

const reconciliationQueue = new Queue(QUEUES.RECONCILIATION, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 200 },
  },
});

module.exports = { documentProcessingQueue, reconciliationQueue };
