/**
 * Authentication System Test for UniFarm Connect
 * Tests production-ready Telegram HMAC validation and JWT generation
 */

const crypto = require('crypto');

// Test configuration
const TEST_CONFIG = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || 'test_bot_token',
  apiUrl: 'http://localhost:3000/api/v2/auth',
  testUser: {
    id: 123456789,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'en'
  }
};

/**
 * Generates valid Telegram initData for testing
 */
function generateValidInitData(user, botToken) {
  const authDate = Math.floor(Date.now() / 1000);
  const queryParams = new URLSearchParams();
  
  queryParams.set('user', JSON.stringify(user));
  queryParams.set('auth_date', authDate.toString());
  queryParams.set('query_id', 'test_query_id');
  
  // Create verification string
  const sortedParams = Array.from(queryParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Generate signature
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(sortedParams)
    .digest('hex');

  queryParams.set('hash', hash);
  
  return queryParams.toString();
}

/**
 * Tests Telegram authentication endpoint
 */
async function testTelegramAuth() {
  console.log('\n🔐 Testing Telegram Authentication...');
  
  try {
    const initData = generateValidInitData(TEST_CONFIG.testUser, TEST_CONFIG.botToken);
    console.log('Generated initData:', initData.substring(0, 100) + '...');
    
    const response = await fetch(`${TEST_CONFIG.apiUrl}/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ initData })
    });
    
    const result = await response.json();
    console.log('Auth Response Status:', response.status);
    console.log('Auth Response:', JSON.stringify(result, null, 2));
    
    if (result.success && result.token) {
      console.log('✅ Telegram authentication successful');
      return result.token;
    } else {
      console.log('❌ Telegram authentication failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Authentication test error:', error);
    return null;
  }
}

/**
 * Tests token validation endpoint
 */
async function testTokenValidation(token) {
  console.log('\n🔍 Testing Token Validation...');
  
  if (!token) {
    console.log('❌ No token provided for validation');
    return false;
  }
  
  try {
    const response = await fetch(`${TEST_CONFIG.apiUrl}/check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    console.log('Validation Response Status:', response.status);
    console.log('Validation Response:', JSON.stringify(result, null, 2));
    
    if (result.success && result.valid) {
      console.log('✅ Token validation successful');
      return true;
    } else {
      console.log('❌ Token validation failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Token validation test error:', error);
    return false;
  }
}

/**
 * Tests session info endpoint
 */
async function testSessionInfo(token) {
  console.log('\n📋 Testing Session Information...');
  
  if (!token) {
    console.log('❌ No token provided for session info');
    return false;
  }
  
  try {
    const response = await fetch(`${TEST_CONFIG.apiUrl}/session`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    console.log('Session Response Status:', response.status);
    console.log('Session Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Session info retrieval successful');
      return true;
    } else {
      console.log('❌ Session info retrieval failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Session info test error:', error);
    return false;
  }
}

/**
 * Tests authentication with invalid data
 */
async function testInvalidAuth() {
  console.log('\n🚫 Testing Invalid Authentication...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.apiUrl}/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        initData: 'invalid_init_data' 
      })
    });
    
    const result = await response.json();
    console.log('Invalid Auth Response Status:', response.status);
    console.log('Invalid Auth Response:', JSON.stringify(result, null, 2));
    
    if (!result.success && response.status === 401) {
      console.log('✅ Invalid authentication properly rejected');
      return true;
    } else {
      console.log('❌ Invalid authentication not properly rejected');
      return false;
    }
  } catch (error) {
    console.error('❌ Invalid auth test error:', error);
    return false;
  }
}

/**
 * Runs complete authentication test suite
 */
async function runAuthTestSuite() {
  console.log('🚀 Starting UniFarm Authentication Test Suite');
  console.log('='.repeat(50));
  
  const results = {
    telegramAuth: false,
    tokenValidation: false,
    sessionInfo: false,
    invalidAuth: false
  };
  
  // Test 1: Valid Telegram authentication
  const token = await testTelegramAuth();
  results.telegramAuth = !!token;
  
  // Test 2: Token validation
  if (token) {
    results.tokenValidation = await testTokenValidation(token);
    
    // Test 3: Session information
    results.sessionInfo = await testSessionInfo(token);
  }
  
  // Test 4: Invalid authentication
  results.invalidAuth = await testInvalidAuth();
  
  // Generate test report
  console.log('\n' + '='.repeat(50));
  console.log('📊 Authentication Test Results:');
  console.log('='.repeat(50));
  
  const tests = [
    { name: 'Telegram Authentication', result: results.telegramAuth },
    { name: 'Token Validation', result: results.tokenValidation },
    { name: 'Session Information', result: results.sessionInfo },
    { name: 'Invalid Auth Rejection', result: results.invalidAuth }
  ];
  
  tests.forEach(test => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.name}`);
  });
  
  const passedTests = tests.filter(test => test.result).length;
  const totalTests = tests.length;
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log('\n' + '-'.repeat(30));
  console.log(`Tests Passed: ${passedTests}/${totalTests} (${successRate}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All authentication tests passed!');
    console.log('✅ Authentication system is production-ready');
  } else {
    console.log('⚠️  Some tests failed - review implementation');
  }
  
  return successRate === '100.0';
}

// Check if this script is run directly
if (require.main === module) {
  runAuthTestSuite().catch(console.error);
}

module.exports = {
  runAuthTestSuite,
  generateValidInitData,
  testTelegramAuth,
  testTokenValidation,
  testSessionInfo,
  testInvalidAuth
};