const eventService = require('./event.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');

class EventController {
  ingest = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { event, externalEventId, recipient, data } = req.body;

    const result = await eventService.ingestEvent({
      projectId,
      eventName: event,
      externalEventId,
      recipient,
      data,
    });

    return ApiResponse.success(res, 'Event accepted for processing', result, 202);
  });

  get = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { eventId } = req.params;

    const event = await eventService.getEvent(projectId, eventId);
    return ApiResponse.success(res, 'Event details retrieved successfully', { event }, 200);
  });

  list = asyncHandler(async (req, res) => {
    const projectId = req.project.id;
    const { page, limit } = req.query;

    const result = await eventService.listEvents(projectId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return ApiResponse.success(res, 'Events retrieved successfully', result, 200);
  });
}

module.exports = new EventController();
