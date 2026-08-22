const logger = require('../utils/logger');
const prisma = require('../../config/database');
const redis = require('../../config/redis');

let isShuttingDown = false;

/**
 * Register graceful shutdown listeners for SIGTERM and SIGINT.
 *
 * @param {Object} options
 * @param {Object} [options.server] - HTTP Server instance
 * @param {Array<Object>} [options.workers] - Array of BullMQ Worker instances
 * @param {number} [options.timeoutMs=10000] - Maximum graceful shutdown timeout in ms
 */
function registerGracefulShutdown({ server = null, workers = [], timeoutMs = 10000 } = {}) {
  const shutdown = async (signal) => {
    if (isShuttingDown) {
      logger.warn(`[SHUTDOWN] Received secondary signal (${signal}). Shutdown already in progress...`);
      return;
    }

    isShuttingDown = true;
    logger.info(`[SHUTDOWN] Initiating graceful shutdown on signal: ${signal}`);

    // Set a hard timeout timer
    const forceExitTimer = setTimeout(() => {
      logger.error(`[SHUTDOWN] Graceful shutdown timed out after ${timeoutMs}ms. Forcing process exit.`);
      process.exit(1);
    }, timeoutMs);

    forceExitTimer.unref();

    try {
      // 1. Stop HTTP Server from accepting new requests
      if (server && typeof server.close === 'function') {
        logger.info('[SHUTDOWN] Closing HTTP server listener...');
        await new Promise((resolve) => {
          server.close((err) => {
            if (err) logger.error({ err }, '[SHUTDOWN] Error closing HTTP server listener');
            else logger.info('[SHUTDOWN] HTTP server listener closed successfully.');
            resolve();
          });
        });
      }

      // 2. Pause and close BullMQ Workers
      if (Array.isArray(workers) && workers.length > 0) {
        logger.info(`[SHUTDOWN] Closing ${workers.length} BullMQ worker process(es)...`);
        for (const worker of workers) {
          if (worker && typeof worker.close === 'function') {
            await worker.close();
          }
        }
        logger.info('[SHUTDOWN] All BullMQ workers closed.');
      }

      // 3. Disconnect Redis client
      if (redis && typeof redis.quit === 'function') {
        logger.info('[SHUTDOWN] Disconnecting Redis client...');
        await redis.quit().catch((rErr) => logger.error({ err: rErr }, '[SHUTDOWN] Redis disconnect error'));
        logger.info('[SHUTDOWN] Redis client disconnected.');
      }

      // 4. Disconnect Prisma ORM Database connection
      logger.info('[SHUTDOWN] Disconnecting PostgreSQL Prisma client...');
      await prisma.$disconnect().catch((pErr) => logger.error({ err: pErr }, '[SHUTDOWN] Prisma disconnect error'));
      logger.info('[SHUTDOWN] PostgreSQL Prisma client disconnected.');

      logger.info('[SHUTDOWN] Graceful shutdown completed cleanly.');
      process.exit(0);
    } catch (shutdownErr) {
      logger.error({ err: shutdownErr }, '[SHUTDOWN] Unexpected error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = {
  registerGracefulShutdown,
};
