/**
 * Test for AuthService integration with User system
 * Проверяет связку авторизации через Telegram с таблицей users
 */

import http from 'http';

const API_BASE_URL = 'http://localhost:3000/api/v2';

// Mock Telegram initData for testing
function generateMockInitData(userId, username, firstName) {
  const authDate = Math.floor(Date.now() / 1000);
  const userData = {
    id: userId,
    username: username,
    first_name: firstName,
    auth_date: authDate
  };
  
  // This is mock data for testing - in real app would use proper HMAC
  const params = new URLSearchParams({
    user: JSON.stringify(userData),
    auth_date: authDate.toString(),
    hash: 'mock_hash_for_testing'
  });
  
  return params.toString();
}

async function testRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/v2${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: { raw: body } });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testNewUserCreation() {
  console.log('\n=== Test 1: New User Creation ===');
  
  const newUserId = Math.floor(Math.random() * 1000000);
  const initData = generateMockInitData(newUserId, `testuser${newUserId}`, 'Test User');
  
  try {
    const response = await testRequest('/auth/telegram', 'POST', {
      initData: initData
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ New user created successfully');
      console.log('User ID:', response.data.user.id);
      console.log('Telegram ID:', response.data.user.telegram_id);
      console.log('Ref Code:', response.data.user.ref_code);
      return response.data;
    } else {
      console.log('❌ Failed to create new user');
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing new user creation:', error.message);
    return null;
  }
}

async function testExistingUserLogin(existingUser) {
  console.log('\n=== Test 2: Existing User Login ===');
  
  if (!existingUser) {
    console.log('⏭️ Skipping - no existing user from previous test');
    return null;
  }
  
  const initData = generateMockInitData(
    existingUser.user.telegram_id, 
    existingUser.user.username, 
    'Test User'
  );
  
  try {
    const response = await testRequest('/auth/telegram', 'POST', {
      initData: initData
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Existing user login successful');
      console.log('Same User ID:', response.data.user.id === existingUser.user.id);
      console.log('Same Ref Code:', response.data.user.ref_code === existingUser.user.ref_code);
      return response.data;
    } else {
      console.log('❌ Failed existing user login');
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing existing user login:', error.message);
    return null;
  }
}

async function testWithReferralCode() {
  console.log('\n=== Test 3: New User with Referral Code ===');
  
  const newUserId = Math.floor(Math.random() * 1000000);
  const initData = generateMockInitData(newUserId, `refuser${newUserId}`, 'Referred User');
  
  try {
    const response = await testRequest('/auth/telegram', 'POST', {
      initData: initData,
      ref_by: 'TESTREF123' // Mock referral code
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ User with referral created successfully');
      console.log('User ID:', response.data.user.id);
      console.log('Ref Code:', response.data.user.ref_code);
      return response.data;
    } else {
      console.log('❌ Failed to create user with referral');
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing referral creation:', error.message);
    return null;
  }
}

async function testTokenValidation(authData) {
  console.log('\n=== Test 4: Token Validation ===');
  
  if (!authData || !authData.token) {
    console.log('⏭️ Skipping - no token from previous test');
    return;
  }
  
  try {
    const response = await testRequest('/auth/validate', 'GET', null, {
      'Authorization': `Bearer ${authData.token}`
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.valid) {
      console.log('✅ Token validation successful');
    } else {
      console.log('❌ Token validation failed');
    }
  } catch (error) {
    console.error('❌ Error testing token validation:', error.message);
  }
}

async function testSessionInfo(authData) {
  console.log('\n=== Test 5: Session Info ===');
  
  if (!authData || !authData.token) {
    console.log('⏭️ Skipping - no token from previous test');
    return;
  }
  
  try {
    const response = await testRequest('/auth/session', 'GET', null, {
      'Authorization': `Bearer ${authData.token}`
    });
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.valid) {
      console.log('✅ Session info retrieved successfully');
      console.log('User ID:', response.data.userId);
      console.log('Telegram ID:', response.data.telegramId);
      console.log('Username:', response.data.username);
      console.log('Ref Code:', response.data.refCode);
    } else {
      console.log('❌ Failed to get session info');
    }
  } catch (error) {
    console.error('❌ Error testing session info:', error.message);
  }
}

async function runAllTests() {
  console.log('🧪 Starting AuthService + Users Integration Tests');
  console.log('===============================================');
  
  // Test 1: Create new user
  const newUserAuth = await testNewUserCreation();
  
  // Test 2: Login existing user
  const existingUserAuth = await testExistingUserLogin(newUserAuth);
  
  // Test 3: Create user with referral
  const referralUserAuth = await testWithReferralCode();
  
  // Test 4: Validate token
  await testTokenValidation(newUserAuth);
  
  // Test 5: Get session info
  await testSessionInfo(newUserAuth);
  
  console.log('\n===============================================');
  console.log('🏁 Integration Tests Complete');
  
  // Summary
  const successCount = [newUserAuth, existingUserAuth, referralUserAuth].filter(Boolean).length;
  console.log(`✅ Successful authentications: ${successCount}/3`);
  
  if (successCount === 3) {
    console.log('🎉 All integration tests passed!');
  } else {
    console.log('⚠️  Some tests failed - check logs above');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test runner error:', error.message);
  process.exit(1);
});