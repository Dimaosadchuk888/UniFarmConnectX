/**
 * Тест простого webhook эндпоинта
 * Проверяет работоспособность корневого webhook
 */

import fetch from 'node-fetch';

const WEBHOOK_URL = 'https://uni-farm-connect-x-osadchukdmitro2.replit.app/webhook';

const testUpdate = {
  update_id: 123456789,
  message: {
    message_id: 1,
    from: {
      id: 123456789,
      is_bot: false,
      first_name: "Test",
      username: "testuser"
    },
    chat: {
      id: 123456789,
      type: "private"
    },
    date: Math.floor(Date.now() / 1000),
    text: "/start"
  }
};

async function testWebhook() {
  console.log('🧪 Тестирую корневой webhook...');
  console.log(`📍 URL: ${WEBHOOK_URL}`);
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TelegramBot'
      },
      body: JSON.stringify(testUpdate)
    });

    const result = await response.text();
    console.log(`📌 Статус: ${response.status}`);
    console.log('📄 Ответ:', result);

    if (response.status === 200) {
      console.log('✅ Webhook работает корректно!');
      return true;
    } else {
      console.log('❌ Webhook не работает правильно');
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка при тестировании webhook:', error.message);
    return false;
  }
}

testWebhook().then(success => {
  if (success) {
    console.log('🎯 Webhook готов для Telegram');
  } else {
    console.log('🔧 Требуется дополнительная настройка');
  }
});