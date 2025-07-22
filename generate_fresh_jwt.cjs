#!/usr/bin/env node

/**
 * Generate Fresh JWT Script
 * Создаем новый JWT токен с текущим JWT_SECRET для тестирования
 */

const http = require('http');

// Логин как User 184 через auth endpoint
async function generateFreshJWT() {
  console.log('🔑 Generate Fresh JWT for User 184');
  console.log('===================================');
  
  // Попробуем получить токен через auth/telegram endpoint (если есть)
  // Или создадим тестовый через прямой API
  
  try {
    // Сначала попробуем получить информацию о пользователе 184
    const getUserResult = await makeGetRequest('/api/v2/user/184');
    console.log('\n📤 User 184 Info:');
    console.log(`Status: ${getUserResult.status}`);
    console.log(`Response: ${JSON.stringify(getUserResult.response, null, 2)}`);
    
  } catch (error) {
    console.log(`Error getting user info: ${error.message}`);
  }

  console.log('\n🔄 Attempting to generate fresh JWT...');
  console.log('Note: This may require proper Telegram auth flow');
  console.log('But we can see what endpoints are available');
  
  // Check available auth endpoints
  const authEndpoints = [
    '/api/v2/auth/status',
    '/api/v2/auth/telegram',
    '/api/v2/auth/check'
  ];
  
  for (const endpoint of authEndpoints) {
    try {
      console.log(`\n🔍 Testing ${endpoint}:`);
      const result = await makeGetRequest(endpoint);
      console.log(`Status: ${result.status} ${result.statusMessage}`);
      console.log(`Response: ${JSON.stringify(result.response, null, 2)}`);
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
}

function makeGetRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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

    req.end();
  });
}

// Execute
generateFreshJWT().catch(console.error);