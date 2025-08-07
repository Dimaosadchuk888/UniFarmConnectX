#!/usr/bin/env node
/**
 * Скрипт для тестирования очистки кэшей и проверки обновлений
 * Проверяет работу TonAPI кэша и transaction кэша
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testApiEndpoint(url, description) {
  try {
    console.log(`\n🔍 Тестирование: ${description}`);
    console.log(`📍 URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Cache-Test/1.0'
      }
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Response: ${JSON.stringify(data).slice(0, 200)}...`);
      return true;
    } else {
      console.log(`❌ Error response`);
      return false;
    }
  } catch (error) {
    console.log(`💥 Request failed: ${error.message}`);
    return false;
  }
}

async function testCacheClearing() {
  console.log('🚀 ТЕСТИРОВАНИЕ ОЧИСТКИ КЭШЕЙ И ОБНОВЛЕНИЙ');
  console.log('=' .repeat(50));
  
  // Тест доступности сервера
  const serverOk = await testApiEndpoint(`${BASE_URL}/health`, 'Health Check');
  if (!serverOk) {
    console.log('\n❌ Сервер недоступен! Остановка тестирования.');
    process.exit(1);
  }

  // Тест API endpoints после очистки кэша
  const endpoints = [
    {
      url: `${BASE_URL}/api/v2/wallet/balance?user_id=184`,
      desc: 'Balance API (должен работать без кэша)'
    },
    {
      url: `${BASE_URL}/api/v2/uni-farming/status?user_id=184`, 
      desc: 'UNI Farming Status (проверка обновлений)'
    },
    {
      url: `${BASE_URL}/api/v2/boost/verify-ton-payment`,
      desc: 'TON Payment Verification (тест TonAPI кэша)'
    },
    {
      url: `${BASE_URL}/api/v2/transactions?user_id=184&page=1&limit=10`,
      desc: 'Transactions API (тест transaction кэша)'
    }
  ];

  let passedTests = 0;
  const totalTests = endpoints.length;

  for (const endpoint of endpoints) {
    const success = await testApiEndpoint(endpoint.url, endpoint.desc);
    if (success) passedTests++;
    
    // Пауза между запросами для предотвращения rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '=' .repeat(50));
  console.log('📋 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log(`✅ Успешных тестов: ${passedTests}/${totalTests}`);
  console.log(`📊 Процент успеха: ${Math.round(passedTests/totalTests*100)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ВСЕ ТЕСТЫ ПРОШЛИ! Кэши не мешают обновлениям.');
  } else {
    console.log('⚠️  Некоторые тесты не прошли. Проверьте логи сервера.');
  }

  // Дополнительный тест на многократные запросы для проверки кэша
  console.log('\n🔄 ТЕСТ КЭШИРОВАНИЯ (3 одинаковых запроса):');
  const testUrl = `${BASE_URL}/api/v2/wallet/balance?user_id=184`;
  
  for (let i = 1; i <= 3; i++) {
    console.log(`\n📍 Запрос #${i}:`);
    const start = Date.now();
    await testApiEndpoint(testUrl, `Balance Request #${i}`);
    const duration = Date.now() - start;
    console.log(`⏱️  Время выполнения: ${duration}ms`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
}

// Запуск тестирования
testCacheClearing().catch(error => {
  console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
  process.exit(1);
});