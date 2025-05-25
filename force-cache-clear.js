/**
 * Принудительное обновление Mini App URL для очистки кеша Telegram
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function forceCacheClear() {
  try {
    const timestamp = Date.now();
    const miniAppUrl = `https://uni-farm-connect-x-lukyanenkolawfa.replit.app?cache_bust=${timestamp}`;
    
    console.log('🔄 Принудительная очистка кеша Telegram Mini App...');
    console.log(`🎯 Новый URL с cache_bust: ${miniAppUrl}`);
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Открыть UniFarm',
          web_app: { url: miniAppUrl }
        }
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Mini App URL успешно обновлен с cache_bust!');
      console.log(`🔗 Активный URL: ${miniAppUrl}`);
      console.log('');
      console.log('📱 ИНСТРУКЦИЯ ДЛЯ ПОЛЬЗОВАТЕЛЯ:');
      console.log('1. Закройте Mini App полностью');
      console.log('2. Вернитесь в чат с ботом');
      console.log('3. Нажмите кнопку "Открыть UniFarm" снова');
      console.log('4. Telegram загрузит новую версию с правильными API endpoints');
      console.log('');
      console.log('🎉 После этого все должно работать правильно!');
    } else {
      console.log('❌ Ошибка обновления:', result.description);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

forceCacheClear();