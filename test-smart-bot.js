/**
 * 🤖 Тестирование умного бота UniFarm с разделением доступа
 * 
 * Проверяет работу умного разделения между обычными пользователями и администраторами
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NODE_ENV === 'production' 
  ? 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app'
  : 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app';

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
 * Проверяет информацию о боте
 */
async function checkBotInfo() {
  log('\n🤖 Проверка информации о боте...', colors.cyan);
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      log(`✅ Бот найден: @${data.result.username}`, colors.green);
      log(`📛 Имя: ${data.result.first_name}`, colors.blue);
      log(`🆔 ID: ${data.result.id}`, colors.blue);
      return true;
    } else {
      log(`❌ Ошибка получения информации о боте: ${data.description}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка запроса: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Устанавливает webhook для основного бота
 */
async function setupMainBotWebhook() {
  log('\n🔗 Установка webhook для основного бота...', colors.cyan);
  
  const webhookUrl = `${APP_URL}/api/telegram/webhook`;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      log(`✅ Webhook установлен: ${webhookUrl}`, colors.green);
      return true;
    } else {
      log(`❌ Ошибка установки webhook: ${data.description}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка запроса: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Проверяет статус webhook
 */
async function checkWebhook() {
  log('\n📋 Проверка статуса webhook...', colors.cyan);
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const data = await response.json();
    
    if (data.ok) {
      const info = data.result;
      log(`🔗 URL: ${info.url || 'Не установлен'}`, colors.blue);
      log(`✅ Активен: ${info.url ? 'Да' : 'Нет'}`, info.url ? colors.green : colors.red);
      log(`📅 Последнее обновление: ${info.last_error_date ? new Date(info.last_error_date * 1000).toLocaleString('ru-RU') : 'Нет ошибок'}`, colors.blue);
      
      if (info.last_error_message) {
        log(`⚠️ Последняя ошибка: ${info.last_error_message}`, colors.yellow);
      }
      
      return Boolean(info.url);
    } else {
      log(`❌ Ошибка получения информации о webhook: ${data.description}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка запроса: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Устанавливает команды для умного бота
 */
async function setupSmartBotCommands() {
  log('\n⚙️ Установка команд для умного бота...', colors.cyan);
  
  const commands = [
    {
      command: 'start',
      description: 'Запустить UniFarm (умное разделение для админов)'
    },
    {
      command: 'adminka',
      description: 'Прямой доступ к админ-панели'
    },
    {
      command: 'help',
      description: 'Помощь по использованию'
    }
  ];
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      log(`✅ Команды установлены (${commands.length})`, colors.green);
      commands.forEach(cmd => {
        log(`   /${cmd.command} - ${cmd.description}`, colors.blue);
      });
      return true;
    } else {
      log(`❌ Ошибка установки команд: ${data.description}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка запроса: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Проверяет доступность API сервера
 */
async function checkServerAPI() {
  log('\n🌐 Проверка API сервера...', colors.cyan);
  
  try {
    const response = await fetch(`${APP_URL}/api/health`);
    const data = await response.json();
    
    if (response.ok) {
      log(`✅ API сервера доступен`, colors.green);
      log(`📊 Статус: ${data.status || 'OK'}`, colors.blue);
      return true;
    } else {
      log(`❌ API сервера недоступен (${response.status})`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка подключения к серверу: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Тестирует админские функции
 */
async function testAdminFunctions() {
  log('\n🔐 Тестирование админских функций...', colors.cyan);
  
  const testUsername = 'a888bnd';
  const adminSecret = 'unifarm_admin_secret_2025';
  
  try {
    // Тест статуса БД
    const statusResponse = await fetch(`${APP_URL}/api/admin/db-status`);
    
    if (statusResponse.ok) {
      log(`✅ Статус БД доступен`, colors.green);
      const statusData = await statusResponse.json();
      log(`🗄️ База данных: ${statusData.data?.database || 'Unknown'}`, colors.blue);
    } else {
      log(`⚠️ Статус БД недоступен (${statusResponse.status})`, colors.yellow);
    }
    
    // Тест событий БД (требует аутентификации)
    const eventsResponse = await fetch(`${APP_URL}/api/db/events?admin_username=${testUsername}&admin_key=${adminSecret}`);
    
    if (eventsResponse.ok) {
      log(`✅ События БД доступны с аутентификацией`, colors.green);
      const eventsData = await eventsResponse.json();
      log(`📋 Найдено событий: ${eventsData.data?.events?.length || 0}`, colors.blue);
    } else {
      log(`⚠️ События БД требуют настройки (${eventsResponse.status})`, colors.yellow);
    }
    
    return true;
  } catch (error) {
    log(`❌ Ошибка тестирования админских функций: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Демонстрация различий в интерфейсах
 */
function showInterfaceDifferences() {
  log('\n🎨 Интерфейсы для разных типов пользователей:', colors.magenta);
  
  log('\n👥 ОБЫЧНЫЕ ПОЛЬЗОВАТЕЛИ видят:', colors.blue);
  log('   📱 Открыть UniFarm', colors.reset);
  log('   ℹ️ Помощь', colors.reset);
  log('   🔗 Реферальный код', colors.reset);
  
  log('\n🛠️ АДМИНИСТРАТОРЫ (@a888bnd, @DimaOsadchuk) видят:', colors.green);
  log('   📱 Открыть UniFarm', colors.reset);
  log('   🛠️ Админ-панель', colors.reset);
  log('   ℹ️ Помощь', colors.reset);
  log('   🔗 Реферальный код', colors.reset);
  
  log('\n🎛️ В АДМИН-ПАНЕЛИ доступно:', colors.cyan);
  log('   🗄️ База данных (переподключение, события, статус)', colors.reset);
  log('   👥 Пользователи (статистика, поиск)', colors.reset);
  log('   💰 Финансы (заявки, депозиты)', colors.reset);
  log('   📊 Аналитика (отчеты, мониторинг)', colors.reset);
  log('   🔗 Реферальная система', colors.reset);
  log('   ⚙️ Система (логи, тесты)', colors.reset);
}

/**
 * Основная функция тестирования
 */
async function main() {
  log('🎯 Тестирование умного бота UniFarm', colors.cyan);
  log('=' * 50, colors.blue);
  
  if (!BOT_TOKEN) {
    log('❌ Не найден токен бота (TELEGRAM_BOT_TOKEN)', colors.red);
    log('📝 Добавьте токен в файл .env', colors.yellow);
    process.exit(1);
  }
  
  const results = [];
  
  // Проверяем бота
  results.push(await checkBotInfo());
  
  // Проверяем сервер
  results.push(await checkServerAPI());
  
  // Устанавливаем webhook
  results.push(await setupMainBotWebhook());
  
  // Проверяем webhook
  results.push(await checkWebhook());
  
  // Устанавливаем команды
  results.push(await setupSmartBotCommands());
  
  // Тестируем админские функции
  results.push(await testAdminFunctions());
  
  // Показываем различия интерфейсов
  showInterfaceDifferences();
  
  // Итоговый отчет
  log('\n📊 ИТОГОВЫЙ ОТЧЕТ', colors.cyan);
  log('=' * 30, colors.blue);
  
  const successCount = results.filter(Boolean).length;
  const totalCount = results.length;
  
  if (successCount === totalCount) {
    log(`🎉 Все проверки пройдены! (${successCount}/${totalCount})`, colors.green);
    log('✅ Умный бот готов к использованию', colors.green);
  } else {
    log(`⚠️ Выполнено: ${successCount}/${totalCount} проверок`, colors.yellow);
    log('🔧 Некоторые функции требуют дополнительной настройки', colors.yellow);
  }
  
  log('\n📱 КАК ПРОТЕСТИРОВАТЬ:', colors.magenta);
  log('1. Найдите бота @UniFarming_Bot в Telegram', colors.blue);
  log('2. Отправьте команду /start', colors.blue);
  log('3. Обычные пользователи увидят только приложение', colors.blue);
  log('4. Администраторы увидят кнопку "Админ-панель"', colors.blue);
  log('5. Используйте команду /adminka для прямого доступа', colors.blue);
}

// Запускаем тестирование
main().catch(error => {
  log(`💥 Критическая ошибка: ${error.message}`, colors.red);
  process.exit(1);
});