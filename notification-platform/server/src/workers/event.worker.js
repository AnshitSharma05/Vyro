const { Worker, UnrecoverableError } = require('bullmq');
const connection = require('../config/redis');
const config = require('../config/env');
const eventRepository = require('../modules/events/event.repository');
const workflowRepository = require('../modules/workflows/workflow.repository');
const notificationService = require('../modules/notifications/notification.service');
const logger = require('../shared/utils/logger');
const { EVENT_QUEUE_NAME } = require('../queues/event.queue');

/**
 * Core event processing handler matching active workflows and executing notification actions.
 *
 * @param {import('bullmq').Job} job
 */
async function processEventJob(job) {
  const { eventId } = job.data;
  if (!eventId) {
    logger.error({ jobId: job.id }, 'BullMQ event job missing eventId');
    throw new UnrecoverableError('Invalid event job payload: missing eventId');
  }

  const eventLog = await eventRepository.findById(eventId);
  if (!eventLog) {
    logger.error({ jobId: job.id, eventId }, 'EventLog record not found in PostgreSQL');
    throw new UnrecoverableError(`EventLog ${eventId} not found in database`);
  }

  // 1. Fetch active workflows matching event name & project ID
  const activeWorkflows = await workflowRepository.findActiveByEventName(eventLog.projectId, eventLog.eventName);

  if (activeWorkflows.length === 0) {
    logger.info(
      { jobId: job.id, eventId, eventName: eventLog.eventName, projectId: eventLog.projectId },
      '[EVENT WORKER] No active workflows matched for event. Marking processed.'
    );
    await eventRepository.updateStatus(eventId, 'COMPLETED');
    return;
  }

  await eventRepository.updateStatus(eventId, 'PROCESSING');

  // 2. Process each active workflow execution
  for (const workflow of activeWorkflows) {
    let execution;
    try {
      // Create Workflow Execution (Atomic idempotency check)
      execution = await workflowRepository.createExecution({
        workflowId: workflow.id,
        eventId: eventLog.id,
      });
    } catch (createErr) {
      if (createErr.code === 'P2002') {
        logger.info(
          { eventId, workflowId: workflow.id },
          '[EVENT WORKER] Workflow execution already exists for event. Skipping duplicate.'
        );
        continue;
      }
      throw createErr;
    }

    try {
      // Execute ordered workflow notification actions
      for (const action of workflow.actions) {
        const scheduledAt = action.delaySeconds > 0
          ? new Date(Date.now() + action.delaySeconds * 1000).toISOString()
          : null;

        const notifResult = await notificationService.sendNotification({
          projectId: eventLog.projectId,
          channel: action.channel,
          templateName: action.templateName,
          category: action.category,
          recipient: eventLog.recipient,
          data: eventLog.payload || {},
          scheduledAt,
        });

        await workflowRepository.createActionExecution({
          workflowExecutionId: execution.id,
          workflowActionId: action.id,
          notificationId: notifResult.id,
          status: 'COMPLETED',
          scheduledAt,
        });
      }

      await workflowRepository.updateExecutionStatus(execution.id, {
        status: 'COMPLETED',
      });
    } catch (actionErr) {
      logger.error(
        { eventId, workflowId: workflow.id, error: actionErr.message },
        '[EVENT WORKER] Workflow action execution failed'
      );

      if (execution) {
        await workflowRepository.updateExecutionStatus(execution.id, {
          status: 'FAILED',
          error: actionErr.message,
        });
      }
    }
  }

  await eventRepository.updateStatus(eventId, 'COMPLETED');

  logger.info(
    { jobId: job.id, eventId, eventName: eventLog.eventName, matchedWorkflows: activeWorkflows.length },
    '[EVENT WORKER] Event processing completed successfully'
  );
}

let eventWorker = null;

if (config.NODE_ENV !== 'test') {
  eventWorker = new Worker(EVENT_QUEUE_NAME, processEventJob, {
    connection,
    concurrency: 5,
  });

  eventWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'BullMQ event job completed successfully');
  });

  eventWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'BullMQ event job failed');
  });
}

module.exports = {
  processEventJob,
  eventWorker,
};
