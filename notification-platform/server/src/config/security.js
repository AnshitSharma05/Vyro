const config = require('./env');

const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = config.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());

  if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-API-Key, Idempotency-Key, X-Idempotency-Key, X-Request-ID'
    );
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  }

  return res.status(403).json({
    success: false,
    error: {
      code: 'CORS_VIOLATION',
      message: `CORS policy violation: Origin ${origin} not allowed`,
    },
  });
};

const helmetMiddleware = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
};

const pinoRedactPaths = [
  'req.headers.authorization',
  'req.headers["x-api-key"]',
  'req.headers["authorization"]',
  'headers.authorization',
  'headers["x-api-key"]',
  'password',
  'secret',
  'token',
  'apiKey',
  'rawKey',
  'smtpPass',
  'webhookSecret',
];

module.exports = {
  corsOptions,
  corsMiddleware: cors(corsOptions),
  helmetMiddleware,
  pinoRedactPaths,
};
