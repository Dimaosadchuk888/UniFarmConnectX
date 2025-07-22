#!/usr/bin/env node

/**
 * Real JWT Test Script
 * Тестирует JWT refresh с действующим токеном пользователя 184
 */

const http = require('http');

// JWT токен пользователя 184 (из browser logs)
// Длина: 273 символа, работает в приложении
const REAL_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTg0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwiZmlyc3RfbmFtZSI6IlRlc3QiLCJyZWZfY29kZSI6IlJFRl8xNzUyNzU1ODM1MzU4X3lqcnVzdiIsImV4cCI6MTc1MzM4Nzc2M30.Ol2PzFM6K6pvhvDzqiZ4RK2ZnKzXKNhJnj6wkqTaR5g';

function makeRequest(token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ token });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v2/auth/refresh',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({
            status: res.statusCode,
            statusMessage: res.statusMessage,
            response: response
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            statusMessage: res.statusMessage,
            response: { error: 'Invalid JSON response', body: body }
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

function decodeJWT(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const expiry = new Date(payload.exp * 1000);
    const now = new Date();
    const isExpired = now > expiry;
    
    return {
      payload,
      expiry,
      isExpired,
      timeLeft: Math.floor((expiry - now) / (1000 * 60 * 60)) // hours
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function testRealJWTRefresh() {
  console.log('🔑 Real JWT Refresh Test');
  console.log('========================');
  
  // Decode current token
  const tokenInfo = decodeJWT(REAL_JWT);
  
  if (tokenInfo.error) {
    console.log(`❌ Error decoding token: ${tokenInfo.error}`);
    return;
  }
  
  console.log('\n📊 Current Token Info:');
  console.log(`User ID: ${tokenInfo.payload.id}`);
  console.log(`Telegram ID: ${tokenInfo.payload.telegram_id}`);
  console.log(`Username: ${tokenInfo.payload.username}`);
  console.log(`Expires: ${tokenInfo.expiry.toISOString()}`);
  console.log(`Status: ${tokenInfo.isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
  console.log(`Time left: ${tokenInfo.timeLeft} hours`);
  
  // Test refresh endpoint
  console.log('\n🔄 Testing JWT Refresh...');
  
  try {
    const result = await makeRequest(REAL_JWT);
    
    console.log(`\n📤 Response:`);
    console.log(`Status: ${result.status} ${result.statusMessage}`);
    console.log(`Response: ${JSON.stringify(result.response, null, 2)}`);
    
    if (result.status === 200 && result.response.success && result.response.data?.token) {
      console.log('\n🎉 JWT Refresh SUCCESS!');
      
      // Decode new token
      const newTokenInfo = decodeJWT(result.response.data.token);
      if (!newTokenInfo.error) {
        console.log('\n🆕 New Token Info:');
        console.log(`User ID: ${newTokenInfo.payload.id}`);
        console.log(`Telegram ID: ${newTokenInfo.payload.telegram_id}`);
        console.log(`Expires: ${newTokenInfo.expiry.toISOString()}`);
        console.log(`Status: ${newTokenInfo.isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
        console.log(`Time left: ${newTokenInfo.timeLeft} hours`);
        
        // Compare tokens
        const oldExp = tokenInfo.expiry.getTime();
        const newExp = newTokenInfo.expiry.getTime();
        const timeDiff = Math.floor((newExp - oldExp) / (1000 * 60 * 60));
        
        console.log(`\n⏰ Token Comparison:`);
        console.log(`Old expiry: ${tokenInfo.expiry.toISOString()}`);
        console.log(`New expiry: ${newTokenInfo.expiry.toISOString()}`);
        console.log(`Extension: ${timeDiff} hours`);
      }
    } else {
      console.log('\n❌ JWT Refresh FAILED');
      
      if (result.status === 401) {
        console.log('🔍 Possible causes:');
        console.log('- Token expired');
        console.log('- Invalid signature');
        console.log('- User not found in database');
      }
    }
    
  } catch (error) {
    console.log(`\n💥 Request Error: ${error.message}`);
  }
}

// Execute test
testRealJWTRefresh().catch(console.error);