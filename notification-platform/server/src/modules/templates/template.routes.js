const { Router } = require('express');
const templateController = require('./template.controller');
const authenticate = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validation.middleware');
const {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesSchema,
  getTemplateSchema,
  deleteTemplateSchema,
  previewTemplateSchema,
} = require('./template.validation');

const router = Router({ mergeParams: true });

// All template endpoints require JWT human authentication
router.use(authenticate);

router.post('/', validate(createTemplateSchema), templateController.create);
router.get('/', validate(listTemplatesSchema), templateController.list);
router.post('/preview', validate(previewTemplateSchema), templateController.preview);
router.get('/:templateId', validate(getTemplateSchema), templateController.get);
router.patch('/:templateId', validate(updateTemplateSchema), templateController.update);
router.delete('/:templateId', validate(deleteTemplateSchema), templateController.delete);

module.exports = router;
