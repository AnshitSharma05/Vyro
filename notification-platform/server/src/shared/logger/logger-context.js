const logger = require('./logger');

const getLoggerWithContext = (context = {}) => {
  return logger.child(context);
};

module.exports = {
  getLoggerWithContext,
};
