const { Router } = require('express');
const apiKeyController = require('./api-key.controller');
const authenticate = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validation.middleware');
const {
  createApiKeySchema,
  listApiKeysSchema,
  revokeApiKeySchema,
} = require('./api-key.validation');

const router = Router({ mergeParams: true });

// All API key management endpoints require JWT human authentication
router.use(authenticate);

router.post('/', validate(createApiKeySchema), apiKeyController.create);
router.get('/', validate(listApiKeysSchema), apiKeyController.list);
router.post('/:apiKeyId/revoke', validate(revokeApiKeySchema), apiKeyController.revoke);

module.exports = router;
