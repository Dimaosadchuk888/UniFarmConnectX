/**
 * Окончательное исправление webhook URL
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CORRECT_WEBHOOK_URL = 'https://uni-farm-connect-xo-osadchukdmitro2.replit.app/api/telegram/webhook';

async function fixWebhookFinal() {
  try {
    console.log('🔧 Исправление webhook на правильный URL...');
    console.log(`🎯 Устанавливаем: ${CORRECT_WEBHOOK_URL}`);
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: CORRECT_WEBHOOK_URL,
        drop_pending_updates: true,
        allowed_updates: ["message", "callback_query"]
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook успешно исправлен!');
      console.log(`🔗 Новый URL: ${CORRECT_WEBHOOK_URL}`);
      
      // Проверяем установку
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const checkResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
      const checkResult = await checkResponse.json();
      
      if (checkResult.ok) {
        console.log(`📡 Подтвержденный URL: ${checkResult.result.url}`);
        console.log(`📊 Pending updates: ${checkResult.result.pending_update_count}`);
        console.log('🎉 Теперь команда /start должна работать!');
      }
      
    } else {
      console.log('❌ Ошибка установки webhook:', result.description);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

fixWebhookFinal();