const eventRepository = require('./event.repository');
const { addEventJob } = require('../../queues/event.queue');
const NotFoundError = require('../../shared/errors/not-found-error');
const logger = require('../../shared/utils/logger');

class EventService {
  async ingestEvent({ projectId, eventName, externalEventId, recipient, data }) {
    const projectRepository = require('../projects/project.repository');
    const quotaService = require('../../shared/quotas/quota.service');
    const usageService = require('../usage/usage.service');

    const project = await projectRepository.findProjectById(projectId);

    // 1. Idempotency Check
    const existing = await eventRepository.findByExternalEventId(projectId, externalEventId);
    if (existing) {
      logger.info({ projectId, externalEventId, eventId: existing.id }, '[EVENT SERVICE] Replaying existing event ingestion');
      return {
        eventId: existing.id,
        status: existing.status,
        replayed: true,
      };
    }

    // 2. Quota Check for EVENTS Metric
    if (project && project.organizationId) {
      await quotaService.checkMeteredQuota(project.organizationId, 'EVENTS', 1);
    }

    // 3. Persist Event
    const eventRecord = await eventRepository.create({
      projectId,
      eventName,
      externalEventId,
      recipient,
      payload: data,
    });

    // 4. Record EVENTS Metered Usage
    if (project && project.organizationId) {
      usageService.recordUsage(project.organizationId, 'EVENTS', 1).catch(() => {});
    }

    // 5. Enqueue Event Processing Job into BullMQ
    await addEventJob({ eventId: eventRecord.id });

    logger.info({ projectId, eventName, eventId: eventRecord.id }, '[EVENT SERVICE] Event ingested and queued for workflow execution');

    return {
      eventId: eventRecord.id,
      status: 'RECEIVED',
      replayed: false,
    };
  }

  async getEvent(projectId, id) {
    const event = await eventRepository.findById(id);
    if (!event || event.projectId !== projectId) {
      throw new NotFoundError(`Event "${id}" not found`);
    }
    return event;
  }

  async listEvents(projectId, pagination) {
    return eventRepository.findByProjectId(projectId, pagination);
  }
}

module.exports = new EventService();
