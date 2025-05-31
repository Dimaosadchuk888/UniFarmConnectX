/**
 * Скрипт для настройки webhook Telegram бота
 * 
 * Запуск: node setup-webhook.js
 */

const fetch = require('node-fetch');

// Токен Telegram бота из переменных окружения
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Получаем URL приложения из переменных окружения или аргументов командной строки
let appUrl = process.argv[2] || process.env.REPLIT_APP_URL;

// Проверка обязательных параметров
if (!BOT_TOKEN) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в переменных окружения');
  process.exit(1);
}

if (!appUrl) {
  console.error('❌ Ошибка: URL приложения не указан');
  console.log('Использование: node setup-webhook.js <URL приложения>');
  console.log('Пример: node setup-webhook.js https://your-app.replit.app');
  process.exit(1);
}

// Удаляем слеш в конце URL, если он есть
if (appUrl.endsWith('/')) {
  appUrl = appUrl.slice(0, -1);
}

const webhookUrl = `${appUrl}/api/telegram/webhook`;

// Функция для отправки запроса в Telegram API
async function callTelegramApi(method, data = {}) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`❌ Ошибка при вызове ${method}:`, error.message);
    return null;
  }
}

// Функция для получения информации о текущем webhook
async function getWebhookInfo() {
  const result = await callTelegramApi('getWebhookInfo');
  if (!result || !result.ok) {
    console.error('❌ Не удалось получить информацию о webhook:', result?.description || 'Неизвестная ошибка');
    return null;
  }
  return result.result;
}

// Функция для установки webhook
async function setWebhook() {
  console.log(`🔄 Настройка webhook для URL: ${webhookUrl}`);
  
  const result = await callTelegramApi('setWebhook', {
    url: webhookUrl,
    drop_pending_updates: true,
    allowed_updates: ['message']
  });
  
  if (!result || !result.ok) {
    console.error('❌ Не удалось установить webhook:', result?.description || 'Неизвестная ошибка');
    return false;
  }
  
  console.log('✅ Webhook успешно установлен!');
  return true;
}

// Основная функция
async function main() {
  console.log('🤖 Начало настройки Telegram webhook...');
  
  // Получаем текущую информацию о webhook
  console.log('🔍 Получение текущей информации о webhook...');
  const webhookInfo = await getWebhookInfo();
  
  if (webhookInfo) {
    console.log('ℹ️ Текущий webhook:');
    console.log(`   URL: ${webhookInfo.url || 'Не установлен'}`);
    console.log(`   Ожидающие обновления: ${webhookInfo.pending_update_count}`);
    
    if (webhookInfo.url === webhookUrl) {
      console.log('✅ Webhook уже настроен на правильный URL');
      return;
    }
  }
  
  // Устанавливаем новый webhook
  await setWebhook();
  
  // Проверяем успешность установки
  const newWebhookInfo = await getWebhookInfo();
  if (newWebhookInfo && newWebhookInfo.url === webhookUrl) {
    console.log('🎉 Webhook успешно настроен и проверен!');
  } else {
    console.error('❌ Что-то пошло не так при проверке webhook');
  }
}

// Запускаем основную функцию
main().catch(error => {
  console.error('❌ Непредвиденная ошибка:', error);
  process.exit(1);
});