/**
 * Скрипт для настройки webhook Telegram бота на правильный путь
 */
import fetch from 'node-fetch';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN environment variable is not set');
  process.exit(1);
}
const WEBHOOK_URL = 'https://uni-farm-connect-2-misterxuniverse.replit.app/api/telegram/webhook';

async function callTelegramApi(method, data = {}) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const formData = new URLSearchParams();
  
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  
  return await response.json();
}

async function setWebhook() {
  console.log(`Настройка webhook на URL: ${WEBHOOK_URL}`);
  const result = await callTelegramApi('setWebhook', { url: WEBHOOK_URL });
  console.log('Результат настройки webhook:', result);
  return result;
}

async function getWebhookInfo() {
  console.log('Получение информации о webhook...');
  const result = await callTelegramApi('getWebhookInfo');
  console.log('Информация о webhook:', result);
  return result;
}

async function main() {
  try {
    await setWebhook();
    await getWebhookInfo();
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

main();