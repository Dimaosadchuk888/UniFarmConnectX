/**
 * Полный тест всех возможных путей webhook для Telegram
 * Проверяет доступность через разные URL и префиксы
 */

import https from 'https';

const BASE_URL = 'https://uni-farm-connect-x-osadchukdmitro2.replit.app';
const WEBHOOK_PATHS = [
  '/webhook',
  '/api/webhook', 
  '/api/v2/webhook',
  '/api/telegram/webhook',
  '/api/v2/telegram/webhook',
  '/telegram/webhook'
];

const testUpdate = {
  update_id: 123456789,
  message: {
    message_id: 1,
    from: { id: 123456789, first_name: "Test", username: "testuser" },
    chat: { id: 123456789, type: "private" },
    date: Math.floor(Date.now() / 1000),
    text: "/start"
  }
};

function makeRequest(url, method = 'POST', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TelegramBot'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed, raw: responseData });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAllWebhookPaths() {
  console.log('🔍 Проверяю все возможные пути webhook...');
  console.log('─'.repeat(60));
  
  let workingPaths = [];
  
  for (const path of WEBHOOK_PATHS) {
    const fullUrl = BASE_URL + path;
    
    try {
      const response = await makeRequest(fullUrl, 'POST', testUpdate);
      
      console.log(`📍 ${path.padEnd(25)} → ${response.status}`);
      
      if (response.status === 200) {
        console.log(`✅ РАБОЧИЙ ПУТЬ НАЙДЕН: ${path}`);
        console.log(`📄 Ответ: ${response.raw}`);
        workingPaths.push(path);
        console.log('─'.repeat(40));
      } else if (response.status === 404) {
        console.log(`❌ Маршрут не найден`);
      } else if (response.status === 500) {
        console.log(`⚠️ Ошибка сервера: ${response.raw}`);
      } else {
        console.log(`⚠️ Статус ${response.status}: ${response.raw}`);
      }
      
    } catch (error) {
      console.log(`❌ Недоступен: ${error.message}`);
    }
    
    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('─'.repeat(60));
  
  if (workingPaths.length > 0) {
    console.log('✅ ИТОГО НАЙДЕНО РАБОЧИХ ПУТЕЙ:', workingPaths.length);
    workingPaths.forEach(path => console.log(`  • ${BASE_URL}${path}`));
    
    // Тестируем лучший путь с Telegram webhook
    const bestPath = workingPaths[0];
    console.log(`\n🎯 Устанавливаю webhook на лучший путь: ${bestPath}`);
    return BASE_URL + bestPath;
  } else {
    console.log('❌ НИ ОДИН ПУТЬ НЕ РАБОТАЕТ!');
    console.log('🔧 Проблема с маршрутизацией сервера');
    return null;
  }
}

async function main() {
  console.log('🚀 Полная диагностика webhook путей для Telegram');
  console.log(`🌐 Базовый URL: ${BASE_URL}`);
  console.log('─'.repeat(60));
  
  const workingUrl = await testAllWebhookPaths();
  
  if (workingUrl) {
    console.log('\n🏁 Диагностика завершена успешно!');
    console.log(`🎯 Рекомендуемый webhook URL: ${workingUrl}`);
  } else {
    console.log('\n🏁 Диагностика завершена с ошибками');
    console.log('🔧 Требуется исправление маршрутизации сервера');
  }
}

main().catch(console.error);