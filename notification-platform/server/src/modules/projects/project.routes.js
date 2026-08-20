const { Router } = require('express');
const projectController = require('./project.controller');
const authenticate = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validation.middleware');
const {
  createProjectSchema,
  listProjectsSchema,
  getProjectSchema,
  updateProjectSchema,
} = require('./project.validation');

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', validate(createProjectSchema), projectController.create);
router.get('/', validate(listProjectsSchema), projectController.list);
router.get('/:projectId', validate(getProjectSchema), projectController.get);
router.patch('/:projectId', validate(updateProjectSchema), projectController.update);

module.exports = router;
