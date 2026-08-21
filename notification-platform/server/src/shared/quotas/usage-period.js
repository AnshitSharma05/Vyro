/**
 * Helper to compute UTC monthly billing period start and end timestamps.
 *
 * @param {Date} [referenceDate] - Date to compute period for (default now)
 * @returns {{ periodStart: Date, periodEnd: Date, periodKey: string }}
 */
function getCurrentBillingPeriod(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  const periodStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  // Last millisecond of month
  const periodEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  return {
    periodStart,
    periodEnd,
    periodKey,
  };
}

module.exports = {
  getCurrentBillingPeriod,
};
