#!/usr/bin/env node

/**
 * JWT Refresh Test Script
 * Тестирует работу endpoint /api/v2/auth/refresh
 */

const http = require('http');

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

async function testRefreshEndpoint() {
  console.log('🧪 JWT Refresh Endpoint Test');
  console.log('============================');
  
  // Test 1: Missing token
  console.log('\n1️⃣ Test: Empty request body');
  try {
    const result1 = await makeRequest('');
    console.log(`Status: ${result1.status} ${result1.statusMessage}`);
    console.log(`Response: ${JSON.stringify(result1.response, null, 2)}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  // Test 2: Invalid token
  console.log('\n2️⃣ Test: Invalid token');
  try {
    const result2 = await makeRequest('invalid_token_123');
    console.log(`Status: ${result2.status} ${result2.statusMessage}`);
    console.log(`Response: ${JSON.stringify(result2.response, null, 2)}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  // Test 3: Valid JWT structure but wrong signature
  console.log('\n3️⃣ Test: Valid JWT structure, wrong signature');
  const fakeJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTg0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwiZmlyc3RfbmFtZSI6IlRlc3QiLCJyZWZfY29kZSI6IlJFRl8xNzUyNzU1ODM1MzU4X3lqcnVzdiIsImV4cCI6MTc1MzM4Nzc2M30.wrong_signature_here';
  
  try {
    const result3 = await makeRequest(fakeJWT);
    console.log(`Status: ${result3.status} ${result3.statusMessage}`);
    console.log(`Response: ${JSON.stringify(result3.response, null, 2)}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  console.log('\n✅ Test completed!');
  console.log('\n📝 Expected results:');
  console.log('- Test 1: 400 Bad Request (validation error)');
  console.log('- Test 2: 401 Unauthorized (invalid token)');  
  console.log('- Test 3: 401 Unauthorized (invalid signature)');
}

// Wait for server to be ready
setTimeout(() => {
  testRefreshEndpoint().catch(console.error);
}, 2000);