const { Router } = require('express');
const healthController = require('./health.controller');

const router = Router();

// /health and /health/live return liveness probe
router.get('/', healthController.liveness);
router.get('/live', healthController.liveness);

// /health/ready returns deep readiness probe
router.get('/ready', healthController.readiness);

module.exports = router;
