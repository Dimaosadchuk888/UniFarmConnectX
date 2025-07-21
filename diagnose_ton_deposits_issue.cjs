#!/usr/bin/env node
/**
 * ГЛУБОКАЯ ДИАГНОСТИКА ПРОБЛЕМЫ TON ДЕПОЗИТОВ
 * Анализируем почему исправление не работает
 */

const http = require('http');
const fs = require('fs');

async function makeApiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
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

async function diagnoseTonDepositsIssue() {
  console.log('🔍 ГЛУБОКАЯ ДИАГНОСТИКА ПРОБЛЕМЫ TON ДЕПОЗИТОВ');
  console.log('='.repeat(60));
  
  // 1. Проверяем что код действительно изменился
  console.log('\n1️⃣ ВЕРИФИКАЦИЯ ИСПРАВЛЕНИЯ В КОДЕ');
  
  try {
    const serviceCode = fs.readFileSync('modules/wallet/service.ts', 'utf8');
    const hasCorrectFix = serviceCode.includes("eq('metadata->tx_hash', ton_tx_hash)");
    const hasOldBug = serviceCode.includes("eq('description', ton_tx_hash)");
    
    console.log(`✅ Правильное исправление в коде: ${hasCorrectFix}`);
    console.log(`❌ Старая ошибка в коде: ${hasOldBug}`);
    
    if (!hasCorrectFix) {
      console.log('🚨 КРИТИЧНО: Исправление НЕ ПРИМЕНИЛОСЬ в коде!');
      return;
    }
    
  } catch (error) {
    console.log(`❌ Ошибка чтения кода: ${error.message}`);
  }
  
  // 2. Тестируем реальный TON депозит endpoint
  console.log('\n2️⃣ ТЕСТИРОВАНИЕ TON DEPOSIT ENDPOINT');
  
  try {
    // Симуляция TON депозита (без JWT для упрощения)
    const testDepositData = {
      user_id: 184,
      ton_tx_hash: "test_tx_" + Date.now(),
      amount: 0.1,
      wallet_address: "UQTest_Address_123"
    };
    
    console.log('📋 Тестовые данные депозита:', testDepositData);
    
    // НЕ делаем реальный вызов, так как нет JWT токена
    console.log('⚠️ Пропускаем реальный API вызов (требует JWT аутентификации)');
    
  } catch (error) {
    console.log(`❌ Ошибка теста endpoint: ${error.message}`);
  }
  
  // 3. Анализируем возможные корневые причины
  console.log('\n3️⃣ АНАЛИЗ ВОЗМОЖНЫХ КОРНЕВЫХ ПРИЧИН');
  
  console.log('\n🎯 ВОЗМОЖНАЯ ПРИЧИНА 1: НЕПРАВИЛЬНАЯ АУТЕНТИФИКАЦИЯ');
  console.log('- TON депозиты от "разных кабинетов" могут иметь разные telegram_id');
  console.log('- getUserByTelegramId может не находить правильного пользователя');
  console.log('- Или JWT токены содержат неправильные данные');
  
  console.log('\n🎯 ВОЗМОЖНАЯ ПРИЧИНА 2: ОШИБКИ В ЛОГАХ СЕРВЕРА');
  console.log('- processTonDeposit может завершаться с ошибками');
  console.log('- Supabase операции могут fails без логирования');
  console.log('- Транзакции создаются но балансы не обновляются');
  
  console.log('\n🎯 ВОЗМОЖНАЯ ПРИЧИНА 3: ПРОБЛЕМЫ С METADATA СТРУКТУРОЙ');
  console.log('- metadata поле может не содержать tx_hash');
  console.log('- Или структура metadata отличается от ожидаемой');
  console.log('- JSON поле может иметь другой формат');
  
  console.log('\n🎯 ВОЗМОЖНАЯ ПРИЧИНА 4: КЭШИРОВАНИЕ/СИНХРОНИЗАЦИЯ');
  console.log('- Frontend кэш не обновляется после депозита');
  console.log('- WebSocket уведомления не работают');
  console.log('- balanceService возвращает старые данные');
  
  console.log('\n🎯 ВОЗМОЖНАЯ ПРИЧИНА 5: НЕПРАВИЛЬНЫЙ ПОТОК ДАННЫХ');
  console.log('- TonDepositCard отправляет неправильные данные');
  console.log('- tonConnectService может подменять tx_hash');
  console.log('- JWT payload содержит неправильный user_id');
  
  // 4. Рекомендации по диагностике
  console.log('\n4️⃣ РЕКОМЕНДАЦИИ ПО ДАЛЬНЕЙШЕЙ ДИАГНОСТИКЕ');
  
  console.log('\n🔍 ЧТО НУЖНО ПРОВЕРИТЬ:');
  console.log('1. Логи сервера во время попытки депозита');
  console.log('2. Данные которые отправляет frontend');
  console.log('3. JWT токен и telegram_id пользователя');
  console.log('4. Существующие транзакции в базе данных');
  console.log('5. Структуру metadata в созданных транзакциях');
  
  console.log('\n📝 КОМАНДЫ ДЛЯ ДИАГНОСТИКИ:');
  console.log('- Проверить логи: tail -f server.log');
  console.log('- Проверить браузер console во время депозита');
  console.log('- Декодировать JWT токен для проверки user_id');
  console.log('- Запросить список последних транзакций через Supabase');
  
  // 5. Проверяем структуру Supabase
  console.log('\n5️⃣ ПРОВЕРКА КОНФИГУРАЦИИ SUPABASE');
  
  try {
    const supabaseConfig = fs.readFileSync('core/supabase.ts', 'utf8');
    console.log('✅ Файл core/supabase.ts найден');
    
    if (supabaseConfig.includes('createClient')) {
      console.log('✅ Supabase клиент настроен');
    } else {
      console.log('❌ Проблема с конфигурацией Supabase клиента');
    }
    
  } catch (error) {
    console.log(`❌ Ошибка проверки Supabase: ${error.message}`);
  }
  
  return true;
}

// Запуск диагностики
diagnoseTonDepositsIssue()
  .then(() => console.log('\n✅ Диагностика завершена'))
  .catch(error => console.error('\n❌ Ошибка диагностики:', error));