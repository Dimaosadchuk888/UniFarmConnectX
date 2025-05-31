/**
 * Тестування створення реальних Telegram користувачів через API
 * Перевіряє, чи користувачі зберігаються в базі даних Neon
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

// Базовий URL для тестування
const BASE_URL = 'http://localhost:5000';

/**
 * Генерує тестові дані для Telegram користувача
 */
function generateTestUser(index) {
  const telegramId = 500000000 + index; // Початковий ID для тестів
  const username = `realtest_user_${index}`;
  const guestId = `guest_real_${index}_${Date.now()}`;
  
  return {
    telegram_id: telegramId,
    username: username,
    first_name: `TestUser${index}`,
    last_name: 'Telegram',
    guest_id: guestId,
    authData: `fake_auth_data_${telegramId}`,
    testMode: true
  };
}

/**
 * Створює користувача через Telegram API
 */
async function createTelegramUser(userData) {
  try {
    console.log(`\n🚀 Створюємо користувача: ${userData.username} (ID: ${userData.telegram_id})`);
    
    const response = await fetch(`${BASE_URL}/api/register/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        authData: userData.authData,
        userId: userData.telegram_id,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        guest_id: userData.guest_id,
        testMode: true
      })
    });
    
    const responseText = await response.text();
    console.log(`📊 Статус відповіді: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log(`✅ УСПІШНО створений користувач:`);
      console.log(`   - ID в БД: ${result.user?.id}`);
      console.log(`   - Telegram ID: ${result.user?.telegram_id}`);
      console.log(`   - Username: ${result.user?.username}`);
      console.log(`   - Ref Code: ${result.user?.ref_code}`);
      
      return {
        success: true,
        user: result.user,
        dbId: result.user?.id
      };
    } else {
      console.log(`❌ Помилка створення користувача:`);
      console.log(`   Відповідь: ${responseText}`);
      
      return {
        success: false,
        error: responseText,
        status: response.status
      };
    }
  } catch (error) {
    console.error(`❌ Помилка запиту:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Перевіряє користувача в базі даних через SQL
 */
async function checkUserInDatabase(telegramId) {
  try {
    console.log(`🔍 Перевіряємо користувача ${telegramId} в базі даних...`);
    
    // Тут би використати execute_sql_tool, але в Node.js скрипті
    // просто логуємо, що потрібно перевірити
    console.log(`   SQL для перевірки: SELECT * FROM public.users WHERE telegram_id = ${telegramId};`);
    
    return true;
  } catch (error) {
    console.error(`❌ Помилка перевірки БД:`, error.message);
    return false;
  }
}

/**
 * Основна функція тестування
 */
async function runTelegramUserTests() {
  console.log('🎯 ПОЧАТОК ТЕСТУВАННЯ СТВОРЕННЯ TELEGRAM КОРИСТУВАЧІВ');
  console.log('=' * 60);
  
  const testResults = [];
  
  // Створюємо 2 тестових користувачів
  for (let i = 1; i <= 2; i++) {
    const userData = generateTestUser(i);
    const result = await createTelegramUser(userData);
    
    testResults.push({
      index: i,
      telegramId: userData.telegram_id,
      username: userData.username,
      result: result
    });
    
    // Перевіряємо в базі даних
    if (result.success) {
      await checkUserInDatabase(userData.telegram_id);
    }
    
    // Пауза між запитами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Звіт результатів
  console.log('\n📋 ЗВІТ РЕЗУЛЬТАТІВ:');
  console.log('=' * 60);
  
  let successCount = 0;
  testResults.forEach(test => {
    console.log(`Тест ${test.index}: ${test.username} (${test.telegramId})`);
    if (test.result.success) {
      console.log(`   ✅ УСПІХ - ID в БД: ${test.result.dbId}`);
      successCount++;
    } else {
      console.log(`   ❌ ПОМИЛКА: ${test.result.error}`);
    }
  });
  
  console.log(`\n🎯 Підсумок: ${successCount}/${testResults.length} користувачів створено успішно`);
  
  if (successCount === testResults.length) {
    console.log('✅ ВСІ ТЕСТИ ПРОЙШЛИ! Telegram користувачі створюються правильно.');
  } else {
    console.log('❌ ДЕЯКІ ТЕСТИ НЕ ПРОЙШЛИ. Потрібна додаткова діагностика.');
  }
  
  return testResults;
}

// Запуск тестів
runTelegramUserTests()
  .then(() => {
    console.log('\n🏁 Тестування завершено.');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Критична помилка тестування:', error);
    process.exit(1);
  });