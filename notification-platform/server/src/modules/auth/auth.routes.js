const { Router } = require('express');
const authController = require('./auth.controller');
const validate = require('../../middlewares/validation.middleware');
const authenticate = require('../../middlewares/auth.middleware');
const { registerSchema, loginSchema } = require('./auth.validation');
const { rateLimitIpAuthLogin } = require('../../middlewares/rate-limit.middleware');

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', rateLimitIpAuthLogin, validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
