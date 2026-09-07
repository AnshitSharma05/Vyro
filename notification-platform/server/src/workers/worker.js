const { createNotificationWorker } = require('./notification.worker');
const { transportMode } = require('../providers/email/nodemailer.client');
const prisma = require('../config/database');
const logger = require('../shared/utils/logger');

logger.info('Starting Notification Platform Background Worker Process...');
logger.info({ transportMode }, 'Email transport mode for this worker');

const worker = createNotificationWorker();

logger.info('Background Worker active and listening to "notifications" queue.');

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down worker process gracefully...`);

  try {
    if (worker) {
      await worker.close();
      logger.info('BullMQ worker closed.');
    }

    await prisma.$disconnect();
    logger.info('Prisma disconnected.');

    process.exit(0);
  } catch (error) {
    logger.error({ error: error.message }, 'Error during worker graceful shutdown');
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
