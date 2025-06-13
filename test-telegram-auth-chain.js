/**
 * T16: Полный тест цепочки Telegram авторизации
 * Проверяет передачу initData от frontend до backend и создание пользователя в БД
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/v2';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';

/**
 * Генерирует валидный Telegram initData для тестирования
 */
function generateValidInitData(user, botToken) {
  const authDate = Math.floor(Date.now() / 1000);
  
  const initDataParams = [
    `auth_date=${authDate}`,
    `user=${JSON.stringify(user)}`
  ];
  
  const sortedParams = initDataParams.sort().join('\n');
  
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(sortedParams)
    .digest('hex');
  
  return [...initDataParams, `hash=${hash}`].join('&');
}

/**
 * Тестирует авторизацию через /api/v2/auth/telegram
 */
async function testTelegramAuth() {
  console.log('\n🔐 Тестирование /api/v2/auth/telegram...');
  
  const testUser = {
    id: Math.floor(Math.random() * 1000000) + 100000,
    username: `testuser_${Date.now()}`,
    first_name: 'Test User',
    language_code: 'ru'
  };
  
  const initData = generateValidInitData(testUser, BOT_TOKEN);
  console.log('Generated initData for user:', testUser.id);
  console.log('InitData length:', initData.length);
  
  try {
    console.log('\n📤 Sending auth request...');
    const response = await fetch(`${API_BASE}/auth/telegram`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData
      },
      body: JSON.stringify({ 
        initData,
        ref_by: 'test_ref_code'
      })
    });
    
    const result = await response.json();
    
    console.log(`📥 Auth Response Status: ${response.status}`);
    console.log('Auth Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success && result.token) {
      console.log('✅ Auth успешна, получен токен');
      return { success: true, token: result.token, user: result.user };
    } else {
      console.log('❌ Auth неуспешна');
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Ошибка auth запроса:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Тестирует регистрацию через /api/v2/register/telegram
 */
async function testTelegramRegister() {
  console.log('\n📝 Тестирование /api/v2/register/telegram...');
  
  const testUser = {
    id: Math.floor(Math.random() * 1000000) + 200000,
    username: `newuser_${Date.now()}`,
    first_name: 'New User',
    language_code: 'ru'
  };
  
  const initData = generateValidInitData(testUser, BOT_TOKEN);
  console.log('Generated initData for new user:', testUser.id);
  
  try {
    console.log('\n📤 Sending register request...');
    const response = await fetch(`${API_BASE}/register/telegram`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData
      },
      body: JSON.stringify({ 
        initData,
        ref_by: 'test_ref_code'
      })
    });
    
    const result = await response.json();
    
    console.log(`📥 Register Response Status: ${response.status}`);
    console.log('Register Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success && result.token) {
      console.log('✅ Регистрация успешна, получен токен');
      return { success: true, token: result.token, user: result.user };
    } else {
      console.log('❌ Регистрация неуспешна');
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Ошибка register запроса:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Тестирует защищенный endpoint с JWT токеном
 */
async function testProtectedEndpoint(token) {
  console.log('\n🔒 Тестирование защищенного endpoint...');
  
  try {
    console.log('\n📤 Sending protected request with JWT...');
    const response = await fetch(`${API_BASE}/me`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    console.log(`📥 Protected Response Status: ${response.status}`);
    console.log('Protected Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success) {
      console.log('✅ Защищенный endpoint работает с JWT');
      return { success: true, data: result };
    } else {
      console.log('❌ Защищенный endpoint вернул ошибку');
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Ошибка protected запроса:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Тестирует валидацию токена
 */
async function testTokenValidation(token) {
  console.log('\n🎫 Тестирование валидации токена...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/check`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    console.log(`📥 Token Check Status: ${response.status}`);
    console.log('Token Check Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success) {
      console.log('✅ Токен валиден');
      return { success: true, data: result };
    } else {
      console.log('❌ Токен невалиден');
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Ошибка token check запроса:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Основная функция тестирования
 */
async function runFullAuthTest() {
  console.log('🚀 Запуск полного теста цепочки Telegram авторизации');
  console.log('API Base:', API_BASE);
  console.log('Bot Token available:', !!BOT_TOKEN);
  console.log('=' .repeat(60));
  
  const results = {
    auth: null,
    register: null,
    protected: null,
    tokenCheck: null
  };
  
  // 1. Тест авторизации
  results.auth = await testTelegramAuth();
  
  // 2. Тест регистрации
  results.register = await testTelegramRegister();
  
  // 3. Тест защищенного endpoint с токеном из регистрации
  if (results.register.success && results.register.token) {
    results.protected = await testProtectedEndpoint(results.register.token);
    results.tokenCheck = await testTokenValidation(results.register.token);
  }
  
  // Итоговый отчет
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
  console.log('='.repeat(60));
  
  console.log('Auth endpoint:', results.auth.success ? '✅ Работает' : '❌ Не работает');
  console.log('Register endpoint:', results.register.success ? '✅ Работает' : '❌ Не работает');
  console.log('Protected endpoint:', results.protected?.success ? '✅ Работает' : '❌ Не работает');
  console.log('Token validation:', results.tokenCheck?.success ? '✅ Работает' : '❌ Не работает');
  
  const allWorking = results.auth.success && results.register.success && 
                    results.protected?.success && results.tokenCheck?.success;
  
  console.log('\n🎯 ОБЩИЙ СТАТУС:', allWorking ? '✅ ВСЁ РАБОТАЕТ' : '❌ ЕСТЬ ПРОБЛЕМЫ');
  
  if (!allWorking) {
    console.log('\n🔍 РЕКОМЕНДАЦИИ:');
    if (!results.auth.success) {
      console.log('- Проверить endpoint /api/v2/auth/telegram');
    }
    if (!results.register.success) {
      console.log('- Проверить endpoint /api/v2/register/telegram');
    }
    if (!results.protected?.success) {
      console.log('- Проверить JWT middleware для защищенных endpoints');
    }
    if (!results.tokenCheck?.success) {
      console.log('- Проверить endpoint /api/v2/auth/check');
    }
  }
  
  return allWorking;
}

// Запуск тестов
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullAuthTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Критическая ошибка тестирования:', error);
      process.exit(1);
    });
}

export { runFullAuthTest, testTelegramAuth, testTelegramRegister };