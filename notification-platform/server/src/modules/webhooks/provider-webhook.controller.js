const webhookService = require('./webhook.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');

class ProviderWebhookController {
  /**
   * Unauthenticated Public Handler: POST /api/v1/webhooks/providers/:provider
   */
  handleProviderWebhook = asyncHandler(async (req, res) => {
    const { provider } = req.params;
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const signature =
      req.headers['x-provider-signature'] ||
      req.headers['x-mock-signature'] ||
      req.headers['x-signature'];

    const result = await webhookService.processInboundProviderWebhook({
      providerName: provider,
      rawBody,
      signature,
      body: req.body,
    });

    return ApiResponse.success(
      res,
      result.duplicate ? 'Provider event already processed' : 'Provider webhook processed successfully',
      { event: result.event },
      200
    );
  });
}

module.exports = new ProviderWebhookController();
