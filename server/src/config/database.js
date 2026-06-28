'use strict';

const mongoose = require('mongoose');
const env      = require('./env');
const logger   = require('../shared/utils/logger');

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          45000,
  maxPoolSize:              10,
  minPoolSize:              2,
};

async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, MONGO_OPTIONS);
    logger.info(`MongoDB connected → ${conn.connection.host} / ${conn.connection.name}`);
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    throw err;
  }
}

async function disconnectDB() {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected');
}

// ── Connection event listeners ────────────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected — Mongoose will attempt to reconnect');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB error: ${err.message}`);
});

module.exports = { connectDB, disconnectDB };
