import http from 'http';

/**
 * API Audit Tool for UniFarm
 * Проверяет доступность и работоспособность всех API endpoints
 */

const API_BASE = 'http://localhost:3000';

const endpoints = [
  { path: '/health', method: 'GET', description: 'Health check' },
  { path: '/api/v2/health', method: 'GET', description: 'API v2 health check' },
  { path: '/api/v2/users/profile', method: 'GET', description: 'User profile' },
  { path: '/api/v2/daily-bonus/status', method: 'GET', description: 'Daily bonus status' },
  { path: '/api/v2/uni-farming/status', method: 'GET', description: 'UNI farming status' },
  { path: '/api/v2/missions', method: 'GET', description: 'Missions list' },
  { path: '/api/v2/referrals/stats', method: 'GET', description: 'Referral stats' },
  { path: '/api/v2/wallet/balance', method: 'GET', description: 'Wallet balance' },
  { path: '/api/v2/transactions', method: 'GET', description: 'Transaction history' },
  { path: '/api/v2/boosts/status', method: 'GET', description: 'Boost status' },
  { path: '/tonconnect-manifest.json', method: 'GET', description: 'TON Connect manifest' }
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.get(`${API_BASE}${endpoint.path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode < 400 ? 'PASS' : 'FAIL';
        console.log(`[${status}] ${endpoint.method} ${endpoint.path} - ${res.statusCode} (${duration}ms)`);
        console.log(`      Description: ${endpoint.description}`);
        if (res.statusCode >= 400) {
          console.log(`      Error: ${data.substring(0, 200)}`);
        }
        resolve({ endpoint, status, statusCode: res.statusCode, duration });
      });
    });
    
    req.on('error', (err) => {
      console.log(`[FAIL] ${endpoint.method} ${endpoint.path} - ERROR: ${err.message}`);
      resolve({ endpoint, status: 'ERROR', error: err.message });
    });
    
    req.setTimeout(5000, () => {
      console.log(`[FAIL] ${endpoint.method} ${endpoint.path} - TIMEOUT`);
      req.destroy();
      resolve({ endpoint, status: 'TIMEOUT' });
    });
  });
}

async function runAudit() {
  console.log('🔍 Starting UniFarm API Audit...\n');
  console.log(`Testing against: ${API_BASE}`);
  console.log(`Total endpoints: ${endpoints.length}\n`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  console.log('\n📊 Audit Summary:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const timeouts = results.filter(r => r.status === 'TIMEOUT').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🔴 Errors: ${errors}`);
  console.log(`⏱️  Timeouts: ${timeouts}`);
  console.log(`📈 Success Rate: ${((passed / endpoints.length) * 100).toFixed(1)}%`);
  
  if (failed > 0 || errors > 0 || timeouts > 0) {
    console.log('\n⚠️  Issues found. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All endpoints are working correctly!');
  }
}

runAudit().catch(error => {
  console.error('Fatal error during audit:', error);
  process.exit(1);
});