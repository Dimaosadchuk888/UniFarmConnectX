#!/usr/bin/env node
/**
 * API ENDPOINTS DIAGNOSTIC FOR TON BALANCE
 * Test all API endpoints involved in balance display chain
 * WITHOUT CODE CHANGES - Testing only
 */

const fetch = require('node-fetch');

async function testApiEndpoints() {
  console.log('🔌 API ENDPOINTS DIAGNOSTIC FOR TON BALANCE');
  console.log('='.repeat(50));

  const baseUrl = 'http://localhost:3000';
  
  // Mock JWT tokens for testing (from previous diagnostics)
  const user25Token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyNSwidGVsZWdyYW1faWQiOjI1LCJ1c2VybmFtZSI6IkRpbWFPc2FkY2h1ayIsInJlZl9jb2RlIjoiVU5JMjUiLCJpYXQiOjE3MzY5NzE5NDcsImV4cCI6MTczNzU3Njc0N30.example';
  const user227Token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyMjcsInRlbGVncmFtX2lkIjo0MjU4NTU3NDQsInVzZXJuYW1lIjoiRGltYU9zYWRjaHVrIiwicmVmX2NvZGUiOiJVTkkyMjciLCJpYXQiOjE3MzY5NzE5NDcsImV4cCI6MTczNzU3Njc0N30.example';

  const testCases = [
    {
      name: 'User 25 Profile',
      url: '/api/v2/user/profile',
      token: user25Token,
      expectedUserId: 25
    },
    {
      name: 'User 227 Profile', 
      url: '/api/v2/user/profile',
      token: user227Token,
      expectedUserId: 227
    },
    {
      name: 'User 25 Wallet Balance',
      url: '/api/v2/wallet/balance',
      token: user25Token,
      expectedUserId: 25
    },
    {
      name: 'User 227 Wallet Balance',
      url: '/api/v2/wallet/balance', 
      token: user227Token,
      expectedUserId: 227
    },
    {
      name: 'User 25 Transactions',
      url: '/api/v2/wallet/transactions?limit=20',
      token: user25Token,
      expectedUserId: 25
    },
    {
      name: 'User 227 Transactions',
      url: '/api/v2/wallet/transactions?limit=20',
      token: user227Token,
      expectedUserId: 227
    }
  ];

  console.log('🧪 Testing API endpoints...\n');

  for (const test of testCases) {
    console.log(`📡 ${test.name}`);
    console.log(`   URL: ${test.url}`);

    try {
      // Check if server is running
      const healthResponse = await fetch(`${baseUrl}/api/health`, {
        timeout: 3000
      });

      if (!healthResponse.ok) {
        console.log(`❌ Server not responding (status: ${healthResponse.status})`);
        continue;
      }

      // Test the actual endpoint (but expect auth failure without real tokens)
      const response = await fetch(`${baseUrl}${test.url}`, {
        headers: {
          'Authorization': `Bearer ${test.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Response received`);
        
        // Analyze response structure
        if (data.user_id) {
          console.log(`   User ID: ${data.user_id}`);
          if (data.user_id === test.expectedUserId) {
            console.log(`   ✅ Correct user context`);
          } else {
            console.log(`   ⚠️  User ID mismatch! Expected ${test.expectedUserId}, got ${data.user_id}`);
          }
        }
        
        if (data.balance_ton !== undefined) {
          console.log(`   TON Balance: ${data.balance_ton}`);
        }
        
        if (data.balance_uni !== undefined) {
          console.log(`   UNI Balance: ${data.balance_uni}`);
        }

        if (Array.isArray(data.transactions)) {
          console.log(`   Transactions count: ${data.transactions.length}`);
          const tonTx = data.transactions.filter(tx => 
            tx.currency === 'TON' || tx.type === 'TON_DEPOSIT'
          );
          console.log(`   TON transactions: ${tonTx.length}`);
        }
        
      } else if (response.status === 401) {
        console.log(`   ⚠️  Authentication required (expected with test tokens)`);
        
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error) {
          console.log(`   Error: ${errorData.error}`);
        }
        
      } else {
        console.log(`   ❌ Request failed: ${response.status}`);
        const errorText = await response.text();
        console.log(`   Error: ${errorText.substring(0, 100)}...`);
      }

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`   ❌ Server not running (connection refused)`);
      } else if (error.name === 'AbortError') {
        console.log(`   ❌ Request timeout`);
      } else {
        console.log(`   ❌ Request error: ${error.message}`);
      }
    }

    console.log('');
  }

  // Test health and basic server info
  console.log('🏥 SERVER HEALTH CHECK');
  console.log('-'.repeat(30));

  try {
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    
    if (healthResponse.ok) {
      console.log(`✅ Server is running`);
      
      const healthData = await healthResponse.json().catch(() => ({}));
      if (healthData.status) {
        console.log(`   Status: ${healthData.status}`);
      }
      if (healthData.timestamp) {
        console.log(`   Server time: ${healthData.timestamp}`);
      }
      
    } else {
      console.log(`⚠️  Server responding but unhealthy (${healthResponse.status})`);
    }
    
  } catch (error) {
    console.log(`❌ Server not accessible: ${error.message}`);
    console.log('   💡 Recommendation: Start the server first');
  }

  // Test WebSocket endpoint
  console.log('\n📡 WEBSOCKET ENDPOINT CHECK');
  console.log('-'.repeat(30));

  try {
    const wsResponse = await fetch(`${baseUrl}/ws`, {
      method: 'GET',
      headers: {
        'Upgrade': 'websocket'
      }
    });
    
    console.log(`WebSocket endpoint status: ${wsResponse.status}`);
    if (wsResponse.status === 426) {
      console.log(`✅ WebSocket endpoint available (upgrade required)`);
    }
    
  } catch (error) {
    console.log(`❌ WebSocket endpoint error: ${error.message}`);
  }

  console.log('\n📋 DIAGNOSTIC SUMMARY');
  console.log('-'.repeat(30));
  console.log('1. Server connectivity tested');
  console.log('2. Authentication endpoints tested');
  console.log('3. Balance API endpoints tested');
  console.log('4. Transaction API endpoints tested');
  console.log('5. WebSocket availability tested');
  console.log('\n💡 Note: Authentication failures expected with test tokens');
  console.log('   Real JWT tokens needed for full endpoint validation');
}

// Execute API diagnostic
testApiEndpoints()
  .then(() => {
    console.log('\n✅ API diagnostic completed');
  })
  .catch(error => {
    console.error('❌ API diagnostic failed:', error);
  });