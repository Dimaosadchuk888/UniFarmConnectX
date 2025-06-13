/**
 * Тест полной цепочки авторизации Telegram пользователей
 * Проверяет /api/v2/auth/telegram и последующие API вызовы
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api/v2';
const BOT_TOKEN = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';

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

async function testTelegramAuth() {
  console.log('🔐 Тестирование авторизации через Telegram...');
  
  const testUser = {
    id: Math.floor(Math.random() * 1000000) + 100000,
    username: `testuser_${Date.now()}`,
    first_name: 'Test User',
    language_code: 'ru'
  };
  
  const initData = generateValidInitData(testUser, BOT_TOKEN);
  
  try {
    console.log('Вызов /api/v2/auth/telegram...');
    const response = await fetch(`${API_BASE}/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });
    
    const result = await response.json();
    
    console.log(`Статус ответа: ${response.status}`);
    console.log('Результат:', JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success && result.token) {
      console.log('✅ Авторизация успешна');
      return { success: true, token: result.token, user: result.user };
    } else {
      console.log('❌ Авторизация неуспешна');
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.log(`💥 Ошибка запроса: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testProtectedEndpoint(token, endpoint) {
  console.log(`🔒 Тест защищенного endpoint: ${endpoint}`);
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    console.log(`Статус: ${response.status}`);
    if (response.status === 200) {
      console.log('✅ Endpoint доступен с токеном');
      return true;
    } else {
      console.log('❌ Endpoint недоступен:', result.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log(`💥 Ошибка: ${error.message}`);
    return false;
  }
}

async function runFullAuthTest() {
  console.log('🚀 ПОЛНЫЙ ТЕСТ АВТОРИЗАЦИИ TELEGRAM');
  console.log('=' .repeat(50));
  
  // Тест 1: Авторизация
  const authResult = await testTelegramAuth();
  
  if (!authResult.success) {
    console.log('\n❌ КРИТИЧЕСКАЯ ОШИБКА: Авторизация не работает');
    return;
  }
  
  console.log('\n✅ Авторизация работает, токен получен');
  console.log(`Token: ${authResult.token.substring(0, 20)}...`);
  
  // Тест 2: Защищенные endpoints
  console.log('\n🔒 Тестирование защищенных endpoints...');
  
  const protectedEndpoints = ['/me', '/wallet', '/referrals'];
  let workingEndpoints = 0;
  
  for (const endpoint of protectedEndpoints) {
    const works = await testProtectedEndpoint(authResult.token, endpoint);
    if (works) workingEndpoints++;
  }
  
  console.log('\n📊 РЕЗУЛЬТАТЫ:');
  console.log(`✅ Авторизация: работает`);
  console.log(`🔒 Защищенные endpoints: ${workingEndpoints}/${protectedEndpoints.length} работают`);
  
  if (workingEndpoints === protectedEndpoints.length) {
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Система авторизации полностью функциональна.');
  } else {
    console.log('\n⚠️ Некоторые endpoints недоступны. Проверьте middleware авторизации.');
  }
}

export { runFullAuthTest };

// Запуск при прямом вызове
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullAuthTest().catch(console.error);
}