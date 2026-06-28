'use strict';

const { createEmailWorker }   = require('../modules/email/email.worker');
const { createCleanupWorker } = require('./workers/cleanup.worker');
const logger = require('../shared/utils/logger');

/**
 * initJobs — starts all BullMQ workers.
 * Called once from server.js after Redis is ready.
 */
function initJobs() {
  createEmailWorker();
  createCleanupWorker();
  logger.info('[JOBS] All workers started');
}

module.exports = { initJobs };
