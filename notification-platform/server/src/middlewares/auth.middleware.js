const { verifyToken } = require('../shared/utils/jwt');
const AuthenticationError = require('../shared/errors/authentication-error');
const authRepository = require('../modules/auth/auth.repository');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AuthenticationError('Authentication token is required');
    }

    const decoded = verifyToken(token);

    const user = await authRepository.findById(decoded.sub);

    if (!user) {
      throw new AuthenticationError('User account associated with token no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
