const NotFoundError = require('../shared/errors/not-found-error');

const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Route not found - ${req.originalUrl}`));
};

module.exports = notFoundHandler;
