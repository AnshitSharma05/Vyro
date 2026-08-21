const analyticsService = require('../../src/modules/analytics/analytics.service');
const ValidationError = require('../../src/shared/errors/validation-error');

describe('Analytics Service Unit Tests', () => {
  describe('parseDateRange', () => {
    it('1. Returns default 7-day range when range is omitted', () => {
      const { startDate, endDate } = analyticsService.parseDateRange({});
      expect(startDate).toBeDefined();
      expect(endDate).toBeDefined();
      const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it('2. Throws ValidationError if custom range exceeds 365 days', () => {
      const start = '2024-01-01';
      const end = '2025-06-01'; // > 365 days
      expect(() =>
        analyticsService.parseDateRange({ range: 'custom', startDate: start, endDate: end })
      ).toThrow(ValidationError);
    });

    it('3. Throws ValidationError if startDate is after endDate', () => {
      expect(() =>
        analyticsService.parseDateRange({
          range: 'custom',
          startDate: '2026-08-20',
          endDate: '2026-08-10',
        })
      ).toThrow(ValidationError);
    });
  });
});
