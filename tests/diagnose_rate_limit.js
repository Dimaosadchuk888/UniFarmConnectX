#!/usr/bin/env node
/**
 * Диагностика rate limiting состояния
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : 'http://localhost:3000';

const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4ODgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE5Njk5ODQsImV4cCI6MTc1MjU3NDc4NH0.lFSaXGQxMTu7qW9oYT8dcqD1C3YpgGF4vPrLIgUUGFg';

async function diagnoseRateLimiting() {
  console.log('🔍 ДИАГНОСТИКА RATE LIMITING');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  
  // Тестируем один endpoint
  const endpoint = '/api/v2/transactions';
  console.log(`\n📊 Тестирование endpoint: ${endpoint}`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_JWT}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📈 Status: ${response.status}`);
    console.log(`📋 Headers:`);
    console.log(`  - X-RateLimit-Limit: ${response.headers.get('X-RateLimit-Limit') || 'отсутствует'}`);
    console.log(`  - X-RateLimit-Remaining: ${response.headers.get('X-RateLimit-Remaining') || 'отсутствует'}`);
    console.log(`  - X-RateLimit-Reset: ${response.headers.get('X-RateLimit-Reset') || 'отсутствует'}`);
    
    if (response.status === 429) {
      const data = await response.json();
      console.log(`❌ Rate Limited: ${data.error || 'неизвестно'}`);
      console.log('🔧 Статус: Старая конфигурация все еще активна, требуется перезапуск сервера');
    } else if (response.status === 200) {
      console.log('✅ Успешный ответ - новая конфигурация может работать');
      const data = await response.json();
      console.log(`📦 Данные: ${JSON.stringify(data).substring(0, 100)}...`);
    } else {
      console.log(`⚠️ Неожиданный статус: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка сетевого запроса:', error.message);
  }
}

if (require.main === module) {
  diagnoseRateLimiting().catch(console.error);
}

module.exports = { diagnoseRateLimiting };