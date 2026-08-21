const { hasPermission, PERMISSIONS, ROLE_PERMISSIONS } = require('../../src/shared/auth/permissions');
const { validateScopes, API_KEY_SCOPES } = require('../../src/shared/auth/scopes');

describe('RBAC & Scope Unit Tests (PHASE 17)', () => {
  describe('Role-Permission Matrix', () => {
    it('1. OWNER has full access permissions including ORGANIZATION_DELETE', () => {
      expect(hasPermission('OWNER', PERMISSIONS.ORGANIZATION_DELETE)).toBe(true);
      expect(hasPermission('OWNER', PERMISSIONS.MEMBERS_MANAGE)).toBe(true);
      expect(hasPermission('OWNER', PERMISSIONS.NOTIFICATIONS_SEND)).toBe(true);
    });

    it('2. ADMIN has MANAGEMENT permissions but lacks ORGANIZATION_DELETE', () => {
      expect(hasPermission('ADMIN', PERMISSIONS.ORGANIZATION_DELETE)).toBe(false);
      expect(hasPermission('ADMIN', PERMISSIONS.MEMBERS_MANAGE)).toBe(true);
      expect(hasPermission('ADMIN', PERMISSIONS.PROJECTS_CREATE)).toBe(true);
      expect(hasPermission('ADMIN', PERMISSIONS.API_KEYS_CREATE)).toBe(true);
    });

    it('3. MEMBER has OPERATIONAL permissions but lacks MEMBERS_MANAGE and API_KEYS_CREATE', () => {
      expect(hasPermission('MEMBER', PERMISSIONS.NOTIFICATIONS_SEND)).toBe(true);
      expect(hasPermission('MEMBER', PERMISSIONS.TEMPLATES_READ)).toBe(true);
      expect(hasPermission('MEMBER', PERMISSIONS.MEMBERS_MANAGE)).toBe(false);
      expect(hasPermission('MEMBER', PERMISSIONS.API_KEYS_CREATE)).toBe(false);
    });

    it('4. VIEWER is strictly READ-ONLY and lacks write/send permissions', () => {
      expect(hasPermission('VIEWER', PERMISSIONS.NOTIFICATIONS_READ)).toBe(true);
      expect(hasPermission('VIEWER', PERMISSIONS.TEMPLATES_READ)).toBe(true);
      expect(hasPermission('VIEWER', PERMISSIONS.ANALYTICS_READ)).toBe(true);

      expect(hasPermission('VIEWER', PERMISSIONS.NOTIFICATIONS_SEND)).toBe(false);
      expect(hasPermission('VIEWER', PERMISSIONS.TEMPLATES_CREATE)).toBe(false);
      expect(hasPermission('VIEWER', PERMISSIONS.API_KEYS_CREATE)).toBe(false);
    });
  });

  describe('API Key Scope Validation', () => {
    it('1. Validates standard scope strings successfully', () => {
      const result = validateScopes([
        API_KEY_SCOPES.NOTIFICATIONS_SEND,
        API_KEY_SCOPES.NOTIFICATIONS_READ,
        API_KEY_SCOPES.TEMPLATES_READ,
      ]);

      expect(result.valid).toBe(true);
      expect(result.invalidScopes.length).toBe(0);
    });

    it('2. Rejects invalid or unrecognised scope strings', () => {
      const result = validateScopes(['notifications:send', 'invalid:scope']);

      expect(result.valid).toBe(false);
      expect(result.invalidScopes).toContain('invalid:scope');
    });
  });
});
