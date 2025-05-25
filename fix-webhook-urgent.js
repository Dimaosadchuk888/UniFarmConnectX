/**
 * Срочное исправление webhook для восстановления работы Telegram бота
 */

import fetch from 'node-fetch';

async function fixWebhookUrgent() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const correctWebhookUrl = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app/api/telegram/webhook';
  
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN не найден');
    return;
  }
  
  console.log('🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ WEBHOOK...');
  console.log('📍 Устанавливаем правильный URL:', correctWebhookUrl);
  
  try {
    // Устанавливаем правильный webhook
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: correctWebhookUrl
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook успешно исправлен!');
      console.log('📋 Результат:', JSON.stringify(result, null, 2));
      
      // Проверяем исправленный webhook
      console.log('\n🔍 Проверяем исправленный webhook...');
      const checkResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const checkResult = await checkResponse.json();
      
      if (checkResult.ok) {
        console.log('📊 Информация о webhook:');
        console.log('   URL:', checkResult.result.url);
        console.log('   Ожидающих обновлений:', checkResult.result.pending_update_count);
        console.log('   Последняя ошибка:', checkResult.result.last_error_message || 'Нет ошибок');
      }
      
    } else {
      console.error('❌ Ошибка при установке webhook:', result);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении запроса:', error);
  }
}

fixWebhookUrgent();