const { generateToken, verifyToken } = require('../../src/shared/utils/jwt');
const AuthenticationError = require('../../src/shared/errors/authentication-error');

describe('JWT Utility Unit Tests', () => {
  it('should generate a valid JWT token and verify payload', () => {
    const payload = { sub: 'usr-12345', email: 'test@example.com' };
    const token = generateToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded.sub).toBe('usr-12345');
    expect(decoded.email).toBe('test@example.com');
  });

  it('should throw AuthenticationError for malformed token', () => {
    expect(() => verifyToken('invalid.jwt.token')).toThrow(AuthenticationError);
  });
});
