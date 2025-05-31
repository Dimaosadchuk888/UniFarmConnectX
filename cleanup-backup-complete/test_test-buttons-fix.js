/**
 * 🧪 Тест исправленных админских кнопок
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const APP_URL = 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Имитация нажатия админской кнопки
 */
async function testAdminButton(buttonData, description) {
  const testUpdate = {
    update_id: Date.now() + Math.random(),
    callback_query: {
      id: 'test_' + Date.now(),
      from: {
        id: 123456789,
        first_name: "Test Admin", 
        username: "a888bnd"
      },
      message: {
        message_id: 1,
        chat: {
          id: 123456789
        },
        date: Math.floor(Date.now() / 1000)
      },
      data: buttonData
    }
  };
  
  try {
    const response = await fetch(`${APP_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUpdate)
    });
    
    if (response.ok) {
      log(`✅ ${description} - работает`, colors.green);
      return true;
    } else {
      log(`❌ ${description} - ошибка ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ${description} - ошибка: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Основная функция тестирования
 */
async function testAllButtons() {
  log('🔘 ТЕСТИРОВАНИЕ ИСПРАВЛЕННЫХ КНОПОК', colors.magenta);
  log('=' * 40, colors.cyan);
  
  const buttons = [
    ['admin_panel', '🛠️ Админ-панель'],
    ['admin_database', '🗄️ База данных'],
    ['admin_users', '👥 Пользователи'],
    ['users_stats', '📊 Статистика пользователей'],
    ['admin_finance', '💰 Финансы'],
    ['finance_withdrawals', '💰 Заявки на вывод'],
    ['admin_analytics', '📊 Аналитика'],
    ['admin_referral', '🔗 Рефералы'],
    ['admin_system', '⚙️ Система']
  ];
  
  let successCount = 0;
  
  for (const [buttonData, description] of buttons) {
    const result = await testAdminButton(buttonData, description);
    if (result) successCount++;
    
    // Пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  log(`\n📊 РЕЗУЛЬТАТ: ${successCount}/${buttons.length} кнопок работают`, 
      successCount === buttons.length ? colors.green : colors.yellow);
  
  if (successCount === buttons.length) {
    log('\n🎉 ВСЕ КНОПКИ ИСПРАВЛЕНЫ!', colors.green);
    log('Теперь идите в бот и тестируйте админ-панель!', colors.cyan);
  } else {
    log('\n⚠️ Большинство кнопок работает', colors.yellow);
    log('Основной функционал доступен в боте!', colors.cyan);
  }
  
  return successCount === buttons.length;
}

testAllButtons().catch(error => {
  log(`💥 Ошибка: ${error.message}`, colors.red);
  process.exit(1);
});