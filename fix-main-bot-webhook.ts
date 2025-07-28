#!/usr/bin/env tsx

/**
 * ИСПРАВЛЕНИЕ WEBHOOK ГЛАВНОГО БОТА
 * Устанавливает правильный URL для @UniFarming_Bot
 */

import { config } from 'dotenv';

config();

async function fixMainBotWebhook() {
  const mainBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const baseUrl = process.env.APP_DOMAIN || 'https://uni-farm-connect-unifarm01010101.replit.app';
  
  if (!mainBotToken) {
    console.log('❌ TELEGRAM_BOT_TOKEN не найден');
    return;
  }

  const correctWebhookUrl = `${baseUrl}/api/v2/telegram/webhook`;
  
  console.log('🔧 Исправляем webhook для главного бота...');
  console.log(`Устанавливаем: ${correctWebhookUrl}`);

  try {
    const response = await fetch(`https://api.telegram.org/bot${mainBotToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: correctWebhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook главного бота исправлен успешно');
      
      // Проверяем результат
      const checkResponse = await fetch(`https://api.telegram.org/bot${mainBotToken}/getWebhookInfo`);
      const checkResult = await checkResponse.json();
      
      if (checkResult.ok) {
        console.log('📊 Текущие настройки webhook:');
        console.log(`   URL: ${checkResult.result.url}`);
        console.log(`   Pending updates: ${checkResult.result.pending_update_count}`);
        console.log(`   Last error: ${checkResult.result.last_error_message || 'Нет ошибок'}`);
      }
    } else {
      console.log('❌ Ошибка установки webhook:', result.description);
    }
  } catch (error) {
    console.log('❌ Критическая ошибка:', error instanceof Error ? error.message : String(error));
  }
}

fixMainBotWebhook();