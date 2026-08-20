const authService = require('../../src/modules/auth/auth.service');
const authRepository = require('../../src/modules/auth/auth.repository');
const ConflictError = require('../../src/shared/errors/conflict-error');
const AuthenticationError = require('../../src/shared/errors/authentication-error');
const { hashPassword } = require('../../src/shared/utils/password');

jest.mock('../../src/modules/auth/auth.repository');

describe('AuthService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      authRepository.findByEmail.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue({
        id: 'uuid-user-1',
        email: 'newuser@example.com',
        name: 'New User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.register({
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New User',
      });

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.token).toBeDefined();
      expect(authRepository.createUser).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictError if email is already registered', async () => {
      authRepository.findByEmail.mockResolvedValue({
        id: 'existing-id',
        email: 'existing@example.com',
      });

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'Password123!',
          name: 'Existing User',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    it('should successfully authenticate valid credentials', async () => {
      const hashedPassword = await hashPassword('Password123!');
      authRepository.findByEmail.mockResolvedValue({
        id: 'uuid-user-1',
        email: 'user@example.com',
        passwordHash: hashedPassword,
        name: 'User',
      });

      const result = await authService.login({
        email: 'user@example.com',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('user@example.com');
      expect(result.user.passwordHash).toBeUndefined();
      expect(result.token).toBeDefined();
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      authRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for incorrect password', async () => {
      const hashedPassword = await hashPassword('Password123!');
      authRepository.findByEmail.mockResolvedValue({
        id: 'uuid-user-1',
        email: 'user@example.com',
        passwordHash: hashedPassword,
      });

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'WrongPassword123!',
        })
      ).rejects.toThrow(AuthenticationError);
    });
  });
});
