#!/usr/bin/env node
/**
 * Быстрый тест массовых операций после исправления rate limiting
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : 'http://localhost:3000';

const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4ODgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE5Njk5ODQsImV4cCI6MTc1MjU3NDc4NH0.lFSaXGQxMTu7qW9oYT8dcqD1C3YpgGF4vPrLIgUUGFg';

async function testMassOperations() {
  console.log('🔥 ТЕСТ МАССОВЫХ ОПЕРАЦИЙ ПОСЛЕ ИСПРАВЛЕНИЯ RATE LIMITING');
  console.log(`🌐 URL: ${BASE_URL}`);
  console.log(`🔑 JWT токен: ${TEST_JWT.substring(0, 50)}...`);
  console.log('');

  const endpoints = [
    '/api/v2/transactions',
    '/api/v2/farming/status', 
    '/api/v2/wallet/balance?user_id=48',
    '/api/v2/boost/farming-status?user_id=48',
    '/api/v2/daily-bonus/claim'
  ];

  for (const endpoint of endpoints) {
    console.log(`\n📊 Тестирование ${endpoint}:`);
    
    let successCount = 0;
    let errorCount = 0;
    let rateLimitCount = 0;
    
    // Делаем 50 быстрых запросов
    for (let i = 1; i <= 50; i++) {
      try {
        const method = endpoint.includes('claim') ? 'POST' : 'GET';
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method,
          headers: {
            'Authorization': `Bearer ${TEST_JWT}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 200) {
          successCount++;
        } else if (response.status === 429) {
          rateLimitCount++;
          if (rateLimitCount === 1) {
            console.log(`  ⚠️ Первая 429 ошибка на запросе #${i}`);
          }
        } else {
          errorCount++;
        }
        
        // Показываем прогресс каждые 10 запросов
        if (i % 10 === 0) {
          console.log(`  📈 ${i}/50: ✅${successCount} ❌${errorCount} 🚫${rateLimitCount}`);
        }
        
      } catch (error) {
        errorCount++;
      }
      
      // Небольшая пауза
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    
    const testPassed = rateLimitCount === 0;
    const status = testPassed ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН';
    console.log(`  🎯 РЕЗУЛЬТАТ: ${status} (${successCount}/50 успешных, ${rateLimitCount} блокировок)`);
  }
  
  console.log('\n🏁 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
}

if (require.main === module) {
  testMassOperations().catch(console.error);
}

module.exports = { testMassOperations };