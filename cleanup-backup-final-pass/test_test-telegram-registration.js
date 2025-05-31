/**
 * Скрипт для тестирования регистрации Telegram пользователей
 * Создает 5 тестовых пользователей с разными telegram_id и проверяет их сохранение в БД
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

// Конфигурация
const BASE_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : 'http://localhost:3000';

/**
 * Генерирует валидные тестовые initData для Telegram WebApp
 */
function generateTelegramInitData(userId, username, firstName = null, lastName = null) {
  const authDate = Math.floor(Date.now() / 1000);
  
  const user = {
    id: userId,
    first_name: firstName || `User${userId}`,
    last_name: lastName || null,
    username: username,
    language_code: 'en'
  };
  
  // Убираем null значения
  Object.keys(user).forEach(key => {
    if (user[key] === null) {
      delete user[key];
    }
  });
  
  const params = new URLSearchParams();
  params.append('user', JSON.stringify(user));
  params.append('auth_date', authDate.toString());
  params.append('query_id', `query_${userId}_${Date.now()}`);
  
  // Генерируем простой hash для тестирования
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const hash = crypto
    .createHmac('sha256', 'test_bot_token_hash')
    .update(dataCheckString)
    .digest('hex');
  
  params.append('hash', hash);
  
  return params.toString();
}

/**
 * Тестовые пользователи для регистрации
 */
const testUsers = [
  {
    telegram_id: 123456789,
    username: 'alice_crypto',
    first_name: 'Alice',
    last_name: 'Smith'
  },
  {
    telegram_id: 987654321,
    username: 'bob_farming',
    first_name: 'Bob',
    last_name: 'Johnson'
  },
  {
    telegram_id: 555777999,
    username: 'charlie_uni',
    first_name: 'Charlie',
    last_name: null
  },
  {
    telegram_id: 111222333,
    username: 'diana_tokens',
    first_name: 'Diana',
    last_name: 'Williams'
  },
  {
    telegram_id: 444666888,
    username: 'eve_blockchain',
    first_name: 'Eve',
    last_name: 'Brown'
  }
];

/**
 * Регистрирует одного пользователя через Telegram API
 */
async function registerTelegramUser(userData) {
  try {
    console.log(`\n[TEST] 🚀 Регистрируем пользователя: ${userData.username} (ID: ${userData.telegram_id})`);
    
    // Генерируем initData для этого пользователя
    const initData = generateTelegramInitData(
      userData.telegram_id,
      userData.username,
      userData.first_name,
      userData.last_name
    );
    
    console.log(`[TEST] InitData длина: ${initData.length} символов`);
    
    // Отправляем запрос на регистрацию
    const response = await fetch(`${BASE_URL}/api/register/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Telegram-Init-Data': initData
      },
      body: JSON.stringify({
        initData: initData,
        referrerCode: null
      })
    });
    
    const responseText = await response.text();
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log(`[TEST] ✅ УСПЕШНО зарегистрирован: ID=${result.user?.id}, ref_code=${result.user?.referralCode}`);
      return {
        success: true,
        user: result.user,
        telegram_id: userData.telegram_id,
        username: userData.username
      };
    } else {
      console.log(`[TEST] ❌ ОШИБКА регистрации: ${response.status} - ${responseText}`);
      return {
        success: false,
        error: responseText,
        telegram_id: userData.telegram_id,
        username: userData.username
      };
    }
  } catch (error) {
    console.error(`[TEST] ❌ ИСКЛЮЧЕНИЕ при регистрации ${userData.username}:`, error.message);
    return {
      success: false,
      error: error.message,
      telegram_id: userData.telegram_id,
      username: userData.username
    };
  }
}

/**
 * Проверяет пользователей в базе данных
 */
async function checkUsersInDatabase() {
  try {
    console.log('\n[TEST] 🔍 Проверяем пользователей в базе данных...');
    
    const response = await fetch(`${BASE_URL}/api/admin/users?limit=10&order=desc`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const users = await response.json();
      console.log(`[TEST] 📊 Найдено пользователей в БД: ${users.length}`);
      
      // Показываем последних пользователей
      users.forEach((user, index) => {
        console.log(`[TEST] ${index + 1}. ID=${user.id}, telegram_id=${user.telegram_id}, username=${user.username}, ref_code=${user.ref_code}`);
      });
      
      return users;
    } else {
      console.error(`[TEST] ❌ Ошибка получения пользователей: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.error('[TEST] ❌ Исключение при проверке БД:', error.message);
    return [];
  }
}

/**
 * Основная функция тестирования
 */
async function runRegistrationTest() {
  console.log('🎯 НАЧИНАЕМ ТЕСТИРОВАНИЕ TELEGRAM РЕГИСТРАЦИИ');
  console.log(`📍 URL приложения: ${BASE_URL}`);
  
  const results = [];
  
  // Регистрируем каждого тестового пользователя
  for (const userData of testUsers) {
    const result = await registerTelegramUser(userData);
    results.push(result);
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Проверяем результаты
  console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Успешно зарегистрировано: ${successful.length}`);
  console.log(`❌ Ошибок регистрации: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ УСПЕШНЫЕ РЕГИСТРАЦИИ:');
    successful.forEach((result, index) => {
      console.log(`${index + 1}. Telegram ID: ${result.telegram_id}, Username: ${result.username}, DB ID: ${result.user?.id}, Ref Code: ${result.user?.referralCode}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ НЕУДАЧНЫЕ РЕГИСТРАЦИИ:');
    failed.forEach((result, index) => {
      console.log(`${index + 1}. Telegram ID: ${result.telegram_id}, Username: ${result.username}, Ошибка: ${result.error}`);
    });
  }
  
  // Проверяем пользователей в БД
  const dbUsers = await checkUsersInDatabase();
  
  console.log('\n🎯 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  return { results, dbUsers };
}

// Запускаем тест
runRegistrationTest().catch(console.error);

export { runRegistrationTest };