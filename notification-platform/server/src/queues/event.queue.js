const { Queue } = require('bullmq');
const { connection, defaultJobOptions } = require('./queue.config');

const EVENT_QUEUE_NAME = 'event-processing';

const eventQueue = new Queue(EVENT_QUEUE_NAME, {
  connection,
  defaultJobOptions,
});

/**
 * Enqueues an event processing job into BullMQ.
 *
 * @param {{ eventId: string }} payload
 * @returns {Promise<import('bullmq').Job>}
 */
const addEventJob = async ({ eventId }) => {
  return eventQueue.add('process-event', { eventId }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  });
};

module.exports = {
  eventQueue,
  addEventJob,
  EVENT_QUEUE_NAME,
};
