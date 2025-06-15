/**
 * Финальная настройка Telegram Bot для WebApp URL
 * Устанавливает корректный URL для Telegram Mini App
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function setupTelegramBotWebApp() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webAppUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  
  console.log('🤖 Настройка Telegram Bot для WebApp...\n');
  console.log(`Bot Token: ${botToken.substring(0, 20)}...`);
  console.log(`WebApp URL: ${webAppUrl}`);
  
  try {
    // Получение информации о боте
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botInfo = await botInfoResponse.json();
    
    if (botInfo.ok) {
      console.log(`✅ Bot подключен: @${botInfo.result.username}`);
    } else {
      console.error('❌ Ошибка получения информации о боте:', botInfo.description);
      return;
    }
    
    // Установка webhook
    const webhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${webAppUrl}/webhook`,
        allowed_updates: ["message", "callback_query"]
      })
    });
    
    const webhookResult = await webhookResponse.json();
    
    if (webhookResult.ok) {
      console.log('✅ Webhook установлен успешно');
    } else {
      console.error('❌ Ошибка установки webhook:', webhookResult.description);
    }
    
    // Проверка webhook
    const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const webhookInfo = await webhookInfoResponse.json();
    
    if (webhookInfo.ok) {
      console.log('\n📊 Статус webhook:');
      console.log(`URL: ${webhookInfo.result.url}`);
      console.log(`Pending updates: ${webhookInfo.result.pending_update_count}`);
      console.log(`Certificate: ${webhookInfo.result.has_custom_certificate ? 'есть' : 'нет'}`);
    }
    
    console.log('\n🎯 Для настройки WebApp в BotFather:');
    console.log(`1. Откройте @BotFather в Telegram`);
    console.log(`2. Выберите /mybots`);
    console.log(`3. Выберите вашего бота @${botInfo.result.username}`);
    console.log(`4. Выберите Bot Settings > Menu Button`);
    console.log(`5. Введите WebApp URL: ${webAppUrl}`);
    console.log(`6. Или используйте команду: /setmenubutton`);
    
  } catch (error) {
    console.error('💥 Ошибка настройки бота:', error.message);
  }
}

setupTelegramBotWebApp();