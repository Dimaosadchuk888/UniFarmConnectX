/**
 * Test script for all implemented API endpoints
 * Tests HIGH and MEDIUM priority endpoints we just implemented
 */

const API_BASE = 'http://localhost:3000/api/v2';

// Test endpoints list
const endpoints = [
  // HIGH PRIORITY - Missions
  { method: 'GET', path: '/missions', description: 'Get available missions' },
  { method: 'GET', path: '/user-missions', description: 'Get user missions' },
  
  // HIGH PRIORITY - Wallet withdraw
  { method: 'GET', path: '/wallet', description: 'Get wallet data' },
  
  // HIGH PRIORITY - UNI farming deposit/harvest
  { method: 'GET', path: '/farming/data', description: 'Get farming data' },
  { method: 'POST', path: '/farming/deposit', description: 'UNI farming deposit' },
  { method: 'POST', path: '/farming/harvest', description: 'UNI farming harvest' },
  
  // MEDIUM PRIORITY - Boosts packages
  { method: 'GET', path: '/boosts/packages', description: 'Get boost packages' },
  { method: 'GET', path: '/boosts', description: 'Get available boosts' },
  
  // MEDIUM PRIORITY - TON farming
  { method: 'GET', path: '/ton-farming', description: 'Get TON farming data' },
  { method: 'GET', path: '/ton-farming/status', description: 'Get TON farming status' },
  { method: 'POST', path: '/ton-farming/start', description: 'Start TON farming' },
  { method: 'POST', path: '/ton-farming/claim', description: 'Claim TON farming' },
];

async function testEndpoint(endpoint) {
  try {
    const url = `${API_BASE}${endpoint.path}`;
    console.log(`\n🔍 Testing ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
    
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // Add test body for POST requests
    if (endpoint.method === 'POST') {
      if (endpoint.path.includes('deposit')) {
        options.body = JSON.stringify({ amount: '100' });
      } else if (endpoint.path.includes('start')) {
        options.body = JSON.stringify({ amount: '50' });
      }
    }

    const response = await fetch(url, options);
    const data = await response.text();
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`   ✅ SUCCESS`);
      try {
        const jsonData = JSON.parse(data);
        if (jsonData.data) {
          console.log(`   📊 Data keys: ${Object.keys(jsonData.data).join(', ')}`);
        }
      } catch (e) {
        console.log(`   📝 Response: ${data.substring(0, 100)}...`);
      }
    } else if (response.status === 401) {
      console.log(`   🔐 AUTH REQUIRED (Expected for protected endpoints)`);
    } else if (response.status === 404) {
      console.log(`   ❌ NOT FOUND - Endpoint not implemented`);
    } else {
      console.log(`   ⚠️  ERROR: ${data.substring(0, 200)}`);
    }
    
    return response.status;
  } catch (error) {
    console.log(`   💥 CONNECTION ERROR: ${error.message}`);
    return 0;
  }
}

async function runTests() {
  console.log('🚀 Starting API Endpoints Test\n');
  console.log('Testing implemented HIGH and MEDIUM priority endpoints...\n');
  
  const results = {
    success: 0,
    authRequired: 0,
    notFound: 0,
    errors: 0,
    connectionErrors: 0
  };
  
  for (const endpoint of endpoints) {
    const status = await testEndpoint(endpoint);
    
    if (status === 200) results.success++;
    else if (status === 401) results.authRequired++;
    else if (status === 404) results.notFound++;
    else if (status === 0) results.connectionErrors++;
    else results.errors++;
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Working endpoints: ${results.success}`);
  console.log(`🔐 Auth required: ${results.authRequired}`);
  console.log(`❌ Not found: ${results.notFound}`);
  console.log(`⚠️  Errors: ${results.errors}`);
  console.log(`💥 Connection errors: ${results.connectionErrors}`);
  console.log(`\n📊 Total tested: ${endpoints.length}`);
  
  const workingEndpoints = results.success + results.authRequired;
  const percentage = ((workingEndpoints / endpoints.length) * 100).toFixed(1);
  console.log(`🎯 Implementation progress: ${percentage}% (${workingEndpoints}/${endpoints.length})`);
  
  if (results.connectionErrors > 0) {
    console.log('\n⚠️  Connection errors detected. Make sure server is running on port 3000');
  }
}

// Run tests
runTests().catch(console.error);