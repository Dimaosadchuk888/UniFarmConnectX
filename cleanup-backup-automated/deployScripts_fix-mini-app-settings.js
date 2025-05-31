/**
 * Скрипт для налаштування правильного Mini App URL для UniFarm бота
 */

import fetch from 'node-fetch';

async function fixMiniAppSettings() {
  console.log('🚀 Налаштування Mini App для UniFarm бота...');
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN не знайдено!');
    return;
  }
  
  // Налаштовуємо правильний Menu Button
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
          url: 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app'
        }
      }
    })
  });
  
  const result = await response.json();
  
  if (result.ok) {
    console.log('✅ Menu Button успішно оновлено!');
    console.log('📱 Текст: "Открыть приложение"');
    console.log('🔗 URL: https://uni-farm-connect-xo-osadchukdmitro2.replit.app');
  } else {
    console.error('❌ Помилка налаштування Menu Button:', result.description);
  }
  
  console.log('\n🎉 Налаштування завершено!');
  console.log('📲 Тепер користувачі можуть відкрити UniFarm через:');
  console.log('   • Menu Button в профілі бота');
  console.log('   • Посилання https://t.me/UniFarming_Bot/UniFarm');
}

fixMiniAppSettings().catch(console.error);