/**
 * Скрипт для настройки webhook Telegram бота
 * - Удаляет старый webhook
 * - Настраивает новый webhook с правильными параметрами
 * - Проверяет корректность настроек
 * - Поддерживает как production, так и development окружения
 */

const fetch = require('node-fetch');

// Константы
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Для production используется URL Replit проекта
// Для локальной разработки можно использовать ngrok или другие туннели
const isProd = process.env.NODE_ENV === 'production';
const BASE_URL = isProd 
  ? 'https://uni-farm-connect-2-misterxuniverse.replit.app'
  : process.env.WEBHOOK_URL || 'https://your-local-tunnel-url.ngrok.io';

// Путь к API обработки webhook
const WEBHOOK_PATH = '/api/telegram/webhook';
const WEBHOOK_URL = `${BASE_URL}${WEBHOOK_PATH}`;

// Вывод параметров для отладки
console.log('🔧 Настройка webhook для Telegram бота');
console.log(`📌 Окружение: ${isProd ? 'Production' : 'Development'}`);
console.log(`📌 Базовый URL: ${BASE_URL}`);
console.log(`📌 URL webhook: ${WEBHOOK_URL}`);

// Проверка наличия токена
if (!BOT_TOKEN) {
  console.error('❌ Ошибка: Переменная окружения TELEGRAM_BOT_TOKEN не определена');
  process.exit(1);
}

// Вспомогательная функция для вызова Telegram API
async function callTelegramApi(method, data = {}) {
  try {
    const response = await fetch(`${API_URL}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return await response.json();
  } catch (error) {
    console.error(`❌ Ошибка при вызове метода ${method}:`, error.message);
    return null;
  }
}

// Получение информации о боте
async function getBotInfo() {
  console.log('🔍 Получение информации о боте...');
  const result = await callTelegramApi('getMe');
  
  if (!result || !result.ok) {
    console.error('❌ Ошибка получения информации о боте:', result?.description || 'Неизвестная ошибка');
    process.exit(1);
  }
  
  console.log(`✅ Бот @${result.result.username} (ID: ${result.result.id}) найден`);
  return result.result;
}

// Удаление старого webhook
async function deleteWebhook() {
  console.log('🗑️ Удаление старого webhook...');
  const result = await callTelegramApi('deleteWebhook', { drop_pending_updates: true });
  
  if (!result || !result.ok) {
    console.error('❌ Ошибка удаления webhook:', result?.description || 'Неизвестная ошибка');
    return false;
  }
  
  console.log('✅ Старый webhook успешно удален');
  return true;
}

// Настройка нового webhook
async function setWebhook() {
  console.log(`🔗 Настройка нового webhook на URL: ${WEBHOOK_URL}`);
  
  const result = await callTelegramApi('setWebhook', {
    url: WEBHOOK_URL,
    allowed_updates: ['message', 'callback_query', 'inline_query', 'my_chat_member'],
    drop_pending_updates: true,
    max_connections: 40
  });
  
  if (!result || !result.ok) {
    console.error('❌ Ошибка установки webhook:', result?.description || 'Неизвестная ошибка');
    return false;
  }
  
  console.log('✅ Новый webhook успешно установлен');
  return true;
}

// Получение и проверка информации о webhook
async function getWebhookInfo() {
  console.log('🔍 Проверка настроек webhook...');
  const result = await callTelegramApi('getWebhookInfo');
  
  if (!result || !result.ok) {
    console.error('❌ Ошибка получения информации о webhook:', result?.description || 'Неизвестная ошибка');
    return null;
  }
  
  console.log('📊 Информация о webhook:');
  console.log(JSON.stringify(result.result, null, 2));
  
  // Проверяем, правильно ли установлен webhook
  if (result.result.url === WEBHOOK_URL) {
    console.log('✅ Webhook корректно настроен на указанный URL');
  } else if (result.result.url) {
    console.warn(`⚠️ Webhook настроен на другой URL: ${result.result.url}`);
  } else {
    console.warn('⚠️ Webhook не настроен');
  }
  
  return result.result;
}

// Основная функция настройки
async function main() {
  try {
    // Получаем информацию о боте
    const botInfo = await getBotInfo();
    
    // Получаем текущие настройки webhook для сравнения
    const oldWebhookInfo = await getWebhookInfo();
    
    // Удаляем старый webhook
    await deleteWebhook();
    
    // Устанавливаем новый webhook
    const success = await setWebhook();
    
    if (success) {
      // Проверяем новые настройки webhook
      const newWebhookInfo = await getWebhookInfo();
      
      console.log(`\n✅ Настройка webhook для @${botInfo.username} завершена успешно!`);
      
      if (newWebhookInfo && newWebhookInfo.pending_update_count > 0) {
        console.log(`⚠️ Внимание: В очереди ${newWebhookInfo.pending_update_count} необработанных обновлений`);
      }
    } else {
      console.error('❌ Настройка webhook не завершена из-за ошибок');
    }
  } catch (error) {
    console.error('❌ Произошла ошибка при настройке webhook:', error.message);
  }
}

// Запускаем основную функцию
main();