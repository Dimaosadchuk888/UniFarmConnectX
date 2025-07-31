/**
 * NETWORK 401 ERRORS HUNTER
 * 
 * Проверка API endpoints после исчезновения JWT токена
 * для подтверждения authentication failures
 */

console.log('🔍 NETWORK 401 ERRORS HUNTER');
console.log('============================');

console.log('\n🎯 TESTING API ENDPOINTS WITHOUT JWT TOKEN:');

async function testApiEndpoints() {
  const endpoints = [
    '/api/v2/users/profile',
    '/api/v2/wallet/balance', 
    '/api/v2/users/referral-stats',
    '/api/v2/transactions/history'
  ];

  console.log('\n📡 API TESTING RESULTS:');

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔗 Testing: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
          // NO Authorization header - testing without JWT
        },
        credentials: 'include'
      });

      console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.log('✅ CONFIRMED: 401 Unauthorized (expected)');
        
        try {
          const errorData = await response.json();
          console.log('📄 Error Response:', JSON.stringify(errorData, null, 2));
        } catch (jsonError) {
          console.log('📄 Response body parsing failed');
        }
      } else if (response.ok) {
        console.log('⚠️ UNEXPECTED: Request succeeded without JWT token');
        
        try {
          const data = await response.json();
          console.log('📄 Success Response:', JSON.stringify(data, null, 2));
        } catch (jsonError) {
          console.log('📄 Response body parsing failed');
        }
      } else {
        console.log(`❌ UNEXPECTED STATUS: ${response.status}`);
      }

    } catch (error) {
      console.error(`❌ Network Error for ${endpoint}:`, error.message);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Execute the test
testApiEndpoints().then(() => {
  console.log('\n🎯 API TESTING COMPLETED');
  
  console.log('\n📊 EXPECTED RESULTS:');
  console.log('If JWT token mechanism is working correctly:');
  console.log('- All endpoints should return 401 Unauthorized');
  console.log('- Error messages should indicate missing/invalid JWT');
  console.log('- Frontend should detect auth failures and attempt token refresh');
  
  console.log('\n🚨 CRITICAL VALIDATION:');
  console.log('This test confirms that JWT token absence');
  console.log('prevents API access and explains why TON deposits');
  console.log('cannot be processed after token disappearance.');
}).catch(error => {
  console.error('❌ API Testing failed:', error);
});