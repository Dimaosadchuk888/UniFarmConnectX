
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

console.log('🚀 Проверка готовности Telegram Mini App\n');

// Этап 1: Проверка API эндпоинтов
async function checkAPIEndpoints() {
  console.log('📡 Этап 1: Проверка API эндпоинтов');
  
  try {
    // Проверяем /api/v2/me
    const meResponse = await fetch(`${API_BASE}/api/v2/me`, {
      headers: {
        'x-guest-id': 'test-guest-id-12345'
      }
    });
    
    console.log(`✅ /api/v2/me статус: ${meResponse.status}`);
    
    if (meResponse.status === 200) {
      const data = await meResponse.json();
      console.log('   Данные получены успешно');
    } else if (meResponse.status === 404) {
      console.log('   Пользователь не найден (ожидаемо для тестового guest_id)');
    } else {
      console.log(`❌ Неожиданный статус: ${meResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Ошибка при проверке API: ${error.message}`);
  }
}

// Этап 2: Проверка Telegram Bot конфигурации
async function checkTelegramBot() {
  console.log('\n🤖 Этап 2: Проверка Telegram Bot');
  
  if (!BOT_TOKEN) {
    console.log('❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения');
    return;
  }
  
  try {
    // Проверяем информацию о боте
    const botInfo = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const botData = await botInfo.json();
    
    if (botData.ok) {
      console.log(`✅ Бот активен: @${botData.result.username}`);
      console.log(`   ID: ${botData.result.id}`);
      console.log(`   Имя: ${botData.result.first_name}`);
    } else {
      console.log('❌ Ошибка получения информации о боте');
    }
    
    // Проверяем webhook
    const webhookInfo = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const webhookData = await webhookInfo.json();
    
    if (webhookData.ok) {
      if (webhookData.result.url) {
        console.log(`✅ Webhook установлен: ${webhookData.result.url}`);
        console.log(`   Последняя ошибка: ${webhookData.result.last_error_message || 'нет'}`);
      } else {
        console.log('⚠️ Webhook не установлен');
      }
    }
  } catch (error) {
    console.log(`❌ Ошибка проверки бота: ${error.message}`);
  }
}

// Этап 3: Проверка структуры БД
async function checkDatabase() {
  console.log('\n💾 Этап 3: Проверка структуры БД');
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/db-status`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ База данных доступна');
      
      if (data.tables) {
        console.log(`   Таблиц найдено: ${data.tables.length}`);
        
        // Проверяем ключевые таблицы
        const requiredTables = ['users', 'transactions', 'referrals', 'missions'];
        requiredTables.forEach(table => {
          if (data.tables.includes(table)) {
            console.log(`   ✅ Таблица ${table} найдена`);
          } else {
            console.log(`   ❌ Таблица ${table} отсутствует`);
          }
        });
      }
    } else {
      console.log(`❌ Ошибка доступа к БД: статус ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Ошибка проверки БД: ${error.message}`);
  }
}

// Этап 4: Проверка валидации initData
async function checkInitDataValidation() {
  console.log('\n🔐 Этап 4: Проверка валидации initData');
  
  // Создаем тестовый initData (невалидный)
  const testInitData = 'user=%7B%22id%22%3A123456789%2C%22username%22%3A%22testuser%22%7D&auth_date=1640995200&hash=invalid_hash';
  
  try {
    const response = await fetch(`${API_BASE}/api/v2/auth/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': testInitData
      },
      body: JSON.stringify({
        telegram_id: 123456789,
        username: 'testuser',
        initData: testInitData
      })
    });
    
    console.log(`   Тест валидации initData: статус ${response.status}`);
    
    if (response.status === 403) {
      console.log('✅ Валидация работает - невалидные данные отклонены');
    } else if (response.status === 200) {
      console.log('⚠️ Валидация пропущена (возможно, режим разработки)');
    } else {
      console.log(`❌ Неожиданный ответ: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Ошибка проверки валидации: ${error.message}`);
  }
}

// Этап 5: Проверка функциональных модулей
async function checkFunctionalModules() {
  console.log('\n🎮 Этап 5: Проверка функциональных модулей');
  
  const modules = [
    { name: 'Миссии', endpoint: '/api/v2/missions' },
    { name: 'UNI Фарминг', endpoint: '/api/v2/uni-farming/status?user_id=1' },
    { name: 'TON Бусты', endpoint: '/api/v2/ton-farming/info?user_id=1' },
    { name: 'Daily Bonus', endpoint: '/api/v2/daily-bonus/status?user_id=1' }
  ];
  
  for (const module of modules) {
    try {
      const response = await fetch(`${API_BASE}${module.endpoint}`);
      
      if (response.status === 200) {
        console.log(`   ✅ ${module.name}: работает`);
      } else {
        console.log(`   ❌ ${module.name}: статус ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${module.name}: ошибка ${error.message}`);
    }
  }
}

// Главная функция
async function runTelegramReadinessCheck() {
  await checkAPIEndpoints();
  await checkTelegramBot();
  await checkDatabase();
  await checkInitDataValidation();
  await checkFunctionalModules();
  
  console.log('\n🏁 Проверка завершена!');
  console.log('\nСледующие шаги:');
  console.log('1. Исправить выявленные проблемы');
  console.log('2. Протестировать с реальным Telegram аккаунтом');
  console.log('3. Проверить все функции в Telegram Mini App');
}

runTelegramReadinessCheck().catch(console.error);
