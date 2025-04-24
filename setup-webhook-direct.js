/**
 * Скрипт для прямой настройки webhook с использованием прямого URL
 */

import fetch from 'node-fetch';

// Токен бота и URL webhook
const BOT_TOKEN = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';
const WEBHOOK_URL = 'https://uni-farm-connect-2-misterxuniverse.replit.app/api/telegram/webhook';

async function setWebhook() {
  console.log(`🔄 Настройка webhook для URL: ${WEBHOOK_URL}`);
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        drop_pending_updates: true,
        allowed_updates: ['message']
      })
    });

    const result = await response.json();
    
    if (!result || !result.ok) {
      console.error('❌ Не удалось установить webhook:', result?.description || 'Неизвестная ошибка');
      return false;
    }
    
    console.log('✅ Webhook успешно установлен!');
    console.log('Результат:', JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при установке webhook:`, error.message);
    return false;
  }
}

async function getWebhookInfo() {
  console.log('🔍 Получение информации о текущем webhook...');
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const result = await response.json();
    
    if (!result || !result.ok) {
      console.error('❌ Не удалось получить информацию о webhook:', result?.description || 'Неизвестная ошибка');
      return null;
    }
    
    console.log('ℹ️ Информация о webhook:');
    console.log(JSON.stringify(result.result, null, 2));
    return result.result;
  } catch (error) {
    console.error(`❌ Ошибка при получении информации о webhook:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🤖 Начало настройки Telegram webhook...');
  
  // Сначала проверим текущий webhook
  const webhookInfo = await getWebhookInfo();
  
  // Устанавливаем новый webhook
  await setWebhook();
  
  // Проверяем результат установки
  const newWebhookInfo = await getWebhookInfo();
  
  if (newWebhookInfo && newWebhookInfo.url === WEBHOOK_URL) {
    console.log('🎉 Webhook успешно настроен и проверен!');
  } else {
    console.error('❌ Что-то пошло не так при настройке webhook');
  }
}

// Запускаем основную функцию
main().catch(error => {
  console.error('❌ Непредвиденная ошибка:', error);
});