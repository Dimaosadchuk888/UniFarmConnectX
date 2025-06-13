/**
 * Быстрый тест API с валидной Telegram авторизацией
 */

import crypto from 'crypto';

const BOT_TOKEN = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';

function generateValidInitData(user) {
  const initData = {
    user: JSON.stringify(user),
    auth_date: Math.floor(Date.now() / 1000).toString(),
    hash: ''
  };

  const dataCheckString = Object.keys(initData)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${initData[key]}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  initData.hash = hash;

  return Object.keys(initData)
    .map(key => `${key}=${encodeURIComponent(initData[key])}`)
    .join('&');
}

async function testAPI() {
  console.log('🔍 Тестирование API UniFarm после T13...');
  
  const testUser = {
    id: 583465,
    username: 'testuser_583465',
    first_name: 'Test',
    last_name: 'User'
  };

  const initData = generateValidInitData(testUser);
  
  console.log('\n📋 Тест GET /api/v2/me:');
  
  try {
    const response = await fetch('http://localhost:3001/api/v2/me', {
      headers: {
        'X-Telegram-Init-Data': initData,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Автоматическая регистрация работает');
      console.log(`   User ID: ${data.id}`);
      console.log(`   Telegram ID: ${data.telegram_id}`);
      console.log(`   Username: ${data.username}`);
      console.log(`   Ref Code: ${data.ref_code || 'не установлен'}`);
    } else {
      console.log('❌ Ошибка автоматической регистрации');
      console.log(`   Статус: ${response.status}`);
      console.log(`   Ошибка: ${data.error}`);
    }
  } catch (error) {
    console.log('❌ Ошибка подключения:', error.message);
  }

  console.log('\n📋 Тест GET /api/v2/wallet:');
  
  try {
    const response = await fetch('http://localhost:3001/api/v2/wallet', {
      headers: {
        'X-Telegram-Init-Data': initData,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Wallet доступен после автоматической регистрации');
      console.log(`   UNI Balance: ${data.uni_balance}`);
      console.log(`   TON Balance: ${data.ton_balance}`);
    } else {
      console.log('❌ Ошибка доступа к кошельку');
      console.log(`   Статус: ${response.status}`);
      console.log(`   Ошибка: ${data.error}`);
    }
  } catch (error) {
    console.log('❌ Ошибка подключения:', error.message);
  }
}

testAPI().catch(console.error);