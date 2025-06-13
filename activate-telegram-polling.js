/**
 * Telegram Polling Activator
 * Активирует polling режим для обхода блокировки webhook
 */

import fetch from 'node-fetch';

const BOT_TOKEN = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const LOCAL_WEBHOOK = 'http://localhost:3000/webhook';

let offset = 0;
let isPolling = false;

async function deleteWebhook() {
  try {
    const response = await fetch(`${TELEGRAM_API}/deleteWebhook`);
    const data = await response.json();
    console.log('[Polling] Webhook удален:', data.description);
    return data.ok;
  } catch (error) {
    console.error('[Polling] Ошибка удаления webhook:', error.message);
    return false;
  }
}

async function processUpdate(update) {
  try {
    const response = await fetch(LOCAL_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`[Polling] Обработано обновление ${update.update_id}:`, {
        status: result.status,
        message: update.message?.text || 'No message'
      });
    }
  } catch (error) {
    console.error(`[Polling] Ошибка обработки ${update.update_id}:`, error.message);
  }
}

async function pollUpdates() {
  if (!isPolling) return;

  try {
    const response = await fetch(`${TELEGRAM_API}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset: offset,
        timeout: 10,
        allowed_updates: ['message', 'callback_query']
      })
    });

    const data = await response.json();
    
    if (data.ok && data.result.length > 0) {
      console.log(`[Polling] Получено ${data.result.length} обновлений`);
      
      for (const update of data.result) {
        await processUpdate(update);
        offset = update.update_id + 1;
      }
    }
  } catch (error) {
    console.error('[Polling] Ошибка получения обновлений:', error.message);
  }

  // Продолжаем polling
  setTimeout(pollUpdates, 3000);
}

async function startPolling() {
  console.log('[Polling] Запуск Telegram polling service...');
  
  // Удаляем webhook
  const webhookDeleted = await deleteWebhook();
  if (!webhookDeleted) {
    console.error('[Polling] Не удалось удалить webhook');
    return false;
  }

  // Запускаем polling
  isPolling = true;
  pollUpdates();
  
  console.log('[Polling] Polling активен - бот готов принимать сообщения');
  return true;
}

function stopPolling() {
  isPolling = false;
  console.log('[Polling] Polling остановлен');
}

// Автозапуск
startPolling();

// Graceful shutdown
process.on('SIGTERM', stopPolling);
process.on('SIGINT', stopPolling);

export { startPolling, stopPolling };