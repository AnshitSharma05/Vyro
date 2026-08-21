const { Router } = require('express');
const analyticsController = require('./analytics.controller');
const authenticate = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validation.middleware');
const { analyticsOverviewSchema, organizationAnalyticsSchema } = require('./analytics.validation');

const router = Router();

// All analytics routes require JWT human authentication
router.use(authenticate);

router.get('/overview', validate(analyticsOverviewSchema), analyticsController.getOverview);
router.get('/channels', validate(analyticsOverviewSchema), analyticsController.getChannels);
router.get('/organization', validate(organizationAnalyticsSchema), analyticsController.getOrganization);

module.exports = router;
