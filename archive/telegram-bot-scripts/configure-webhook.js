/**
 * Простой скрипт для настройки webhook бота
 */

const https = require('https');

// Получаем токен из переменной окружения
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в переменных окружения');
  process.exit(1);
}

// URL для установки webhook (из аргументов командной строки)
const args = process.argv.slice(2);
const WEBHOOK_URL = args[0];

if (!WEBHOOK_URL) {
  console.error('❌ Ошибка: URL для webhook не указан');
  console.error('Используйте: node configure-webhook.js https://your-domain.com/api/telegram/webhook');
  process.exit(1);
}

console.log(`🔄 Настройка webhook для бота на URL: ${WEBHOOK_URL}`);

// Формируем URL запроса к Telegram API
const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}&drop_pending_updates=true&allowed_updates=["message","callback_query"]`;

// Отправляем запрос
https.get(apiUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.ok) {
        console.log('✅ Webhook успешно настроен');
        console.log(`URL: ${WEBHOOK_URL}`);
      } else {
        console.error('❌ Ошибка настройки webhook:', response.description);
      }
    } catch (error) {
      console.error('❌ Ошибка при обработке ответа:', error.message);
    }
  });
}).on('error', (err) => {
  console.error('❌ Ошибка запроса к Telegram API:', err.message);
});

// Получение информации о боте
const botInfoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`;

https.get(botInfoUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.ok) {
        const botInfo = response.result;
        console.log(`
====================================
🤖 Бот: ${botInfo.first_name} (@${botInfo.username})
ID: ${botInfo.id}
====================================
        `);
      } else {
        console.error('❌ Ошибка получения информации о боте:', response.description);
      }
    } catch (error) {
      console.error('❌ Ошибка при обработке информации о боте:', error.message);
    }
  });
}).on('error', (err) => {
  console.error('❌ Ошибка запроса информации о боте:', err.message);
});