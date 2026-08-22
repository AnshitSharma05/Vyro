const http = require('http');

const API_BASE_URL = process.env.SMOKE_TEST_BASE_URL || 'http://localhost:5000';

function fetchUrl(urlPath) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${API_BASE_URL}${urlPath}`;
    http
      .get(fullUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ statusCode: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: data });
          }
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function runSmokeTest() {
  console.log(`🚀 Starting Deployment Smoke Test against target: ${API_BASE_URL}`);

  try {
    // 1. Check Liveness Endpoint
    console.log('1. Testing Liveness probe (/health/live)...');
    const liveRes = await fetchUrl('/health/live');
    if (liveRes.statusCode !== 200 || liveRes.body?.data?.status !== 'ok') {
      throw new Error(`Liveness failed! Status: ${liveRes.statusCode}, Body: ${JSON.stringify(liveRes.body)}`);
    }
    console.log('   ✅ Liveness probe PASSED.');

    // 2. Check Readiness Endpoint
    console.log('2. Testing Readiness probe (/health/ready)...');
    const readyRes = await fetchUrl('/health/ready');
    if (readyRes.statusCode !== 200 || !readyRes.body?.data?.healthy) {
      throw new Error(`Readiness failed! Status: ${readyRes.statusCode}, Body: ${JSON.stringify(readyRes.body)}`);
    }
    console.log('   ✅ Readiness probe PASSED (PostgreSQL & Redis healthy).');

    // 3. Check Subscription Plans Endpoint
    console.log('3. Testing Subscription Plans Endpoint (/api/v1/plans)...');
    const plansRes = await fetchUrl('/api/v1/plans');
    if (plansRes.statusCode !== 200 || !Array.isArray(plansRes.body?.data?.plans)) {
      throw new Error(`Plans endpoint failed! Status: ${plansRes.statusCode}`);
    }
    console.log(`   ✅ Subscription Plans PASSED (${plansRes.body.data.plans.length} active plans found).`);

    console.log('\n🎉 ALL DEPLOYMENT SMOKE TESTS PASSED CLEANLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ DEPLOYMENT SMOKE TEST FAILED!');
    console.error(err.message);
    process.exit(1);
  }
}

runSmokeTest();
