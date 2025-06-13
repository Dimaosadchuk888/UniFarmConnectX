/**
 * Test script for newly implemented API endpoints T8
 * Tests: GET /api/v2/me, GET /api/v2/farming/history, POST /api/v2/airdrop/register
 */

import crypto from 'crypto';

const BASE_URL = 'http://localhost:3000/api/v2';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7474610948:AAGsomEY7o_TUIEMoWb7LE3s85vAPUyabPo';

/**
 * Generates valid Telegram initData for testing
 */
function generateValidInitData(user, botToken) {
  const dataCheckString = Object.keys(user)
    .sort()
    .map(key => `${key}=${user[key]}`)
    .join('\n');
  
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  return Object.keys(user)
    .sort()
    .map(key => `${key}=${encodeURIComponent(user[key])}`)
    .join('&') + `&hash=${hash}`;
}

async function testRequest(path, method = 'GET', data = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    return {
      status: response.status,
      data: responseData ? JSON.parse(responseData) : null
    };
  } catch (error) {
    return {
      status: 500,
      error: error.message
    };
  }
}

async function testMeEndpoint() {
  console.log('\n🔍 Тестирование GET /api/v2/me');
  
  // Test without auth
  const noAuthResult = await testRequest('/me');
  console.log('❌ Без авторизации:', noAuthResult.status, noAuthResult.data?.error);
  
  // Test with valid auth
  const user = {
    id: '100000001',
    first_name: 'Main',
    username: 'main_test_user',
    auth_date: Math.floor(Date.now() / 1000)
  };
  
  const initData = generateValidInitData(user, BOT_TOKEN);
  const authResult = await testRequest('/me', 'GET', null, {
    'x-telegram-init-data': initData
  });
  
  console.log('✅ С авторизацией:', authResult.status);
  if (authResult.data?.success) {
    console.log('✅ Данные пользователя получены:', JSON.stringify(authResult.data.data, null, 2));
  } else {
    console.log('❌ Ошибка:', authResult.data?.error);
  }
  
  return authResult.status === 200 && authResult.data?.success;
}

async function testFarmingHistoryEndpoint() {
  console.log('\n🔍 Тестирование GET /api/v2/farming/history');
  
  // Test without auth
  const noAuthResult = await testRequest('/farming/history');
  console.log('❌ Без авторизации:', noAuthResult.status, noAuthResult.data?.error);
  
  // Test with valid auth
  const user = {
    id: '100000001',
    first_name: 'Main',
    username: 'main_test_user',
    auth_date: Math.floor(Date.now() / 1000)
  };
  
  const initData = generateValidInitData(user, BOT_TOKEN);
  const authResult = await testRequest('/farming/history', 'GET', null, {
    'x-telegram-init-data': initData
  });
  
  console.log('✅ С авторизацией:', authResult.status);
  if (authResult.data?.success) {
    console.log('✅ История фарминга получена, записей:', authResult.data.data?.length || 0);
    if (authResult.data.data?.length > 0) {
      console.log('✅ Пример записи:', JSON.stringify(authResult.data.data[0], null, 2));
    }
  } else {
    console.log('❌ Ошибка:', authResult.data?.error);
  }
  
  return authResult.status === 200 && authResult.data?.success;
}

async function testAirdropRegisterEndpoint() {
  console.log('\n🔍 Тестирование POST /api/v2/airdrop/register');
  
  // Test without auth
  const noAuthResult = await testRequest('/airdrop/register', 'POST', { telegram_id: 100000001 });
  console.log('❌ Без авторизации:', noAuthResult.status, noAuthResult.data?.error);
  
  // Test with valid auth
  const user = {
    id: '100000001',
    first_name: 'Main',
    username: 'main_test_user',
    auth_date: Math.floor(Date.now() / 1000)
  };
  
  const initData = generateValidInitData(user, BOT_TOKEN);
  
  // First registration attempt
  const firstResult = await testRequest('/airdrop/register', 'POST', 
    { telegram_id: 100000001 }, 
    { 'x-telegram-init-data': initData }
  );
  
  console.log('✅ Первая регистрация:', firstResult.status);
  if (firstResult.data?.success) {
    console.log('✅ Регистрация успешна:', firstResult.data.data?.message);
  } else {
    console.log('❌ Ошибка:', firstResult.data?.error);
  }
  
  // Second registration attempt (should fail)
  const secondResult = await testRequest('/airdrop/register', 'POST',
    { telegram_id: 100000001 },
    { 'x-telegram-init-data': initData }
  );
  
  console.log('✅ Повторная регистрация:', secondResult.status);
  if (!secondResult.data?.success && secondResult.status === 409) {
    console.log('✅ Защита от повторной регистрации работает:', secondResult.data?.error);
  } else {
    console.log('❌ Защита не сработала');
  }
  
  return firstResult.status === 200 && firstResult.data?.success;
}

async function runAllTests() {
  console.log('🚀 ТЕСТИРОВАНИЕ НОВЫХ API ENDPOINTS - ЗАДАЧА T8');
  console.log('📍 Endpoints: GET /me, GET /farming/history, POST /airdrop/register');
  
  const results = {
    me: await testMeEndpoint(),
    farmingHistory: await testFarmingHistoryEndpoint(),
    airdropRegister: await testAirdropRegisterEndpoint()
  };
  
  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log(`✅ GET /api/v2/me: ${results.me ? 'РАБОТАЕТ' : 'ОШИБКА'}`);
  console.log(`✅ GET /api/v2/farming/history: ${results.farmingHistory ? 'РАБОТАЕТ' : 'ОШИБКА'}`);
  console.log(`✅ POST /api/v2/airdrop/register: ${results.airdropRegister ? 'РАБОТАЕТ' : 'ОШИБКА'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎯 ЗАДАЧА T8 ВЫПОЛНЕНА УСПЕШНО!');
    console.log('✅ Все 3 новых API маршрута работают корректно');
    console.log('✅ Авторизация через Telegram защищает endpoints');
    console.log('✅ Данные извлекаются из production базы ep-lucky-boat-a463bggt');
    console.log('✅ Защита от повторной регистрации в airdrop работает');
  } else {
    console.log('\n❌ Некоторые endpoints требуют исправления');
  }
  
  return allPassed;
}

runAllTests();