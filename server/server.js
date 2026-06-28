'use strict';

// ── Load environment variables first — everything else depends on them ────────
require('dotenv').config();

const http                   = require('http');
const createApp              = require('./app');
const { connectDB }          = require('./src/config/database');
const { connectRedis }       = require('./src/config/redis');
const env                    = require('./src/config/env');
const logger                 = require('./src/shared/utils/logger');

// These are initialised after DB + Redis are ready
let initSocket;
let initJobs;
let activityService;

/**
 * bootstrap — ordered startup sequence.
 *
 * Order matters:
 *   1. Connect MongoDB  (models need this)
 *   2. Connect Redis    (BullMQ + rate limiter need this)
 *   3. Create Express app
 *   4. Create HTTP server
 *   5. Register activity event listeners (eventBus must be ready)
 *   6. Register email event listeners
 *   7. Initialise Socket.io (attaches to HTTP server)
 *   8. Start BullMQ workers
 *   9. Start listening
 */
async function bootstrap() {
  try {
    // 1. Database
    await connectDB();

    // 2. Cache / queue backend
    await connectRedis();

    // 3 + 4. Express + HTTP server
    const app    = createApp();
    const server = http.createServer(app);

    // 5. Activity logging listeners (subscribes to eventBus events)
    activityService = require('./src/modules/activity/activity.service');
    activityService.registerListeners();

    // 6. Email module listeners (bridges eventBus → BullMQ email queue)
    require('./src/modules/email/email.module');

    // 7. Socket.io
    initSocket = require('./src/modules/realtime/socket').initSocket;
    initSocket(server);

    // 8. Background job workers
    initJobs = require('./src/jobs/index').initJobs;
    initJobs();

    // 9. Listen
    server.listen(env.PORT, () => {
      logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });

    // ── Graceful shutdown ──────────────────────────────────────────────────
    async function shutdown(signal) {
      logger.info(`${signal} received — shutting down gracefully...`);

      server.close(async () => {
        try {
          const mongoose = require('mongoose');
          await mongoose.connection.close();
          logger.info('MongoDB connection closed');

          const { getRedis } = require('./src/config/redis');
          await getRedis().quit();
          logger.info('Redis connection closed');

          logger.info('Shutdown complete');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', err.message);
          process.exit(1);
        }
      });

      // Force-kill if connections don't close within 15 seconds
      setTimeout(() => {
        logger.error('Graceful shutdown timed out — forcing exit');
        process.exit(1);
      }, 15_000);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    // ── Unhandled errors ───────────────────────────────────────────────────
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection:', reason);
      if (env.isProduction()) shutdown('unhandledRejection');
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception:', err);
      shutdown('uncaughtException');
    });

  } catch (err) {
    logger.error('Bootstrap failed:', err.message);
    process.exit(1);
  }
}

bootstrap();
