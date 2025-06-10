import http from 'http';

/**
 * Mission Endpoints Testing Tool
 * Специфические тесты для endpoints связанных с миссиями
 */

const API_BASE = 'http://localhost:3000/api/v2';

const missionEndpoints = [
  {
    path: '/missions',
    method: 'GET',
    description: 'Get all available missions',
    expectedFields: ['id', 'type', 'title', 'description', 'reward_uni', 'is_active']
  },
  {
    path: '/user-missions',
    method: 'GET', 
    description: 'Get user completed missions',
    expectedFields: []
  },
  {
    path: '/daily-bonus/status',
    method: 'GET',
    description: 'Daily bonus mission status',
    expectedFields: ['can_claim', 'streak', 'next_reward', 'last_claim']
  }
];

const postEndpoints = [
  {
    path: '/daily-bonus/claim',
    method: 'POST',
    description: 'Claim daily bonus',
    payload: {},
    expectedFields: ['reward', 'new_balance', 'streak']
  }
];

function makeRequest(endpoint, payload = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `${API_BASE}${endpoint.path}`,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UniFarm-Mission-Tester/1.0'
      }
    };

    if (payload) {
      const data = JSON.stringify(payload);
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsedData = null;
        
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          parsedData = { raw: data };
        }

        resolve({
          endpoint,
          statusCode: res.statusCode,
          duration,
          data: parsedData,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        endpoint,
        error: err.message,
        success: false
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        endpoint,
        error: 'Request timeout',
        success: false
      });
    });

    if (payload) {
      req.write(JSON.stringify(payload));
    }
    
    req.end();
  });
}

function validateResponseFields(data, expectedFields) {
  if (!expectedFields.length) return { valid: true, missing: [] };
  
  const missing = [];
  const responseData = data.data || data;
  
  for (const field of expectedFields) {
    if (!(field in responseData)) {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

async function testMissionEndpoints() {
  console.log('🎯 Testing Mission Endpoints...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test GET endpoints
  for (const endpoint of missionEndpoints) {
    console.log(`Testing: ${endpoint.method} ${endpoint.path}`);
    console.log(`Description: ${endpoint.description}`);
    
    const result = await makeRequest(endpoint);
    
    if (result.success) {
      console.log(`✅ Status: ${result.statusCode} (${result.duration}ms)`);
      
      // Validate expected fields
      const validation = validateResponseFields(result.data, endpoint.expectedFields);
      if (validation.valid) {
        console.log('✅ Response structure: Valid');
        passed++;
      } else {
        console.log(`❌ Missing fields: ${validation.missing.join(', ')}`);
        failed++;
      }
    } else {
      console.log(`❌ Failed: ${result.error || `Status ${result.statusCode}`}`);
      failed++;
    }
    
    console.log('---');
  }
  
  // Test POST endpoints
  for (const endpoint of postEndpoints) {
    console.log(`Testing: ${endpoint.method} ${endpoint.path}`);
    console.log(`Description: ${endpoint.description}`);
    
    const result = await makeRequest(endpoint, endpoint.payload);
    
    if (result.success) {
      console.log(`✅ Status: ${result.statusCode} (${result.duration}ms)`);
      
      const validation = validateResponseFields(result.data, endpoint.expectedFields);
      if (validation.valid) {
        console.log('✅ Response structure: Valid');
        passed++;
      } else {
        console.log(`❌ Missing fields: ${validation.missing.join(', ')}`);
        failed++;
      }
    } else {
      console.log(`❌ Failed: ${result.error || `Status ${result.statusCode}`}`);
      failed++;
    }
    
    console.log('---');
  }
  
  console.log('\n📊 Mission Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n⚠️ Some mission endpoints have issues.');
    process.exit(1);
  } else {
    console.log('\n🎉 All mission endpoints are working correctly!');
  }
}

testMissionEndpoints().catch(error => {
  console.error('Fatal error during mission testing:', error);
  process.exit(1);
});