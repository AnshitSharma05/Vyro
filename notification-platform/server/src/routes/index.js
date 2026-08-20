const { Router } = require('express');
const authRoutes = require('../modules/auth/auth.routes');

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Auth module routes
router.use('/auth', authRoutes);

module.exports = router;
