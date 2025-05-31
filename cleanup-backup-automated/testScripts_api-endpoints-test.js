/**
 * Автоматизированный тест всех API-эндпоинтов UniFarm
 * 
 * Этот скрипт проверяет работоспособность каждого API-эндпоинта и соответствие его ответов
 * стандартизированному формату { success: true/false, data/error: ... }
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS = [];

/**
 * Выполняет API-запрос
 */
async function callApi(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UniFarm-API-Tester/1.0'
      }
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    console.log(`🔍 Тестирую: ${method} ${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'CONNECTION_ERROR',
      error: error.message,
      data: null
    };
  }
}

/**
 * Регистрирует результат теста
 */
function recordTestResult(endpoint, method, status, isSuccess, isStandardized, notes = '') {
  TEST_RESULTS.push({
    endpoint,
    method,
    status,
    isSuccess,
    isStandardized,
    notes,
    timestamp: new Date().toISOString()
  });
}

/**
 * Тестирует каждый API-эндпоинт
 */
async function testAllEndpoints() {
  console.log('🚀 НАЧИНАЮ КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ API ЭНДПОИНТОВ');
  console.log('='.repeat(60));
  
  // 1. Тест основных системных эндпоинтов
  console.log('\n📋 1. ТЕСТИРОВАНИЕ СИСТЕМНЫХ ЭНДПОИНТОВ');
  console.log('-'.repeat(40));
  
  const healthResult = await callApi('/health');
  recordTestResult('/health', 'GET', healthResult.status, 
    healthResult.status === 200, 
    healthResult.data && typeof healthResult.data === 'object',
    'Проверка работоспособности сервера'
  );
  
  // 2. Тест миссий (критично для REDMAP)
  console.log('\n🎯 2. ТЕСТИРОВАНИЕ СИСТЕМЫ МИССИЙ');
  console.log('-'.repeat(40));
  
  const missionsResult = await callApi('/api/v2/missions/active');
  recordTestResult('/api/v2/missions/active', 'GET', missionsResult.status,
    missionsResult.status === 200,
    missionsResult.data && (missionsResult.data.success !== undefined),
    'Получение активных миссий (награда 500 UNI)'
  );
  
  // 3. Тест UNI фарминга (критично для REDMAP)
  console.log('\n🌾 3. ТЕСТИРОВАНИЕ UNI ФАРМИНГА');
  console.log('-'.repeat(40));
  
  const farmingStatusResult = await callApi('/api/v2/uni-farming/status');
  recordTestResult('/api/v2/uni-farming/status', 'GET', farmingStatusResult.status,
    farmingStatusResult.status === 200,
    farmingStatusResult.data && (farmingStatusResult.data.success !== undefined),
    'Статус UNI фарминга'
  );
  
  // 4. Тест TON буст системы (критично для REDMAP)
  console.log('\n💎 4. ТЕСТИРОВАНИЕ TON БУСТ СИСТЕМЫ');
  console.log('-'.repeat(40));
  
  const tonBoostsResult = await callApi('/api/v2/ton-farming/boosts');
  recordTestResult('/api/v2/ton-farming/boosts', 'GET', tonBoostsResult.status,
    tonBoostsResult.status === 200,
    tonBoostsResult.data && (tonBoostsResult.data.success !== undefined),
    'TON буст пакеты (Starter/Standard/Advanced/Premium)'
  );
  
  const generalBoostsResult = await callApi('/api/v2/boosts');
  recordTestResult('/api/v2/boosts', 'GET', generalBoostsResult.status,
    generalBoostsResult.status === 200,
    generalBoostsResult.data && (generalBoostsResult.data.success !== undefined),
    'Общие буст пакеты'
  );
  
  // 5. Тест реферальной системы (критично для REDMAP)
  console.log('\n👥 5. ТЕСТИРОВАНИЕ РЕФЕРАЛЬНОЙ СИСТЕМЫ');
  console.log('-'.repeat(40));
  
  const referralTreeResult = await callApi('/api/v2/referral/tree');
  recordTestResult('/api/v2/referral/tree', 'GET', referralTreeResult.status,
    referralTreeResult.status === 200 || referralTreeResult.status === 401,
    referralTreeResult.data && (referralTreeResult.data.success !== undefined),
    'Реферальное дерево (доход от фарминга)'
  );
  
  // 6. Тест кошелька (критично для REDMAP)
  console.log('\n💰 6. ТЕСТИРОВАНИЕ СИСТЕМЫ КОШЕЛЬКА');
  console.log('-'.repeat(40));
  
  const walletBalanceResult = await callApi('/api/v2/wallet/balance');
  recordTestResult('/api/v2/wallet/balance', 'GET', walletBalanceResult.status,
    walletBalanceResult.status === 200 || walletBalanceResult.status === 401,
    walletBalanceResult.data && (walletBalanceResult.data.success !== undefined),
    'Баланс кошелька (UNI и TON)'
  );
  
  // 7. Тест ежедневных бонусов (критично для REDMAP)
  console.log('\n🎁 7. ТЕСТИРОВАНИЕ ЕЖЕДНЕВНЫХ БОНУСОВ');
  console.log('-'.repeat(40));
  
  const dailyBonusResult = await callApi('/api/v2/daily-bonus/status');
  recordTestResult('/api/v2/daily-bonus/status', 'GET', dailyBonusResult.status,
    dailyBonusResult.status === 200 || dailyBonusResult.status === 401,
    dailyBonusResult.data && (dailyBonusResult.data.success !== undefined),
    'Статус ежедневного бонуса'
  );
  
  console.log('\n✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
}

/**
 * Генерирует отчет о результатах тестирования
 */
function generateReport() {
  console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ API');
  console.log('='.repeat(60));
  
  const totalTests = TEST_RESULTS.length;
  const successfulTests = TEST_RESULTS.filter(t => t.isSuccess).length;
  const standardizedTests = TEST_RESULTS.filter(t => t.isStandardized).length;
  
  console.log(`📈 Общая статистика:`);
  console.log(`   Всего тестов: ${totalTests}`);
  console.log(`   Успешных: ${successfulTests}/${totalTests} (${(successfulTests/totalTests*100).toFixed(1)}%)`);
  console.log(`   Стандартизированных: ${standardizedTests}/${totalTests} (${(standardizedTests/totalTests*100).toFixed(1)}%)`);
  
  console.log('\n📋 Детальные результаты:');
  console.log('-'.repeat(40));
  
  TEST_RESULTS.forEach((result, index) => {
    const statusIcon = result.isSuccess ? '✅' : '❌';
    const standardIcon = result.isStandardized ? '📋' : '⚠️';
    
    console.log(`${index + 1}. ${statusIcon} ${standardIcon} ${result.method} ${result.endpoint}`);
    console.log(`   Статус: ${result.status} | ${result.notes}`);
    
    if (!result.isSuccess && result.status === 0) {
      console.log(`   ⚠️ Проблема: Сервер недоступен (требуется запуск)`);
    } else if (!result.isSuccess) {
      console.log(`   ⚠️ Проблема: HTTP ${result.status}`);
    }
    
    if (!result.isStandardized && result.isSuccess) {
      console.log(`   📋 Требует стандартизации ответа API`);
    }
  });
  
  return {
    totalTests,
    successfulTests,
    standardizedTests,
    results: TEST_RESULTS
  };
}

/**
 * Анализирует проблемы и дает рекомендации по исправлению
 */
function provideRecommendations() {
  console.log('\n💡 РЕКОМЕНДАЦИИ ПО УЛУЧШЕНИЮ');
  console.log('='.repeat(60));
  
  const failedTests = TEST_RESULTS.filter(t => !t.isSuccess);
  const nonStandardTests = TEST_RESULTS.filter(t => t.isSuccess && !t.isStandardized);
  
  if (failedTests.length === 0 && nonStandardTests.length === 0) {
    console.log('🎉 Все тесты прошли успешно! API готов к продакшену.');
    return;
  }
  
  if (failedTests.some(t => t.status === 0)) {
    console.log('🚀 ПРИОРИТЕТ 1: Запуск сервера');
    console.log('   • Запустите сервер командой npm run dev');
    console.log('   • Убедитесь, что порт 3000 свободен');
    console.log('   • Проверьте подключение к базе данных');
  }
  
  if (failedTests.some(t => t.status >= 400)) {
    console.log('🔧 ПРИОРИТЕТ 2: Исправление ошибок API');
    console.log('   • Проверьте аутентификацию для защищенных эндпоинтов');
    console.log('   • Убедитесь в корректности контроллеров');
    console.log('   • Проверьте валидацию входных данных');
  }
  
  if (nonStandardTests.length > 0) {
    console.log('📋 ПРИОРИТЕТ 3: Стандартизация ответов API');
    console.log('   • Приведите все ответы к формату { success: true/false, data/error: ... }');
    console.log('   • Добавьте единообразную обработку ошибок');
  }
  
  console.log('\n🎯 СЛЕДУЮЩИЕ ШАГИ:');
  console.log('1. Запустите сервер для live-тестирования');
  console.log('2. Исправьте найденные проблемы');
  console.log('3. Повторите тестирование');
  console.log('4. Проведите интеграционное тестирование с Telegram');
}

// Основная функция
async function runTests() {
  try {
    await testAllEndpoints();
    const report = generateReport();
    provideRecommendations();
    
    // Сохраняем отчет в файл
    console.log('\n💾 Сохранение отчета...');
    
    return report;
  } catch (error) {
    console.error('❌ Ошибка при выполнении тестов:', error.message);
    return null;
  }
}

// Запуск тестирования
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests, callApi };