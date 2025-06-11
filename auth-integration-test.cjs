/**
 * Production Authentication Integration Test
 * Tests real HMAC validation and JWT generation
 */

const { spawn } = require('child_process');
const crypto = require('crypto');

// Test configuration
const config = {
  serverFile: 'server/index.ts',
  port: 3000,
  testUser: {
    id: 123456789,
    first_name: 'TestUser',
    username: 'testuser123',
    language_code: 'en'
  }
};

// Test environment variables
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '1234567890:TEST_BOT_TOKEN_FOR_HMAC_VALIDATION';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_production';

/**
 * Generates valid Telegram initData with proper HMAC
 */
function generateTelegramInitData(user, botToken) {
  const authDate = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  
  params.set('user', JSON.stringify(user));
  params.set('auth_date', authDate.toString());
  params.set('query_id', 'test_query_' + Date.now());
  
  // Create data string for signing
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Generate HMAC signature
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  params.set('hash', hash);
  return params.toString();
}

/**
 * Starts the server and waits for it to be ready
 */
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting UniFarm server...');
    
    const server = spawn('npx', ['tsx', config.serverFile], {
      stdio: 'pipe',
      env: { ...process.env }
    });

    let serverReady = false;
    const timeout = setTimeout(() => {
      if (!serverReady) {
        server.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 30000);

    server.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Server:', output.trim());
      
      if (output.includes('Server running') || output.includes('listening')) {
        serverReady = true;
        clearTimeout(timeout);
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error('Server Error:', data.toString().trim());
    });

    server.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Tests the authentication endpoints
 */
async function testAuthentication() {
  console.log('\n=== Authentication System Test ===');
  
  const results = {
    telegramAuth: false,
    tokenValidation: false,
    invalidData: false
  };

  try {
    // Test 1: Valid Telegram authentication
    console.log('\n1. Testing Telegram Authentication...');
    const initData = generateTelegramInitData(config.testUser, process.env.TELEGRAM_BOT_TOKEN);
    
    const authResponse = await fetch(`http://localhost:${config.port}/api/v2/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });

    const authResult = await authResponse.json();
    console.log('Auth Status:', authResponse.status);
    console.log('Auth Response:', JSON.stringify(authResult, null, 2));

    if (authResult.success && authResult.token) {
      results.telegramAuth = true;
      console.log('✅ Telegram authentication successful');

      // Test 2: Token validation
      console.log('\n2. Testing Token Validation...');
      const tokenResponse = await fetch(`http://localhost:${config.port}/api/v2/auth/check`, {
        headers: { 'Authorization': `Bearer ${authResult.token}` }
      });

      const tokenResult = await tokenResponse.json();
      console.log('Token Status:', tokenResponse.status);
      console.log('Token Response:', JSON.stringify(tokenResult, null, 2));

      if (tokenResult.success && tokenResult.valid) {
        results.tokenValidation = true;
        console.log('✅ Token validation successful');
      } else {
        console.log('❌ Token validation failed');
      }
    } else {
      console.log('❌ Telegram authentication failed');
    }

    // Test 3: Invalid data rejection
    console.log('\n3. Testing Invalid Data Rejection...');
    const invalidResponse = await fetch(`http://localhost:${config.port}/api/v2/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: 'invalid_data' })
    });

    const invalidResult = await invalidResponse.json();
    console.log('Invalid Status:', invalidResponse.status);
    console.log('Invalid Response:', JSON.stringify(invalidResult, null, 2));

    if (!invalidResult.success && invalidResponse.status === 401) {
      results.invalidData = true;
      console.log('✅ Invalid data properly rejected');
    } else {
      console.log('❌ Invalid data not properly rejected');
    }

  } catch (error) {
    console.error('Test Error:', error.message);
  }

  return results;
}

/**
 * Main test runner
 */
async function runIntegrationTest() {
  let server = null;
  
  try {
    console.log('🚀 UniFarm Authentication Integration Test');
    console.log('==========================================');
    
    // Start server
    server = await startServer();
    
    // Wait for server to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Run authentication tests
    const results = await testAuthentication();
    
    // Generate report
    console.log('\n==========================================');
    console.log('📊 Test Results:');
    console.log('==========================================');
    
    const tests = [
      { name: 'Telegram HMAC Authentication', passed: results.telegramAuth },
      { name: 'JWT Token Validation', passed: results.tokenValidation },
      { name: 'Invalid Data Rejection', passed: results.invalidData }
    ];
    
    tests.forEach(test => {
      const status = test.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test.name}`);
    });
    
    const passedTests = tests.filter(t => t.passed).length;
    const successRate = (passedTests / tests.length * 100).toFixed(1);
    
    console.log(`\nSuccess Rate: ${passedTests}/${tests.length} (${successRate}%)`);
    
    if (passedTests === tests.length) {
      console.log('\n🎉 All authentication tests passed!');
      console.log('✅ Production-ready HMAC validation implemented');
      console.log('✅ JWT token generation and validation working');
      console.log('✅ Security measures properly enforced');
    } else {
      console.log('\n⚠️ Some tests failed - authentication needs review');
    }
    
    return passedTests === tests.length;
    
  } catch (error) {
    console.error('Integration test failed:', error.message);
    return false;
  } finally {
    if (server) {
      console.log('\nShutting down server...');
      server.kill();
    }
  }
}

// Run the test if executed directly
if (require.main === module) {
  runIntegrationTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTest, generateTelegramInitData };