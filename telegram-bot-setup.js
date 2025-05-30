/**
 * Telegram Bot Configuration Script
 * Sets up the mini app URL and webhook for your bot
 */

import fetch from 'node-fetch';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения');
  process.exit(1);
}

async function callTelegramAPI(method, data = {}) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

async function setupTelegramBot() {
  console.log('🤖 Настройка Telegram бота...');
  
  try {
    // Получаем информацию о боте
    const botInfo = await callTelegramAPI('getMe');
    if (botInfo.ok) {
      console.log(`✅ Бот найден: @${botInfo.result.username}`);
    } else {
      console.error('❌ Ошибка получения информации о боте:', botInfo.description);
      return;
    }

    // Устанавливаем webhook
    const webhookUrl = `${APP_URL}/api/telegram/webhook`;
    const webhookResult = await callTelegramAPI('setWebhook', {
      url: webhookUrl,
      drop_pending_updates: true
    });
    
    if (webhookResult.ok) {
      console.log(`✅ Webhook установлен: ${webhookUrl}`);
    } else {
      console.error('❌ Ошибка установки webhook:', webhookResult.description);
    }

    // Устанавливаем кнопку меню
    const menuResult = await callTelegramAPI('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: 'Открыть UniFarm',
        web_app: { url: APP_URL }
      }
    });
    
    if (menuResult.ok) {
      console.log(`✅ Кнопка меню установлена: ${APP_URL}`);
    } else {
      console.error('❌ Ошибка установки кнопки меню:', menuResult.description);
    }

    // Устанавливаем команды бота
    const commands = [
      { command: 'start', description: 'Запустить UniFarm Mini App' },
      { command: 'farm', description: 'Открыть фарминг' },
      { command: 'balance', description: 'Проверить баланс' }
    ];

    const commandsResult = await callTelegramAPI('setMyCommands', { commands });
    if (commandsResult.ok) {
      console.log('✅ Команды бота установлены');
    } else {
      console.error('❌ Ошибка установки команд:', commandsResult.description);
    }

    console.log('\n🎉 Настройка Telegram бота завершена!');
    console.log(`🔗 Ваш Mini App доступен по адресу: ${APP_URL}`);
    
  } catch (error) {
    console.error('❌ Ошибка настройки бота:', error.message);
  }
}

// Запускаем настройку
setupTelegramBot();