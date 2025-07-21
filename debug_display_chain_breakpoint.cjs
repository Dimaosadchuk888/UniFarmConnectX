#!/usr/bin/env node
/**
 * ТОЧНАЯ ДИАГНОСТИКА BREAKPOINT В ЦЕПОЧКЕ ОТОБРАЖЕНИЯ
 * Пошаговая проверка каждого звена цепочки TON депозитов
 */

const http = require('http');

// Тестовые JWT токены для разных пользователей
const TEST_JWT_184 = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxODQsInRlbGVncmFtX2lkIjo1MDg5NzI0NjQsInVzZXJuYW1lIjoiQWRtaW5Cb3QiLCJyZWZfY29kZSI6IjFNOEVKSyIsImlhdCI6MTczNzQ2NzE0NSwiZXhwIjoxNzM4MDcxOTQ1fQ.invalid_signature_for_testing';

const TEST_JWT_25 = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoyNSwidGVsZWdyYW1faWQiOjQyNTg1NTc0NCwidXNlcm5hbWUiOiJEaW1hT3NhZGNodWsiLCJyZWZfY29kZSI6IlRFU1RfMjUiLCJpYXQiOjE3Mzc0NjcxNDUsImV4cCI6MTczODA3MTk0NX0.invalid_signature_for_testing';

async function makeRequest(path, method = 'GET', body = null, jwt = TEST_JWT_184) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('Timeout')));
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function debugDisplayChainBreakpoint() {
  console.log('🔍 ТОЧНАЯ ДИАГНОСТИКА BREAKPOINT ЦЕПОЧКИ ОТОБРАЖЕНИЯ');
  console.log('='.repeat(65));
  
  // ТЕСТ 1: Проверка каждого звена цепочки для User 184
  console.log('\n1️⃣ ТЕСТИРОВАНИЕ ЦЕПОЧКИ ДЛЯ USER 184 (АКТИВНЫЙ)');
  
  // Звено 1: Health check
  try {
    const healthResponse = await makeRequest('/health');
    console.log(`✅ Звено 0 (Server Health): ${healthResponse.status === 200 ? 'OK' : 'FAIL'}`);
  } catch (error) {
    console.log(`❌ Звено 0 (Server Health): FAIL - ${error.message}`);
  }
  
  // Звено 2: Balance API
  try {
    const balanceResponse = await makeRequest('/api/v2/wallet/balance?user_id=184', 'GET', null, TEST_JWT_184);
    console.log(`📊 Звено 1 (Balance API): ${balanceResponse.status}`);
    if (balanceResponse.status === 200 && balanceResponse.data.success) {
      console.log(`   TON Balance: ${balanceResponse.data.data.tonBalance}`);
      console.log(`   UNI Balance: ${balanceResponse.data.data.uniBalance}`);
    } else {
      console.log(`   Error: ${JSON.stringify(balanceResponse.data)}`);
    }
  } catch (error) {
    console.log(`❌ Звено 1 (Balance API): FAIL - ${error.message}`);
  }
  
  // Звено 3: TON Deposit симуляция
  try {
    console.log(`\n🧪 Звено 2 (TON Deposit Test): Симуляция депозита`);
    const testDepositData = {
      user_id: 184,
      ton_tx_hash: `test_debug_184_${Date.now()}`,
      amount: 0.1,
      wallet_address: `UQTestWallet184_${Math.random().toString(36).substring(7)}`
    };
    
    const depositResponse = await makeRequest('/api/v2/wallet/ton-deposit', 'POST', testDepositData, TEST_JWT_184);
    console.log(`   Status: ${depositResponse.status}`);
    console.log(`   Response: ${JSON.stringify(depositResponse.data, null, 2)}`);
    
    if (depositResponse.status === 200) {
      console.log('✅ TON Deposit endpoint доступен для User 184');
    } else if (depositResponse.status === 404) {
      console.log('🚨 BREAKPOINT НАЙДЕН: 404 "Пользователь не найден" для User 184');
    } else if (depositResponse.status === 401) {
      console.log('🚨 BREAKPOINT НАЙДЕН: 401 "Ошибка аутентификации" для User 184');
    } else {
      console.log(`🚨 BREAKPOINT НАЙДЕН: ${depositResponse.status} статус для User 184`);
    }
  } catch (error) {
    console.log(`❌ Звено 2 (TON Deposit): EXCEPTION - ${error.message}`);
  }
  
  // ТЕСТ 2: Проверка цепочки для User 25 (проблемный)
  console.log('\n2️⃣ ТЕСТИРОВАНИЕ ЦЕПОЧКИ ДЛЯ USER 25 (ПРОБЛЕМНЫЙ)');
  
  // Balance API для User 25
  try {
    const balanceResponse = await makeRequest('/api/v2/wallet/balance?user_id=25', 'GET', null, TEST_JWT_25);
    console.log(`📊 Balance API для User 25: ${balanceResponse.status}`);
    if (balanceResponse.status === 200 && balanceResponse.data.success) {
      console.log(`   TON Balance: ${balanceResponse.data.data.tonBalance}`);
      console.log(`   UNI Balance: ${balanceResponse.data.data.uniBalance}`);
    } else {
      console.log(`   Error: ${JSON.stringify(balanceResponse.data)}`);
    }
  } catch (error) {
    console.log(`❌ Balance API для User 25: FAIL - ${error.message}`);
  }
  
  // TON Deposit для User 25
  try {
    console.log(`\n🧪 TON Deposit Test для User 25:`);
    const testDepositData = {
      user_id: 25,
      ton_tx_hash: `test_debug_25_${Date.now()}`,
      amount: 0.1,
      wallet_address: `UQTestWallet25_${Math.random().toString(36).substring(7)}`
    };
    
    const depositResponse = await makeRequest('/api/v2/wallet/ton-deposit', 'POST', testDepositData, TEST_JWT_25);
    console.log(`   Status: ${depositResponse.status}`);
    console.log(`   Response: ${JSON.stringify(depositResponse.data, null, 2)}`);
    
    if (depositResponse.status === 404) {
      console.log('🚨 ПОДТВЕРЖДЕН BREAKPOINT: User 25 не найден в системе!');
    }
  } catch (error) {
    console.log(`❌ TON Deposit для User 25: EXCEPTION - ${error.message}`);
  }
  
  // ТЕСТ 3: Кросс-аутентификация (User 184 JWT + User 25 data)
  console.log('\n3️⃣ ТЕСТ КРОСС-АУТЕНТИФИКАЦИИ (СИМУЛЯЦИЯ ПРОБЛЕМЫ)');
  
  try {
    console.log(`🧪 User 184 JWT + User 25 deposit data:`);
    const crossTestData = {
      user_id: 25,  // Депозит для User 25
      ton_tx_hash: `cross_test_${Date.now()}`,
      amount: 0.05,
      wallet_address: `UQCrossTest_${Math.random().toString(36).substring(7)}`
    };
    
    // Используем JWT от User 184, но данные от User 25
    const crossResponse = await makeRequest('/api/v2/wallet/ton-deposit', 'POST', crossTestData, TEST_JWT_184);
    console.log(`   Status: ${crossResponse.status}`);
    console.log(`   Response: ${JSON.stringify(crossResponse.data, null, 2)}`);
    
    if (crossResponse.status === 404) {
      console.log('🚨 КРИТИЧНО: Это точная симуляция проблемы "разных кабинетов"!');
      console.log('   JWT от User 184, но system ищет User 25 - не находит!');
    }
  } catch (error) {
    console.log(`❌ Cross-auth test: EXCEPTION - ${error.message}`);
  }
  
  // ТЕСТ 4: Проверка JWT декодирования
  console.log('\n4️⃣ АНАЛИЗ JWT ТОКЕНОВ');
  
  const decodeJWT = (token) => {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (e) {
      return null;
    }
  };
  
  const jwt184 = decodeJWT(TEST_JWT_184);
  const jwt25 = decodeJWT(TEST_JWT_25);
  
  console.log('\n📋 JWT 184 payload:', JSON.stringify(jwt184, null, 2));
  console.log('\n📋 JWT 25 payload:', JSON.stringify(jwt25, null, 2));
  
  // ТЕСТ 5: Детальный анализ controller логики
  console.log('\n5️⃣ АНАЛИЗ CONTROLLER ЛОГИКИ');
  
  console.log('\n🔍 ОЖИДАЕМОЕ ПОВЕДЕНИЕ CONTROLLER:');
  console.log('1. validateTelegramAuth(req) → извлекает telegram.user.id из JWT');
  console.log('2. getUserByTelegramId(telegram.user.id) → ищет пользователя в БД');
  console.log('3. Если пользователь НЕ НАЙДЕН → return 404');
  console.log('4. Если найден → вызывает processTonDeposit()');
  
  console.log('\n🚨 ПРОБЛЕМНЫЙ СЦЕНАРИЙ:');
  console.log('1. Frontend отправляет JWT от User A (telegram_id: 123)');
  console.log('2. Но в body указан user_id от User B');
  console.log('3. Controller ищет User A по telegram_id из JWT');
  console.log('4. User A не найден → 404 error');
  console.log('5. processTonDeposit() НИКОГДА НЕ ВЫЗЫВАЕТСЯ');
  
  // ТЕСТ 6: Финальные рекомендации
  console.log('\n6️⃣ ТОЧКИ BREAKPOINT И РЕШЕНИЯ');
  
  console.log('\n🎯 BREAKPOINT #1: JWT vs Body Mismatch');
  console.log('   - JWT содержит telegram_id от одного пользователя');
  console.log('   - Body содержит user_id от другого пользователя');
  console.log('   - Controller не может найти соответствие');
  
  console.log('\n🎯 BREAKPOINT #2: Authentication Logic');
  console.log('   - getUserByTelegramId ищет по JWT telegram_id');
  console.log('   - НО депозит может быть от другого telegram аккаунта');
  console.log('   - Нет fallback механизма');
  
  console.log('\n🎯 BREAKPOINT #3: Error Handling');
  console.log('   - 404 errors не показываются пользователю');
  console.log('   - Frontend не знает что запрос failed');
  console.log('   - Баланс не обновляется без видимых причин');
  
  console.log('\n💡 НЕМЕДЛЕННЫЕ ИСПРАВЛЕНИЯ:');
  console.log('1. Добавить детальное логирование в tonDeposit controller');
  console.log('2. Показывать ошибки аутентификации в UI');
  console.log('3. Создать систему auto-creation для неизвестных пользователей');
  console.log('4. Добавить fallback по wallet_address вместо только telegram_id');
  
  return true;
}

// Запуск диагностики
debugDisplayChainBreakpoint()
  .then(() => console.log('\n✅ Диагностика breakpoint завершена'))
  .catch(error => console.error('\n❌ Ошибка диагностики:', error));