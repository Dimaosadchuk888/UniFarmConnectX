#!/usr/bin/env node
/**
 * ПОЛНАЯ ДИАГНОСТИКА ПРОБЛЕМЫ TON ДЕПОЗИТОВ
 * Проверяем весь поток от frontend до database
 */

const http = require('http');
const fs = require('fs');

// Simulated JWT token для тестирования (base64 encoded)
const TEST_JWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxODQsInRlbGVncmFtX2lkIjo1MDg5NzI0NjQsInVzZXJuYW1lIjoiQWRtaW5Cb3QiLCJyZWZfY29kZSI6IjFNOEVKSyIsImlhdCI6MTczNzQ2NzE0NSwiZXhwIjoxNzM4MDcxOTQ1fQ.invalid_signature_for_testing';

async function makeAuthenticatedRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT}`
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

async function debugTonDepositsComplete() {
  console.log('🔍 ПОЛНАЯ ДИАГНОСТИКА TON ДЕПОЗИТОВ');
  console.log('='.repeat(50));
  
  // 1. Проверяем структуру кода
  console.log('\n1️⃣ АНАЛИЗ КОДА processTonDeposit');
  
  try {
    const serviceCode = fs.readFileSync('modules/wallet/service.ts', 'utf8');
    
    // Проверяем исправление
    const hasCorrectFix = serviceCode.includes("eq('metadata->tx_hash', ton_tx_hash)");
    console.log(`✅ Исправление дедупликации: ${hasCorrectFix}`);
    
    // Проверяем структуру metadata
    const hasMetadataStructure = serviceCode.includes('tx_hash: ton_tx_hash');
    console.log(`✅ Правильная структура metadata: ${hasMetadataStructure}`);
    
    // Проверяем логирование
    const hasLogging = serviceCode.includes('logger.info') && serviceCode.includes('TON депозит');
    console.log(`✅ Логирование присутствует: ${hasLogging}`);
    
    // Извлекаем строки создания транзакции
    const lines = serviceCode.split('\n');
    console.log('\n📋 Ключевые строки создания транзакции:');
    lines.forEach((line, index) => {
      if (line.includes('metadata:') || line.includes('tx_hash:') || line.includes('amount_ton:')) {
        console.log(`  ${index + 1}: ${line.trim()}`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Ошибка чтения service.ts: ${error.message}`);
  }
  
  // 2. Проверяем endpoint доступность
  console.log('\n2️⃣ ПРОВЕРКА ENDPOINT ДОСТУПНОСТИ');
  
  try {
    // Тест health endpoint
    const healthResponse = await makeAuthenticatedRequest('/health');
    console.log(`✅ Health check: ${healthResponse.status} - ${JSON.stringify(healthResponse.data).substring(0, 100)}`);
    
    // Тест wallet balance endpoint  
    const balanceResponse = await makeAuthenticatedRequest('/api/v2/wallet/balance?user_id=184');
    console.log(`📊 Balance endpoint: ${balanceResponse.status}`);
    if (balanceResponse.data.success) {
      console.log(`   TON Balance: ${balanceResponse.data.data.tonBalance}`);
      console.log(`   UNI Balance: ${balanceResponse.data.data.uniBalance}`);
    } else {
      console.log(`   Error: ${JSON.stringify(balanceResponse.data)}`);
    }
    
  } catch (error) {
    console.log(`❌ Ошибка проверки endpoints: ${error.message}`);
  }
  
  // 3. Симулируем TON deposit запрос  
  console.log('\n3️⃣ СИМУЛЯЦИЯ TON DEPOSIT ЗАПРОСА');
  
  try {
    const testDepositData = {
      user_id: 184,
      ton_tx_hash: `test_debug_${Date.now()}`,
      amount: 0.5,
      wallet_address: "UQTestWallet_Debug_" + Math.random().toString(36).substring(7)
    };
    
    console.log('📝 Данные для тестирования:', testDepositData);
    
    const depositResponse = await makeAuthenticatedRequest('/api/v2/wallet/ton-deposit', 'POST', testDepositData);
    console.log(`📨 TON Deposit Response: ${depositResponse.status}`);
    console.log(`📋 Response Data: ${JSON.stringify(depositResponse.data, null, 2)}`);
    
    if (depositResponse.status === 401) {
      console.log('⚠️ Ошибка аутентификации - требуется правильный JWT токен');
    } else if (depositResponse.status === 400) {
      console.log('⚠️ Ошибка валидации данных');
    } else if (depositResponse.status === 500) {
      console.log('🚨 Ошибка сервера - проблема в processTonDeposit');
    }
    
  } catch (error) {
    console.log(`❌ Ошибка симуляции депозита: ${error.message}`);
  }
  
  // 4. Проверяем controller
  console.log('\n4️⃣ АНАЛИЗ WALLET CONTROLLER');
  
  try {
    const controllerCode = fs.readFileSync('modules/wallet/controller.ts', 'utf8');
    
    const hasValidation = controllerCode.includes('ton_tx_hash') && controllerCode.includes('amount') && controllerCode.includes('wallet_address');
    console.log(`✅ Валидация входных данных: ${hasValidation}`);
    
    const hasUserLookup = controllerCode.includes('getUserByTelegramId');
    console.log(`✅ Поиск пользователя по telegram_id: ${hasUserLookup}`);
    
    const callsProcessTonDeposit = controllerCode.includes('processTonDeposit');
    console.log(`✅ Вызов processTonDeposit: ${callsProcessTonDeposit}`);
    
  } catch (error) {
    console.log(`❌ Ошибка анализа controller: ${error.message}`);
  }
  
  // 5. Возможные корневые причины
  console.log('\n5️⃣ ВОЗМОЖНЫЕ КОРНЕВЫЕ ПРИЧИНЫ ПРОБЛЕМЫ');
  
  console.log('\n🎯 ПРИЧИНА A: АУТЕНТИФИКАЦИЯ');
  console.log('- Разные Telegram аккаунты = разные telegram_id');
  console.log('- JWT токен содержит один telegram_id, а депозит от другого');
  console.log('- getUserByTelegramId не находит пользователя');
  console.log('- Результат: 404 "Пользователь не найден"');
  
  console.log('\n🎯 ПРИЧИНА B: СУPABASE ОШИБКИ');
  console.log('- Supabase операции могут fail silently');
  console.log('- RLS (Row Level Security) может блокировать запросы');
  console.log('- Timeout или connection issues');
  console.log('- Результат: транзакции не создаются');
  
  console.log('\n🎯 ПРИЧИНА C: VALIDATION ERRORS');
  console.log('- ton_tx_hash может быть неправильного формата');
  console.log('- amount может быть 0 или NaN');
  console.log('- wallet_address может быть invalid');
  console.log('- Результат: 400 "Не все обязательные поля заполнены"');
  
  console.log('\n🎯 ПРИЧИНА D: FRONTEND ПРОБЛЕМЫ');
  console.log('- TonDepositCard не отправляет запросы');
  console.log('- TON Connect integration сломана');
  console.log('- Неправильные данные в localStorage');
  console.log('- Результат: API calls вообще не делаются');
  
  console.log('\n🎯 ПРИЧИНА E: RACE CONDITIONS');
  console.log('- Множественные депозиты одновременно');
  console.log('- Dедупликация срабатывает неожиданно');
  console.log('- Supabase conflicts при parallel inserts');
  console.log('- Результат: только первый депозит проходит');
  
  // 6. План исправления
  console.log('\n6️⃣ ПЛАН ИСПРАВЛЕНИЯ');
  
  console.log('\n🔧 ШАГ 1: УСИЛЕНИЕ ЛОГИРОВАНИЯ');
  console.log('- Добавить детальные логи в processTonDeposit');
  console.log('- Логировать каждый этап: auth, validation, db operations');
  console.log('- Показать точную причину failure');
  
  console.log('\n🔧 ШАГ 2: УЛУЧШЕНИЕ ОБРАБОТКИ ОШИБОК');
  console.log('- Catch и обработка всех Supabase errors');
  console.log('- Proper error messages для frontend');
  console.log('- Rollback mechanisms для частичных failures');
  
  console.log('\n🔧 ШАГ 3: ПРОВЕРКА АУТЕНТИФИКАЦИИ');
  console.log('- Валидация что telegram_id существует в базе');
  console.log('- Лучшая обработка JWT token issues');
  console.log('- Fallback mechanisms для auth problems');
  
  console.log('\n🔧 ШАГ 4: FRONTEND DEBUGGING');
  console.log('- Добавить логи в TonDepositCard');
  console.log('- Проверить что POST requests отправляются');
  console.log('- Validate response handling');
  
  return true;
}

// Запуск диагностики
debugTonDepositsComplete()
  .then(() => console.log('\n✅ Полная диагностика завершена'))
  .catch(error => console.error('\n❌ Ошибка диагностики:', error));