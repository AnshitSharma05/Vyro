const app = require('./app');
const config = require('./config/env');
const logger = require('./shared/utils/logger');
const { registerGracefulShutdown } = require('./shared/shutdown/graceful-shutdown');
const { notificationWorker } = require('./workers/notification.worker');
const { eventWorker } = require('./workers/event.worker');

const server = app.listen(config.PORT, () => {
  logger.info(`Server running in ${config.NODE_ENV} mode on port ${config.PORT}`);
});

registerGracefulShutdown({
  server,
  workers: [notificationWorker, eventWorker],
  timeoutMs: 10000,
});

module.exports = server;
