/**
 * T18: Тест регистрации пользователей через Telegram Mini App
 * Проверяет вызов /api/v2/register/telegram и сохранение в БД
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api/v2';
const BOT_TOKEN = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';

/**
 * Генерирует валидный Telegram initData
 */
function generateValidInitData(user, botToken) {
  const authDate = Math.floor(Date.now() / 1000);
  
  const initDataParams = [
    `auth_date=${authDate}`,
    `user=${encodeURIComponent(JSON.stringify(user))}`,
    `query_id=test_query_${Date.now()}`
  ];
  
  const dataCheckString = initDataParams.sort().join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return [...initDataParams, `hash=${hash}`].join('&');
}

/**
 * Тестирует регистрацию нового пользователя
 */
async function testNewUserRegistration() {
  console.log('\n🔸 Тест 1: Регистрация нового пользователя');
  
  const testUser = {
    id: Math.floor(Math.random() * 1000000) + 100000,
    username: `testuser_${Date.now()}`,
    first_name: 'Test',
    language_code: 'ru'
  };
  
  const initData = generateValidInitData(testUser, BOT_TOKEN);
  
  try {
    const response = await fetch(`${API_BASE}/auth/register/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });
    
    const result = await response.json();
    
    console.log(`  Статус: ${response.status}`);
    console.log(`  Ответ:`, JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success) {
      console.log('  ✅ Новый пользователь зарегистрирован');
      console.log(`  👤 ID: ${result.user.id}, Telegram ID: ${result.user.telegram_id}`);
      console.log(`  🔑 Token: ${result.token ? 'Получен' : 'Отсутствует'}`);
      return { success: true, user: result.user, token: result.token };
    } else {
      console.log('  ❌ Ошибка регистрации');
      return { success: false, error: result.error || 'Unknown error' };
    }
  } catch (error) {
    console.log(`  💥 Ошибка запроса: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Тестирует повторную регистрацию существующего пользователя
 */
async function testExistingUserRegistration(existingUser) {
  console.log('\n🔸 Тест 2: Повторная регистрация существующего пользователя');
  
  const testUser = {
    id: existingUser.telegram_id,
    username: existingUser.username,
    first_name: 'Test Updated',
    language_code: 'ru'
  };
  
  const initData = generateValidInitData(testUser, BOT_TOKEN);
  
  try {
    const response = await fetch(`${API_BASE}/auth/register/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });
    
    const result = await response.json();
    
    console.log(`  Статус: ${response.status}`);
    console.log(`  Ответ:`, JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success) {
      console.log('  ✅ Существующий пользователь найден');
      console.log(`  🔄 isNewUser: ${result.isNewUser || false}`);
      return { success: true, isNewUser: result.isNewUser };
    } else {
      console.log('  ❌ Ошибка при повторной регистрации');
      return { success: false, error: result.error || 'Unknown error' };
    }
  } catch (error) {
    console.log(`  💥 Ошибка запроса: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Тестирует регистрацию с реферальным кодом
 */
async function testRegistrationWithReferral() {
  console.log('\n🔸 Тест 3: Регистрация с реферальным кодом');
  
  const testUser = {
    id: Math.floor(Math.random() * 1000000) + 200000,
    username: `refuser_${Date.now()}`,
    first_name: 'Referral User',
    language_code: 'ru'
  };
  
  const initData = generateValidInitData(testUser, BOT_TOKEN);
  
  try {
    const response = await fetch(`${API_BASE}/auth/register/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initData,
        ref_by: 'TESTREF123' // Тестовый реферальный код
      })
    });
    
    const result = await response.json();
    
    console.log(`  Статус: ${response.status}`);
    console.log(`  Ответ:`, JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success) {
      console.log('  ✅ Пользователь с реферальным кодом зарегистрирован');
      return { success: true, user: result.user };
    } else {
      console.log('  ❌ Ошибка регистрации с реферальным кодом');
      return { success: false, error: result.error || 'Unknown error' };
    }
  } catch (error) {
    console.log(`  💥 Ошибка запроса: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Проверяет доступность endpoint'а
 */
async function checkEndpointAvailability() {
  console.log('🔸 Проверка доступности endpoint /api/v2/auth/register/telegram');
  
  try {
    const response = await fetch(`${API_BASE}/auth/register/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: 'invalid' })
    });
    
    console.log(`  Статус: ${response.status}`);
    
    if (response.status === 400 || response.status === 401) {
      console.log('  ✅ Endpoint доступен (правильно отклоняет неверные данные)');
      return true;
    } else if (response.status === 404) {
      console.log('  ❌ Endpoint не найден');
      return false;
    } else {
      console.log('  ⚠️ Неожиданный ответ');
      return false;
    }
  } catch (error) {
    console.log(`  💥 Ошибка подключения: ${error.message}`);
    return false;
  }
}

/**
 * Основная функция тестирования
 */
async function runRegistrationTests() {
  console.log('🚀 ЗАПУСК ТЕСТОВ РЕГИСТРАЦИИ TELEGRAM ПОЛЬЗОВАТЕЛЕЙ');
  console.log('=' .repeat(60));
  
  const results = {
    endpointAvailable: false,
    newUserRegistration: false,
    existingUserHandling: false,
    referralRegistration: false
  };
  
  // Тест 1: Проверка доступности endpoint
  results.endpointAvailable = await checkEndpointAvailability();
  
  if (!results.endpointAvailable) {
    console.log('\n❌ КРИТИЧЕСКАЯ ОШИБКА: Endpoint /api/v2/auth/register/telegram недоступен');
    console.log('🔧 Необходимо проверить маршруты в modules/auth/routes.ts');
    return results;
  }
  
  // Тест 2: Регистрация нового пользователя
  const newUserResult = await testNewUserRegistration();
  results.newUserRegistration = newUserResult.success;
  
  // Тест 3: Повторная регистрация (если первый тест прошел)
  if (newUserResult.success && newUserResult.user) {
    const existingUserResult = await testExistingUserRegistration(newUserResult.user);
    results.existingUserHandling = existingUserResult.success && !existingUserResult.isNewUser;
  }
  
  // Тест 4: Регистрация с реферальным кодом
  const referralResult = await testRegistrationWithReferral();
  results.referralRegistration = referralResult.success;
  
  // Итоговый отчет
  console.log('\n' + '='.repeat(60));
  console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log('=' .repeat(60));
  
  console.log(`🌐 Endpoint доступен: ${results.endpointAvailable ? '✅' : '❌'}`);
  console.log(`👤 Регистрация нового пользователя: ${results.newUserRegistration ? '✅' : '❌'}`);
  console.log(`🔄 Обработка существующего пользователя: ${results.existingUserHandling ? '✅' : '❌'}`);
  console.log(`🔗 Регистрация с реферальным кодом: ${results.referralRegistration ? '✅' : '❌'}`);
  
  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Общий результат: ${successCount}/${totalTests} тестов пройдено`);
  
  if (successCount === totalTests) {
    console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Регистрация Telegram пользователей работает корректно.');
  } else {
    console.log('⚠️ Найдены проблемы. Требуется дополнительная настройка.');
  }
  
  return results;
}

// Запуск тестов
if (import.meta.url === `file://${process.argv[1]}`) {
  runRegistrationTests().catch(console.error);
}

export { runRegistrationTests };