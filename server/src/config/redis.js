'use strict';

const Redis  = require('ioredis');
const env    = require('./env');
const logger = require('../shared/utils/logger');

// ── Shared base config ────────────────────────────────────────────────────────
const BASE_CONFIG = {
  host:                 env.REDIS_HOST,
  port:                 env.REDIS_PORT,
  password:             env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,   // Required by BullMQ
  enableReadyCheck:     false,  // Required by BullMQ
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    logger.warn(`Redis retry attempt ${times} — reconnecting in ${delay}ms`);
    return delay;
  },
};

// ── Main application client (lazy-connect so we can await) ───────────────────
let mainClient = null;

async function connectRedis() {
  mainClient = new Redis({ ...BASE_CONFIG, db: 0, lazyConnect: true });

  mainClient.on('connect',      () => logger.info('Redis connected'));
  mainClient.on('ready',        () => logger.info('Redis ready'));
  mainClient.on('error',  (err) => logger.error(`Redis error: ${err.message}`));
  mainClient.on('close',        () => logger.warn('Redis connection closed'));
  mainClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await mainClient.connect();
}

/**
 * Returns the singleton Redis client.
 * Throws if connectRedis() has not been called yet.
 */
function getRedis() {
  if (!mainClient) {
    throw new Error('Redis client not initialised. Call connectRedis() first.');
  }
  return mainClient;
}

/**
 * Creates a fresh Redis connection for BullMQ.
 * BullMQ requires its own dedicated connection — it must NOT share
 * the application client because it sets maxRetriesPerRequest: null.
 */
function getBullConn() {
  return new Redis({ ...BASE_CONFIG, db: env.BULL_REDIS_DB });
}

module.exports = { connectRedis, getRedis, getBullConn };
