/**
 * Скрипт для правильного налаштування Telegram Mini App URL
 */

import fetch from 'node-fetch';

async function fixTelegramMiniApp() {
  console.log('🚀 Виправлення Telegram Mini App URL...');
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN не знайдено!');
    return;
  }

  // Спочатку отримаємо інформацію про поточні налаштування
  console.log('📋 Поточні налаштування бота:');
  
  const currentSettings = await fetch(`https://api.telegram.org/bot${botToken}/getChatMenuButton`);
  const currentResult = await currentSettings.json();
  
  if (currentResult.ok) {
    console.log('📱 Поточний Menu Button:', JSON.stringify(currentResult.result, null, 2));
  }

  // Налаштуємо Menu Button для відкриття через t.me посилання
  console.log('\n🔧 Налаштування нового Menu Button...');
  
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      menu_button: {
        type: 'web_app',
        text: 'Открыть приложение',
        web_app: {
          url: 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app'
        }
      }
    })
  });
  
  const result = await response.json();
  
  if (result.ok) {
    console.log('✅ Menu Button успішно оновлено!');
    console.log('📱 Новий текст: "Открыть приложение"');
    console.log('🔗 URL для Mini App: https://uni-farm-connect-x-lukyanenkolawfa.replit.app');
    
    // Перевіримо нові налаштування
    const verifyResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChatMenuButton`);
    const verifyResult = await verifyResponse.json();
    
    if (verifyResult.ok) {
      console.log('\n✅ Перевірка нових налаштувань:');
      console.log('📋 Оновлений Menu Button:', JSON.stringify(verifyResult.result, null, 2));
    }
  } else {
    console.error('❌ Помилка налаштування Menu Button:', result.description);
  }
  
  console.log('\n🎉 Налаштування завершено!');
  console.log('📲 Користувачі можуть відкрити UniFarm через:');
  console.log('   • Menu Button "Открыть приложение" в профілі бота');
  console.log('   • Пряме посилання: https://t.me/UniFarming_Bot/UniFarm');
}

fixTelegramMiniApp().catch(console.error);