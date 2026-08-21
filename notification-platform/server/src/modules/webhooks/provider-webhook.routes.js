const { Router } = require('express');
const providerWebhookController = require('./provider-webhook.controller');

const router = Router();

// Unauthenticated public route for provider webhook callbacks (e.g. POST /api/v1/webhooks/providers/mock)
router.post('/providers/:provider', providerWebhookController.handleProviderWebhook);

module.exports = router;
