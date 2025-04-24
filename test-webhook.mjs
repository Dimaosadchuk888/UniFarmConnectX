/**
 * Скрипт для проверки работы webhook
 * 
 * Этот скрипт отправляет тестовое сообщение боту @UniFarming_Bot,
 * чтобы проверить, что webhook корректно обрабатывает сообщения и 
 * возвращает ответ.
 */

import fetch from 'node-fetch';

// Конфигурация
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Проверка наличия токена бота
if (!BOT_TOKEN) {
  console.error('\x1b[41m\x1b[1m ОШИБКА \x1b[0m Переменная окружения TELEGRAM_BOT_TOKEN не определена');
  process.exit(1);
}

// Вспомогательная функция для API запросов
async function callTelegramApi(method, data = {}) {
  try {
    console.log(`📤 Отправка запроса к методу ${method}`);
    console.log('   Данные:', JSON.stringify(data, null, 2));
    
    const response = await fetch(`${API_BASE}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    console.log(`📥 Получен ответ от ${method}:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('\x1b[31mОшибка при вызове API:\x1b[0m', error.message);
    return null;
  }
}

// Получение информации о боте
async function getBotInfo() {
  console.log('\n\x1b[1m\x1b[34m➤ Проверка бота\x1b[0m');
  const result = await callTelegramApi('getMe');
  
  if (!result || !result.ok) {
    console.error('\x1b[31m✖ Ошибка получения информации о боте:\x1b[0m', result?.description || 'Неизвестная ошибка');
    process.exit(1);
  }
  
  const botInfo = result.result;
  console.log(`\x1b[32m✓ Бот @${botInfo.username} (ID: ${botInfo.id}) найден\x1b[0m`);
  console.log(`\x1b[2m  Имя: ${botInfo.first_name}\x1b[0m`);
  
  return botInfo;
}

// Проверка настроек webhook
async function getWebhookInfo() {
  console.log('\n\x1b[1m\x1b[34m➤ Проверка настроек webhook\x1b[0m');
  const result = await callTelegramApi('getWebhookInfo');
  
  if (!result || !result.ok) {
    console.error('\x1b[31m✖ Ошибка получения информации о webhook:\x1b[0m', result?.description || 'Неизвестная ошибка');
    process.exit(1);
  }
  
  const webhookInfo = result.result;
  console.log('\x1b[32m✓ Информация о webhook получена\x1b[0m');
  console.log('\x1b[2m  URL:', webhookInfo.url || 'не установлен');
  console.log('  Ожидает обновлений:', webhookInfo.pending_update_count || 0);
  console.log('  Последняя ошибка:', webhookInfo.last_error_message || 'нет ошибок');
  console.log('  Макс. соединений:', webhookInfo.max_connections || 'не указано');
  console.log('  Разрешенные обновления:', webhookInfo.allowed_updates ? webhookInfo.allowed_updates.join(', ') : 'все');
  console.log('  IP-адрес:', webhookInfo.ip_address || 'не указан');
  console.log(`  Последний код ошибки: ${webhookInfo.last_error_date ? webhookInfo.last_error_date : 'нет'}\x1b[0m`);
  
  return webhookInfo;
}

// Отправка тестового сообщения
async function sendTestMessage(chatId, message) {
  console.log(`\n\x1b[1m\x1b[34m➤ Отправка тестового сообщения в чат ${chatId}\x1b[0m`);
  
  const data = {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML'
  };
  
  const result = await callTelegramApi('sendMessage', data);
  
  if (!result || !result.ok) {
    console.error('\x1b[31m✖ Ошибка отправки сообщения:\x1b[0m', result?.description || 'Неизвестная ошибка');
    return false;
  }
  
  console.log('\x1b[32m✓ Сообщение успешно отправлено\x1b[0m');
  return true;
}

// Основная функция
async function main() {
  try {
    console.log('\n\x1b[44m\x1b[1m ПРОВЕРКА РАБОТЫ WEBHOOK \x1b[0m\n');
    
    // Получаем информацию о боте
    const botInfo = await getBotInfo();
    
    // Проверяем настройки webhook
    const webhookInfo = await getWebhookInfo();
    
    if (!webhookInfo.url) {
      console.error('\x1b[31m✖ Webhook не настроен. Запустите скрипт setup-telegram-mini-app.mjs\x1b[0m');
      process.exit(1);
    }
    
    // Пользовательский ввод для ID чата
    const chatId = process.argv[2] || 1234567890; // Замените на свой Telegram ID
    
    if (!chatId) {
      console.error('\x1b[31m✖ ID чата не указан. Используйте: node test-webhook.mjs YOUR_CHAT_ID\x1b[0m');
      process.exit(1);
    }
    
    const testMessage = `
<b>📧 Тестовое сообщение</b>

Это тестовое сообщение отправлено для проверки работы webhook.
Если вы получили это сообщение, значит webhook работает корректно!

⏱ Время: ${new Date().toISOString()}
🤖 Бот: @${botInfo.username}
`;
    
    // Отправляем тестовое сообщение
    await sendTestMessage(chatId, testMessage);
    
    console.log('\n\x1b[42m\x1b[1m ПРОВЕРКА ЗАВЕРШЕНА \x1b[0m\n');
    console.log('\x1b[33mПримечание: Если вы не получили сообщение, проверьте следующее:\x1b[0m');
    console.log('1. Правильно ли указан ID чата');
    console.log('2. Запущен ли бот в чате (отправьте /start боту)');
    console.log('3. Проверьте настройки webhook и логи сервера');
    
  } catch (error) {
    console.error('\n\x1b[41m\x1b[1m ОШИБКА \x1b[0m', error.message);
    console.error(error.stack);
  }
}

// Запускаем основную функцию
main();