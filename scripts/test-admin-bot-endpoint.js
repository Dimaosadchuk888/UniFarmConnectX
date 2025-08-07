#!/usr/bin/env node

/**
 * Проверка доступности Admin Bot webhook endpoint
 */

const DOMAIN = 'https://uni-farm-connect-unifarm01010101.replit.app';
const ENDPOINTS = [
  '/api/v2/admin-bot/webhook',
  '/api/v2/test-import',
  '/api/v2/debug/profile-test',
  '/api/v2/',
  '/test-server'
];

console.log('🔍 ДИАГНОСТИКА ADMIN BOT ENDPOINTS');
console.log('Домен:', DOMAIN);
console.log('Время:', new Date().toISOString());
console.log('─'.repeat(60));

async function testEndpoint(endpoint) {
  const url = `${DOMAIN}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'AdminBot-Diagnostic/1.0'
      }
    });
    
    const statusCode = response.status;
    const statusText = response.statusText;
    
    let body = 'ERROR';
    try {
      body = await response.text();
      if (body.length > 100) {
        body = body.substring(0, 100) + '...';
      }
    } catch (e) {
      body = 'FAILED TO READ BODY';
    }
    
    console.log(`${statusCode === 200 ? '✅' : '❌'} ${endpoint}`);
    console.log(`   Status: ${statusCode} ${statusText}`);
    console.log(`   Body: ${body}`);
    console.log('');
    
    return statusCode;
  } catch (error) {
    console.log(`❌ ${endpoint}`);
    console.log(`   Error: ${error.message}`);
    console.log('');
    return -1;
  }
}

async function testPostWebhook() {
  const url = `${DOMAIN}/api/v2/admin-bot/webhook`;
  
  console.log('🔄 Тестирование POST webhook...');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AdminBot-Diagnostic/1.0'
      },
      body: JSON.stringify({
        update_id: 999999,
        message: {
          message_id: 1,
          from: { id: 999999, username: 'diagnostic_test' },
          chat: { id: 999999, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      })
    });
    
    const statusCode = response.status;
    const body = await response.text();
    
    console.log(`${statusCode === 200 ? '✅' : '❌'} POST webhook`);
    console.log(`   Status: ${statusCode} ${response.statusText}`);
    console.log(`   Body: ${body}`);
    console.log('');
    
    return statusCode;
  } catch (error) {
    console.log(`❌ POST webhook`);
    console.log(`   Error: ${error.message}`);
    console.log('');
    return -1;
  }
}

async function main() {
  for (const endpoint of ENDPOINTS) {
    await testEndpoint(endpoint);
  }
  
  await testPostWebhook();
  
  console.log('─'.repeat(60));
  console.log('✅ Диагностика завершена');
}

main().catch(console.error);