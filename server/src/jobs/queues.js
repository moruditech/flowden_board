'use strict';

const { Queue }    = require('bullmq');
const { getBullConn } = require('../config/redis');
const logger       = require('../shared/utils/logger');

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff:  { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail:     { count: 50  },
};

let cleanupQueue = null;

function getCleanupQueue() {
  if (!cleanupQueue) {
    cleanupQueue = new Queue('cleanup', {
      connection:        getBullConn(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    cleanupQueue.on('error', (err) => logger.error(`[CLEANUP-QUEUE] ${err.message}`));
  }
  return cleanupQueue;
}

module.exports = { getCleanupQueue };
