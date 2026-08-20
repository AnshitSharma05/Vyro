const authRepository = require('./auth.repository');
const { hashPassword, comparePassword } = require('../../shared/utils/password');
const { generateToken } = require('../../shared/utils/jwt');
const ConflictError = require('../../shared/errors/conflict-error');
const AuthenticationError = require('../../shared/errors/authentication-error');
const NotFoundError = require('../../shared/errors/not-found-error');
const { AUTH_MESSAGES } = require('./auth.constants');

class AuthService {
  async register({ email, password, name }) {
    const existingUser = await authRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError(AUTH_MESSAGES.EMAIL_IN_USE);
    }

    const passwordHash = await hashPassword(password);
    const user = await authRepository.createUser({
      email,
      passwordHash,
      name,
    });

    const token = generateToken({
      sub: user.id,
      email: user.email,
    });

    return { user, token };
  }

  async login({ email, password }) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const token = generateToken({
      sub: user.id,
      email: user.email,
    });

    const { passwordHash: _, ...sanitizedUser } = user;

    return { user: sanitizedUser, token };
  }

  async getCurrentUser(userId) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(AUTH_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }
}

module.exports = new AuthService();
