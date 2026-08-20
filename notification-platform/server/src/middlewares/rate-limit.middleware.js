// Rate limiting middleware placeholder / pass-through for Phase 2
const rateLimitMiddleware = (req, res, next) => {
  next();
};

module.exports = rateLimitMiddleware;
