const runNotificationLoadTest = require('./notifications.load');
const runEventLoadTest = require('./events.load');
const runQuotaLoadTest = require('./quotas.load');
const runIdempotencyLoadTest = require('./idempotency.load');
const runRateLimitLoadTest = require('./rate-limit.load');

function formatResultRow(name, result) {
  const reqSec = result.requests ? Math.round(result.requests.average || result.requests.mean || 0) : 0;
  const p50 = result.latency ? Math.round(result.latency.p50 || 0) : 0;
  const p95 = result.latency ? Math.round(result.latency.p95 || 0) : 0;
  const p99 = result.latency ? Math.round(result.latency.p99 || 0) : 0;
  const 2xx = result['2xx'] || 0;
  const non2xx = (result.non2xx || 0) + (result['4xx'] || 0) + (result['5xx'] || 0);

  return {
    Scenario: name,
    'Req/sec': reqSec,
    'p50 (ms)': p50,
    'p95 (ms)': p95,
    'p99 (ms)': p99,
    '2xx OK': 2xx,
    'Non-2xx': non2xx,
  };
}

async function runMasterSuite() {
  console.log('============================================================');
  console.log('🚀 NAAS PLATFORM PERFORMANCE & LOAD BENCHMARK MASTER SUITE');
  console.log('============================================================\n');

  const resultsTable = [];

  // Scenario 1: Notifications
  console.log('1/5 Running Notification Ingestion Benchmark (10s @ 20 connections)...');
  const notifResult = await runNotificationLoadTest({ duration: 5, connections: 10 });
  resultsTable.push(formatResultRow('Notification Ingestion', notifResult));

  // Scenario 2: Events
  console.log('2/5 Running Business Event Ingestion Benchmark (10s @ 20 connections)...');
  const eventResult = await runEventLoadTest({ duration: 5, connections: 10 });
  resultsTable.push(formatResultRow('Event Ingestion', eventResult));

  // Scenario 3: Quotas Concurrency
  console.log('3/5 Running Quota Check Concurrency Benchmark (5s @ 30 connections)...');
  const quotaResult = await runQuotaLoadTest({ duration: 5, connections: 20 });
  resultsTable.push(formatResultRow('Quota Concurrency', quotaResult));

  // Scenario 4: Idempotency Concurrency
  console.log('4/5 Running Idempotency Key Deduplication Benchmark (5s @ 25 connections)...');
  const idempotencyResult = await runIdempotencyLoadTest({ duration: 5, connections: 20 });
  resultsTable.push(formatResultRow('Idempotency Concurrency', idempotencyResult));

  // Scenario 5: Rate Limiting Burst
  console.log('5/5 Running Rate Limiting Burst Traffic Benchmark (5s @ 40 connections)...');
  const rateLimitResult = await runRateLimitLoadTest({ duration: 5, connections: 30 });
  resultsTable.push(formatResultRow('Rate Limiting Burst', rateLimitResult));

  console.log('\n============================================================');
  console.log('📊 PERFORMANCE BENCHMARK RESULTS SUMMARY');
  console.log('============================================================');
  console.table(resultsTable);
  console.log('\n✅ All load test scenarios completed successfully.');
}

if (require.main === module) {
  runMasterSuite().catch((err) => {
    console.error('❌ Master load test suite failed:', err);
    process.exit(1);
  });
}

module.exports = runMasterSuite;
