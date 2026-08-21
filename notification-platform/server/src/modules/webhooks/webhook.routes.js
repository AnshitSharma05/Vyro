const { Router } = require('express');
const webhookController = require('./webhook.controller');
const authenticate = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validation.middleware');
const {
  createWebhookSchema,
  updateWebhookSchema,
  webhookParamSchema,
  listDeliveriesSchema,
} = require('./webhook.validation');

const router = Router({ mergeParams: true });

// All customer webhook management routes require JWT human authentication
router.use(authenticate);

router.post('/', validate(createWebhookSchema), webhookController.create);
router.get('/', webhookController.list);
router.get('/:webhookId', validate(webhookParamSchema), webhookController.get);
router.patch('/:webhookId', validate(updateWebhookSchema), webhookController.update);
router.delete('/:webhookId', validate(webhookParamSchema), webhookController.delete);
router.get('/:webhookId/deliveries', validate(listDeliveriesSchema), webhookController.listDeliveries);

module.exports = router;
