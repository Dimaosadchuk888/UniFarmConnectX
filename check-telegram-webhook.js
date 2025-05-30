/**
 * Скрипт для проверки и установки Telegram webhook на правильный продакшн URL
 */

import fetch from 'node-fetch';

// Продакшн URL для webhook
const PRODUCTION_URL = 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app';
const WEBHOOK_URL = `${PRODUCTION_URL}/api/telegram/webhook`;

/**
 * Проверяет текущий webhook
 */
async function checkWebhook() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.log('❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения');
      return null;
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('🔍 Текущий webhook:', result.result.url || 'НЕ УСТАНОВЛЕН');
      console.log('📊 Статус webhook:', {
        url: result.result.url,
        has_custom_certificate: result.result.has_custom_certificate,
        pending_update_count: result.result.pending_update_count,
        last_error_date: result.result.last_error_date,
        last_error_message: result.result.last_error_message
      });
      return result.result;
    } else {
      console.log('❌ Ошибка проверки webhook:', result.description);
      return null;
    }
  } catch (error) {
    console.error('❌ Исключение при проверке webhook:', error.message);
    return null;
  }
}

/**
 * Устанавливает webhook на продакшн URL
 */
async function setWebhook() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.log('❌ TELEGRAM_BOT_TOKEN не найден');
      return false;
    }

    console.log(`🚀 Устанавливаем webhook на: ${WEBHOOK_URL}`);
    
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        drop_pending_updates: true
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook успешно установлен!');
      return true;
    } else {
      console.log('❌ Ошибка установки webhook:', result.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Исключение при установке webhook:', error.message);
    return false;
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('🎯 ПРОВЕРКА И УСТАНОВКА TELEGRAM WEBHOOK');
  console.log(`📍 Продакшн URL: ${PRODUCTION_URL}`);
  console.log(`🔗 Webhook URL: ${WEBHOOK_URL}`);
  
  // Проверяем текущий webhook
  const currentWebhook = await checkWebhook();
  
  if (currentWebhook && currentWebhook.url === WEBHOOK_URL) {
    console.log('✅ Webhook уже настроен правильно на продакшн URL!');
  } else {
    console.log('🔧 Webhook требует обновления...');
    
    // Устанавливаем правильный webhook
    const success = await setWebhook();
    
    if (success) {
      console.log('🎉 Webhook успешно обновлен на продакшн URL!');
      
      // Повторная проверка
      await new Promise(resolve => setTimeout(resolve, 2000));
      await checkWebhook();
    }
  }
  
  console.log('🎯 ПРОВЕРКА ЗАВЕРШЕНА');
}

// Запускаем проверку
main().catch(console.error);

export { main };