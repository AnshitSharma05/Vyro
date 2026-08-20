const jwt = require('jsonwebtoken');
const config = require('../../config/env');
const AuthenticationError = require('../errors/authentication-error');

const generateToken = (payload, options = {}) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN || '7d',
    ...options,
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Authentication token has expired');
    }
    throw new AuthenticationError('Invalid authentication token');
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
