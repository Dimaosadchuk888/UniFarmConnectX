/**
 * Отладка webhook маршрутизации
 * Проверяет различные уровни доступности
 */

import fetch from 'node-fetch';

async function debugWebhookRouting() {
  console.log('🔍 Отладка маршрутизации webhook...');
  
  const tests = [
    { url: 'http://localhost:3000/webhook', name: 'Локальный сервер' },
    { url: 'https://uni-farm-connect-x-osadchukdmitro2.replit.app/webhook', name: 'Внешний домен' },
    { url: 'https://uni-farm-connect-x-osadchukdmitro2.replit.app/health', name: 'Health check' },
    { url: 'https://uni-farm-connect-x-osadchukdmitro2.replit.app/api/v2/health', name: 'API Health' }
  ];

  const testData = {
    update_id: 123456789,
    message: {
      message_id: 1,
      from: { id: 123456789, first_name: "Test" },
      chat: { id: 123456789, type: "private" },
      text: "/start"
    }
  };

  for (const test of tests) {
    try {
      const method = test.url.includes('health') ? 'GET' : 'POST';
      const body = method === 'POST' ? JSON.stringify(testData) : undefined;
      
      const response = await fetch(test.url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TelegramBot'
        },
        body,
        timeout: 5000
      });

      const result = await response.text();
      console.log(`${test.name}: ${response.status} - ${result.substring(0, 100)}`);
      
      if (response.status === 200 && test.url.includes('webhook')) {
        console.log('✅ РАБОЧИЙ WEBHOOK НАЙДЕН:', test.url);
        return test.url;
      }
    } catch (error) {
      console.log(`${test.name}: ОШИБКА - ${error.message}`);
    }
  }
  
  return null;
}

debugWebhookRouting().then(workingUrl => {
  if (workingUrl) {
    console.log('\n🎯 Используйте этот URL для Telegram webhook:', workingUrl);
  } else {
    console.log('\n❌ Webhook недоступен через внешний домен');
    console.log('🔧 Проблема с конфигурацией прокси Replit');
  }
});