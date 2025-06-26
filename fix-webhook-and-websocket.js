#!/usr/bin/env node

/**
 * Исправление webhook и WebSocket проблем
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = 'https://uni-farm-connect-x-alinabndrnk99.replit.app/webhook';

async function setWebhook() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ['message', 'callback_query']
      })
    });
    
    const result = await response.json();
    console.log('Webhook установлен:', result);
    return result.ok;
  } catch (error) {
    console.error('Ошибка установки webhook:', error);
    return false;
  }
}

async function checkWebhook() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const result = await response.json();
    console.log('Статус webhook:', result);
    return result;
  } catch (error) {
    console.error('Ошибка проверки webhook:', error);
    return null;
  }
}

async function main() {
  console.log('🔧 Исправление webhook и WebSocket...');
  
  console.log('\n1. Проверка текущего webhook:');
  await checkWebhook();
  
  console.log('\n2. Установка webhook:');
  const success = await setWebhook();
  
  if (success) {
    console.log('\n3. Проверка после установки:');
    await checkWebhook();
    console.log('\n✅ Webhook успешно установлен');
  } else {
    console.log('\n❌ Ошибка установки webhook');
  }
}

main();