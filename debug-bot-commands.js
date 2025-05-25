/**
 * 🔍 Отладочный скрипт для тестирования команд бота
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Проверяет текущие команды бота
 */
async function checkCurrentCommands() {
  log('\n📋 Проверка текущих команд бота...', colors.cyan);
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMyCommands`);
    const data = await response.json();
    
    if (data.ok) {
      log(`✅ Команды найдены: ${data.result.length}`, colors.green);
      data.result.forEach(cmd => {
        log(`   /${cmd.command} - ${cmd.description}`, colors.blue);
      });
      return true;
    } else {
      log(`❌ Ошибка получения команд: ${data.description}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка запроса: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Проверяет webhook
 */
async function checkWebhookStatus() {
  log('\n🔗 Проверка webhook...', colors.cyan);
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const data = await response.json();
    
    if (data.ok) {
      const info = data.result;
      log(`🔗 URL: ${info.url || 'Не установлен'}`, colors.blue);
      log(`✅ Активен: ${info.url ? 'Да' : 'Нет'}`, info.url ? colors.green : colors.red);
      log(`📅 Обновлений получено: ${info.pending_update_count || 0}`, colors.blue);
      
      if (info.last_error_message) {
        log(`⚠️ Последняя ошибка: ${info.last_error_message}`, colors.yellow);
        log(`📅 Время ошибки: ${new Date(info.last_error_date * 1000).toLocaleString('ru-RU')}`, colors.yellow);
      }
      
      return Boolean(info.url);
    } else {
      log(`❌ Ошибка получения webhook: ${data.description}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка запроса: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Тестирует API сервера
 */
async function testServerEndpoints() {
  log('\n🌐 Тестирование API сервера...', colors.cyan);
  
  const endpoints = [
    '/api/health',
    '/api/telegram/webhook',
    '/api/admin/db-status'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${APP_URL}${endpoint}`, {
        method: endpoint === '/api/telegram/webhook' ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: endpoint === '/api/telegram/webhook' ? JSON.stringify({ test: true }) : undefined
      });
      
      if (response.ok) {
        log(`✅ ${endpoint} - работает (${response.status})`, colors.green);
      } else {
        log(`⚠️ ${endpoint} - ошибка ${response.status}`, colors.yellow);
      }
    } catch (error) {
      log(`❌ ${endpoint} - недоступен: ${error.message}`, colors.red);
    }
  }
}

/**
 * Отправляет тестовое обновление в webhook
 */
async function sendTestUpdate() {
  log('\n🧪 Отправка тестового обновления...', colors.cyan);
  
  const testUpdate = {
    update_id: 123456789,
    message: {
      message_id: 1,
      from: {
        id: 123456789,
        first_name: "Test",
        username: "a888bnd"  // Ваш admin username
      },
      chat: {
        id: 123456789
      },
      date: Math.floor(Date.now() / 1000),
      text: "/start"
    }
  };
  
  try {
    const response = await fetch(`${APP_URL}/api/telegram/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUpdate)
    });
    
    if (response.ok) {
      const result = await response.json();
      log(`✅ Тестовое обновление обработано успешно`, colors.green);
      log(`📝 Ответ: ${JSON.stringify(result)}`, colors.blue);
    } else {
      log(`❌ Ошибка обработки: ${response.status}`, colors.red);
      const errorText = await response.text();
      log(`📝 Детали: ${errorText}`, colors.yellow);
    }
  } catch (error) {
    log(`❌ Ошибка отправки: ${error.message}`, colors.red);
  }
}

/**
 * Удаляет и заново устанавливает webhook
 */
async function resetWebhook() {
  log('\n🔄 Сброс webhook...', colors.cyan);
  
  try {
    // Удаляем webhook
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
      method: 'POST'
    });
    
    log('🗑️ Webhook удален', colors.yellow);
    
    // Ждем секунду
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Устанавливаем заново
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${APP_URL}/api/telegram/webhook`,
        allowed_updates: ['message', 'callback_query']
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      log('✅ Webhook установлен заново', colors.green);
      return true;
    } else {
      log(`❌ Ошибка установки webhook: ${data.description}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Ошибка сброса webhook: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Основная функция отладки
 */
async function main() {
  log('🔍 Отладка команд бота UniFarm', colors.cyan);
  log('=' * 40, colors.blue);
  
  if (!BOT_TOKEN) {
    log('❌ Не найден токен бота', colors.red);
    process.exit(1);
  }
  
  await checkCurrentCommands();
  await checkWebhookStatus();
  await testServerEndpoints();
  await sendTestUpdate();
  
  log('\n🔄 Хотите сбросить webhook? (y/n)', colors.cyan);
  
  // Автоматически сбрасываем webhook для исправления проблем
  log('🔄 Автоматический сброс webhook...', colors.yellow);
  await resetWebhook();
  
  log('\n📱 ИНСТРУКЦИИ ДЛЯ ТЕСТИРОВАНИЯ:', colors.cyan);
  log('1. Найдите бота @UniFarming_Bot в Telegram', colors.blue);
  log('2. Отправьте команду /start', colors.blue);
  log('3. Если вы админ (@a888bnd), должны увидеть кнопку "Админ-панель"', colors.blue);
  log('4. Попробуйте команду /adminka для прямого доступа', colors.blue);
  log('5. Если не работает - сообщите, что видите', colors.blue);
}

main().catch(error => {
  log(`💥 Ошибка: ${error.message}`, colors.red);
  process.exit(1);
});