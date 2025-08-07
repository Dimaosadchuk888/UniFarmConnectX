/**
 * Проверка новых endpoint'ов после достижения 100% соответствия ROADMAP.md
 * Тестирует все добавленные методы в TON Farming, Referral System, Airdrop System
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/v2';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYyLCJ0ZWxlZ3JhbV9pZCI6ODg4ODg4NDgsInVzZXJuYW1lIjoicHJldmlld190ZXN0IiwiZmlyc3RfbmFtZSI6IlByZXZpZXciLCJyZWZfY29kZSI6IlJFRl8xNzUxNzgwNTIxOTE4X2UxdjYyZCIsImlhdCI6MTc1MTg3MTA2MywiZXhwIjoxNzUyNDc1ODYzfQ.NKbyJiXtLnGzyr0w-C1oR658X5TzDO6EkKU8Ie5zgE0';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    };
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`${method} ${endpoint}:`);
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  Success: ${data.success}`);
    if (data.success) {
      console.log(`  ✅ ENDPOINT РАБОТАЕТ`);
    } else {
      console.log(`  ❌ ENDPOINT НЕ РАБОТАЕТ: ${data.error}`);
    }
    console.log('');
    
    return { endpoint, status: response.status, success: data.success };
  } catch (error) {
    console.log(`${method} ${endpoint}:`);
    console.log(`  ❌ ERROR: ${error.message}`);
    console.log('');
    return { endpoint, status: 'ERROR', success: false, error: error.message };
  }
}

async function testNewEndpoints() {
  console.log('🔍 ПРОВЕРКА НОВЫХ ENDPOINT\'ОВ ПОСЛЕ ROADMAP COMPLIANCE 100%');
  console.log('='.repeat(70));
  
  const results = [];
  
  // TON Farming System - новый endpoint
  console.log('📊 TON FARMING SYSTEM:');
  results.push(await testEndpoint('/ton-farming/balance'));
  
  // Referral System - новые endpoints
  console.log('🔗 REFERRAL SYSTEM:');
  results.push(await testEndpoint('/referrals/history'));
  results.push(await testEndpoint('/referrals/chain'));
  
  // Airdrop System - новые endpoints
  console.log('🎁 AIRDROP SYSTEM:');
  results.push(await testEndpoint('/airdrop/active'));
  results.push(await testEndpoint('/airdrop/history'));
  results.push(await testEndpoint('/airdrop/eligibility'));
  
  // Подведение итогов
  console.log('📈 ИТОГОВАЯ СТАТИСТИКА:');
  console.log('='.repeat(70));
  
  const working = results.filter(r => r.success).length;
  const total = results.length;
  const percentage = Math.round((working / total) * 100);
  
  console.log(`Всего endpoint'ов протестировано: ${total}`);
  console.log(`Работающих endpoint'ов: ${working}`);
  console.log(`Процент готовности: ${percentage}%`);
  
  if (percentage === 100) {
    console.log('🎉 ВСЕ НОВЫЕ ENDPOINT\'Ы РАБОТАЮТ - ROADMAP COMPLIANCE 100% ДОСТИГНУТ!');
  } else {
    console.log('⚠️  Некоторые endpoint\'ы требуют дополнительной настройки');
  }
  
  return { working, total, percentage };
}

// Запуск тестирования
testNewEndpoints().then(result => {
  process.exit(result.percentage === 100 ? 0 : 1);
}).catch(error => {
  console.error('❌ Ошибка при тестировании:', error);
  process.exit(1);
});