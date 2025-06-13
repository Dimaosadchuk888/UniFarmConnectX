/**
 * Комплексный тест всех альтернативных webhook путей
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://uni-farm-connect-x-osadchukdmitro2.replit.app';
const WEBHOOK_PATHS = [
  '/webhook',
  '/api/webhook', 
  '/bot/webhook',
  '/telegram/webhook',
  '/api/v2/telegram/webhook'
];

const testUpdate = {
  update_id: 123456789,
  message: {
    message_id: 1,
    from: { id: 123456789, first_name: "Test" },
    chat: { id: 123456789 },
    text: "/start"
  }
};

async function testWebhookPath(path) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TelegramBot'
      },
      body: JSON.stringify(testUpdate)
    });

    const result = await response.text();
    return {
      path,
      status: response.status,
      success: response.status === 200,
      response: result.substring(0, 100)
    };
  } catch (error) {
    return {
      path,
      status: 'ERROR',
      success: false,
      error: error.message
    };
  }
}

async function testAllPaths() {
  console.log('🧪 Тестирую все альтернативные webhook пути...');
  
  const results = [];
  for (const path of WEBHOOK_PATHS) {
    console.log(`📍 Тестирую: ${path}`);
    const result = await testWebhookPath(path);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${path} - РАБОТАЕТ`);
    } else {
      console.log(`❌ ${path} - ${result.status}`);
    }
  }
  
  console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:');
  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Работающие пути: ${working.length}`);
  working.forEach(r => console.log(`  - ${r.path}`));
  
  console.log(`❌ Нерабочие пути: ${failed.length}`);
  failed.forEach(r => console.log(`  - ${r.path} (${r.status})`));
  
  if (working.length > 0) {
    console.log(`\n🎯 РЕКОМЕНДАЦИЯ: Использовать ${working[0].path} для Telegram webhook`);
    return working[0].path;
  } else {
    console.log('\n🔧 Требуется альтернативное решение - все пути заблокированы');
    return null;
  }
}

testAllPaths();