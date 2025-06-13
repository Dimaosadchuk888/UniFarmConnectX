/**
 * Тест эндпоинта /webhook для проверки корректной настройки
 * Задача T12: Проверка Telegram Webhook
 */

import https from 'https';

const WEBHOOK_URL = 'https://uni-farm-connect-x-osadchukdmitro2.replit.app/webhook';

// Создаем тестовое обновление от Telegram
const testUpdate = {
  update_id: 123456789,
  message: {
    message_id: 1,
    from: {
      id: 123456789,
      is_bot: false,
      first_name: "Test",
      username: "testuser",
      language_code: "ru"
    },
    chat: {
      id: 123456789,
      first_name: "Test",
      username: "testuser",
      type: "private"
    },
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
        'User-Agent': 'TelegramBot (like TwitterBot)'
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
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
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

async function testWebhookEndpoint() {
  console.log('🧪 Тестирую эндпоинт /webhook...');
  console.log(`📍 URL: ${WEBHOOK_URL}`);
  console.log('─'.repeat(50));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, 'POST', testUpdate);
    
    console.log('📊 Результат теста webhook:');
    console.log(`📌 HTTP статус: ${response.status}`);
    console.log('📄 Ответ сервера:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Webhook эндпоинт работает корректно!');
      console.log('✅ Сервер обрабатывает POST запросы от Telegram');
    } else if (response.status === 404) {
      console.log('❌ Эндпоинт /webhook не найден - маршрут не зарегистрирован');
    } else if (response.status === 500) {
      console.log('❌ Внутренняя ошибка сервера при обработке webhook');
    } else {
      console.log(`⚠️ Неожиданный статус: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании webhook:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔄 Сервер не запущен или недоступен');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🌐 Проблема с DNS или URL недоступен');
    }
  }
  
  console.log('─'.repeat(50));
}

// Дополнительная проверка доступности сервера
async function testServerHealth() {
  console.log('🏥 Проверяю доступность сервера...');
  
  try {
    const healthUrl = 'https://uni-farm-connect-x-osadchukdmitro2.replit.app/health';
    const response = await makeRequest(healthUrl, 'GET');
    
    console.log(`📋 Health check статус: ${response.status}`);
    if (response.status === 200) {
      console.log('✅ Сервер запущен и доступен');
    } else {
      console.log('⚠️ Сервер отвечает, но с нестандартным статусом');
    }
    
  } catch (error) {
    console.error('❌ Сервер недоступен:', error.message);
  }
  
  console.log('─'.repeat(50));
}

async function main() {
  console.log('🚀 Начинаю проверку настройки Telegram Webhook');
  console.log('📋 Задача T12: Проверка и настройка Webhook');
  console.log('─'.repeat(50));
  
  // Сначала проверяем доступность сервера
  await testServerHealth();
  
  // Затем тестируем webhook эндпоинт
  await testWebhookEndpoint();
  
  console.log('🏁 Проверка завершена!');
}

main().catch(console.error);