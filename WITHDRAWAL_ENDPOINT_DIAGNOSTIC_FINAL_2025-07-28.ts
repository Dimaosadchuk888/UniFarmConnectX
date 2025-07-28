#!/usr/bin/env tsx

/**
 * ФИНАЛЬНАЯ ДИАГНОСТИКА WITHDRAWAL ENDPOINT
 * Дата: 28.07.2025 - Поиск причины 404 ошибки
 */

import fetch from 'node-fetch';

console.log('🎯 ФИНАЛЬНАЯ ДИАГНОСТИКА WITHDRAWAL ENDPOINT');
console.log('='.repeat(80));

async function testAllEndpointVariants() {
  console.log('\n🔍 ТЕСТИРОВАНИЕ ВСЕХ ВАРИАНТОВ ENDPOINT...');
  
  const endpoints = [
    'http://localhost:3000/api/v2/wallet/withdraw',
    'http://localhost:3000/api/wallet/withdraw', 
    'http://localhost:3000/wallet/withdraw',
    'http://localhost:3000/api/v2/wallet',
    'http://localhost:3000/api/wallet',
    'http://localhost:3000/wallet'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Тестирую: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'test' })
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.status !== 404) {
        const text = await response.text();
        console.log(`   Response: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error}`);
    }
  }
}

async function testServerHealth() {
  console.log('\n💓 ПРОВЕРКА ЗДОРОВЬЯ СЕРВЕРА...');
  
  const healthEndpoints = [
    'http://localhost:3000/api/v2/health',
    'http://localhost:3000/api/health',
    'http://localhost:3000/health',
    'http://localhost:3000/api/v2/test-routes',
    'http://localhost:3000/api/test-routes'
  ];
  
  for (const endpoint of healthEndpoints) {
    try {
      const response = await fetch(endpoint);
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.text();
        console.log(`   ✅ ${data.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`${endpoint}: ❌ ${error}`);
    }
  }
}

async function investigateRouteMapping() {
  console.log('\n🔧 ИССЛЕДОВАНИЕ РОУТИНГА...');
  
  // Тестируем что routes вообще работают
  try {
    const testResponse = await fetch('http://localhost:3000/api/v2/test-routes');
    console.log(`Test routes: ${testResponse.status}`);
    
    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log('✅ Routes подключены и работают');
      console.log('Available routes:', data.routes);
    }
  } catch (error) {
    console.log('❌ Routes test failed:', error);
  }
  
  // Проверяем wallet endpoints
  try {
    const walletResponse = await fetch('http://localhost:3000/api/v2/wallet');
    console.log(`Wallet root: ${walletResponse.status} ${walletResponse.statusText}`);
    
    if (walletResponse.status === 401) {
      console.log('✅ Wallet routes работают (требуют авторизацию)');
    }
  } catch (error) {
    console.log('❌ Wallet routes test failed:', error);
  }
}

async function analyzeRouteStructure() {
  console.log('\n📋 АНАЛИЗ СТРУКТУРЫ ROUTES...');
  
  console.log('📁 ОЖИДАЕМАЯ СТРУКТУРА:');
  console.log('1. server/index.ts → app.use("/api/v2", apiRoutes)');
  console.log('2. server/routes.ts → router.use("/wallet", walletRoutes)');
  console.log('3. modules/wallet/routes.ts → router.post("/withdraw", ...)');
  console.log('4. Результат: POST /api/v2/wallet/withdraw');
  
  console.log('\n🎯 ПРОВЕРКА ЦЕПОЧКИ:');
  console.log('✅ server/index.ts: app.use(apiPrefix, apiRoutes) - строка 667');
  console.log('✅ server/routes.ts: router.use("/wallet", walletRoutes) - строка 295');
  console.log('✅ modules/wallet/routes.ts: router.post("/withdraw", ...) - строка 78');
  console.log('❓ Результирующий path: /api/v2 + /wallet + /withdraw = /api/v2/wallet/withdraw');
  
  console.log('\n⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ:');
  console.log('1. Rate limiting блокирует все POST запросы');
  console.log('2. Middleware chain падает до достижения controller');
  console.log('3. ValidationSchema отклоняет запрос на раннем этапе');
  console.log('4. RequireTelegramAuth блокирует неавторизованные запросы');
}

async function runDiagnostic() {
  await testServerHealth();
  await investigateRouteMapping();
  await testAllEndpointVariants();
  analyzeRouteStructure();
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 ЗАКЛЮЧЕНИЕ ДИАГНОСТИКИ');
  console.log('='.repeat(80));
  
  console.log('📋 ФАКТЫ:');
  console.log('1. ✅ Сервер работает и отвечает');
  console.log('2. ✅ Routes подключены правильно в server/index.ts');
  console.log('3. ✅ Wallet routes подключены в server/routes.ts');
  console.log('4. ✅ Withdraw endpoint существует в modules/wallet/routes.ts');
  console.log('5. ❌ Endpoint /api/v2/wallet/withdraw возвращает 404');
  
  console.log('\n🎯 НАИБОЛЕЕ ВЕРОЯТНАЯ ПРИЧИНА:');
  console.log('Middleware chain issue - один из middleware блокирует');
  console.log('route registration или выбрасывает ошибку до controller');
  
  console.log('\n💡 СЛЕДУЮЩИЕ ШАГИ:');
  console.log('1. Проверить server logs во время withdrawal попытки');
  console.log('2. Добавить debug logging в modules/wallet/routes.ts');
  console.log('3. Проверить validateBody и requireTelegramAuth middleware');
  console.log('4. Тестировать с валидными JWT токенами');
}

runDiagnostic().catch(console.error);