const { hashPassword, comparePassword } = require('../../src/shared/utils/password');

describe('Password Utility Unit Tests', () => {
  it('should correctly hash a password and verify matching password', async () => {
    const rawPassword = 'SecurePassword123!';
    const hashedPassword = await hashPassword(rawPassword);

    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).not.toEqual(rawPassword);

    const isMatch = await comparePassword(rawPassword, hashedPassword);
    expect(isMatch).toBe(true);
  });

  it('should return false for incorrect password verification', async () => {
    const rawPassword = 'SecurePassword123!';
    const hashedPassword = await hashPassword(rawPassword);

    const isMatch = await comparePassword('WrongPassword123!', hashedPassword);
    expect(isMatch).toBe(false);
  });
});
