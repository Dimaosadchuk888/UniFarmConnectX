/**
 * Внутренний тест webhook эндпоинта
 * Тестирует напрямую через внутренний API
 */

import fetch from 'node-fetch';

const INTERNAL_URL = 'http://localhost:3000/webhook';
const EXTERNAL_URL = 'https://uni-farm-connect-x-osadchukdmitro2.replit.app/webhook';

// Тестовое обновление от Telegram
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

async function testInternalWebhook() {
  console.log('🔍 Тестирую внутренний webhook...');
  
  try {
    const response = await fetch(INTERNAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TelegramBot'
      },
      body: JSON.stringify(testUpdate)
    });

    const result = await response.text();
    console.log(`📌 Внутренний статус: ${response.status}`);
    console.log('📄 Внутренний ответ:', result);

    if (response.status === 200) {
      console.log('✅ Внутренний webhook работает!');
    }
  } catch (error) {
    console.log('❌ Внутренний webhook недоступен:', error.message);
  }
}

async function testExternalWebhook() {
  console.log('🌐 Тестирую внешний webhook...');
  
  try {
    const response = await fetch(EXTERNAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TelegramBot'
      },
      body: JSON.stringify(testUpdate)
    });

    const result = await response.text();
    console.log(`📌 Внешний статус: ${response.status}`);
    console.log('📄 Внешний ответ:', result);

    if (response.status === 200) {
      console.log('✅ Внешний webhook работает!');
    }
  } catch (error) {
    console.log('❌ Внешний webhook недоступен:', error.message);
  }
}

async function testAllRoutes() {
  const routes = [
    'http://localhost:3000/webhook',
    'http://localhost:3000/api/webhook',
    'http://localhost:3000/api/v2/webhook'
  ];

  console.log('🔍 Проверяю все возможные пути...');
  
  for (const route of routes) {
    try {
      const response = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUpdate)
      });
      
      console.log(`📍 ${route}: ${response.status}`);
      
      if (response.status === 200) {
        const result = await response.json();
        console.log('✅ НАЙДЕН РАБОЧИЙ ПУТЬ:', route);
        console.log('📄 Ответ:', result);
        break;
      }
    } catch (error) {
      console.log(`❌ ${route}: недоступен`);
    }
  }
}

async function main() {
  console.log('🚀 Запуск диагностики webhook эндпоинта');
  console.log('─'.repeat(50));
  
  await testInternalWebhook();
  console.log('─'.repeat(30));
  
  await testExternalWebhook();
  console.log('─'.repeat(30));
  
  await testAllRoutes();
  console.log('─'.repeat(50));
  console.log('🏁 Диагностика завершена');
}

main().catch(console.error);