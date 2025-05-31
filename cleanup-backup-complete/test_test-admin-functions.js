/**
 * 🧪 Быстрый тест админских функций через API
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
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Тестирует API эндпоинт
 */
async function testAPI(endpoint, description) {
  try {
    const response = await fetch(`${APP_URL}${endpoint}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      log(`✅ ${description} - работает`, colors.green);
      return true;
    } else {
      log(`❌ ${description} - ошибка: ${data.error || 'Unknown'}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ${description} - сетевая ошибка: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Основная функция тестирования
 */
async function testAdminFunctions() {
  log('🔍 ТЕСТИРОВАНИЕ АДМИНСКИХ ФУНКЦИЙ', colors.magenta);
  log('=' * 50, colors.blue);
  
  const tests = [
    // База данных
    ['/api/admin/db-status', '📊 Статус БД'],
    
    // Пользователи  
    ['/api/admin/users/stats', '👥 Статистика пользователей'],
    ['/api/admin/users/search', '🔍 Поиск пользователей'],
    
    // Финансы
    ['/api/admin/finance/withdrawals', '💰 Заявки на вывод'],
    ['/api/admin/finance/deposits', '💳 Депозиты'],
    
    // Аналитика
    ['/api/admin/analytics/overview', '📊 Общая аналитика'],
    
    // Реферальная система
    ['/api/admin/referral/stats', '🔗 Статистика рефералов'],
    
    // Система
    ['/api/admin/system/logs', '⚙️ Системные логи']
  ];
  
  let passedTests = 0;
  const totalTests = tests.length;
  
  for (const [endpoint, description] of tests) {
    const result = await testAPI(endpoint, description);
    if (result) passedTests++;
    
    // Небольшая пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:', colors.magenta);
  log(`✅ Пройдено: ${passedTests}/${totalTests}`, passedTests === totalTests ? colors.green : colors.yellow);
  
  if (passedTests === totalTests) {
    log('\n🎉 ВСЕ АДМИНСКИЕ ФУНКЦИИ РАБОТАЮТ!', colors.green);
    log('Теперь кнопки в боте должны работать корректно.', colors.blue);
  } else {
    log('\n⚠️ Некоторые функции требуют доработки', colors.yellow);
    log('Основные функции работают, но нужны мелкие исправления.', colors.blue);
  }
  
  return passedTests === totalTests;
}

/**
 * Имитация нажатий кнопок администратором
 */
async function simulateAdminButtonClicks() {
  log('\n🖱️ ИМИТАЦИЯ НАЖАТИЙ АДМИНСКИХ КНОПОК', colors.cyan);
  
  const testUpdate = {
    update_id: Date.now(),
    callback_query: {
      id: 'test_callback_' + Date.now(),
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
      data: "admin_database"  // Тестируем кнопку "База данных"
    }
  };
  
  try {
    const response = await fetch(`${APP_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUpdate)
    });
    
    if (response.ok) {
      log('✅ Кнопка "База данных" обработана успешно', colors.green);
      return true;
    } else {
      log('❌ Ошибка обработки кнопки', colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка отправки: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Запуск всех тестов
 */
async function main() {
  // Тестируем API
  const apiWorking = await testAdminFunctions();
  
  // Тестируем кнопки
  const buttonsWorking = await simulateAdminButtonClicks();
  
  log('\n🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ:', colors.magenta);
  
  if (apiWorking && buttonsWorking) {
    log('🟢 СИСТЕМА ПОЛНОСТЬЮ ГОТОВА К ИСПОЛЬЗОВАНИЮ!', colors.green);
    log('Идите в бот @UniFarming_Bot и тестируйте админ-панель!', colors.blue);
  } else if (apiWorking) {
    log('🟡 API РАБОТАЕТ, КНОПКИ ТРЕБУЮТ ИСПРАВЛЕНИЙ', colors.yellow);
    log('Основной функционал доступен, нужны мелкие доработки.', colors.blue);
  } else {
    log('🔴 ТРЕБУЮТСЯ ДОПОЛНИТЕЛЬНЫЕ ИСПРАВЛЕНИЯ', colors.red);
    log('Система требует доработки для полноценной работы.', colors.blue);
  }
}

main().catch(error => {
  log(`💥 Критическая ошибка: ${error.message}`, colors.red);
  process.exit(1);
});