/**
 * Скрипт для исправления webhook URL
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app/api/telegram/webhook';

async function fixWebhook() {
  try {
    console.log('🔧 Исправление webhook URL...');
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        drop_pending_updates: true
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook успешно обновлен!');
      console.log(`🔗 Новый URL: ${WEBHOOK_URL}`);
      console.log('📱 Теперь попробуйте команду /start в боте');
    } else {
      console.log('❌ Ошибка обновления webhook:', result.description);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

fixWebhook();