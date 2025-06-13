/**
 * Скрипт настройки Webhook для Telegram-бота UniFarming
 * Задача T12: Проверка и настройка Webhook
 */

import https from 'https';

const BOT_TOKEN = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';
const WEBHOOK_URL = 'https://uni-farm-connect-x-osadchukdmitro2.replit.app:3000/webhook';

// Функция для выполнения HTTP запросов
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          resolve(responseData);
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

// Проверка текущего состояния Webhook
async function checkCurrentWebhook() {
  console.log('🔍 Проверяю текущее состояние Webhook...');
  
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
    const response = await makeRequest(url);
    
    console.log('📋 Текущее состояние Webhook:');
    console.log(JSON.stringify(response, null, 2));
    
    return response;
  } catch (error) {
    console.error('❌ Ошибка при проверке Webhook:', error);
    return null;
  }
}

// Установка нового Webhook
async function setWebhook() {
  console.log('⚙️ Устанавливаю новый Webhook...');
  
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
    const data = {
      url: WEBHOOK_URL,
      allowed_updates: ['message', 'callback_query']
    };
    
    const response = await makeRequest(url, 'POST', data);
    
    console.log('📝 Результат установки Webhook:');
    console.log(JSON.stringify(response, null, 2));
    
    return response;
  } catch (error) {
    console.error('❌ Ошибка при установке Webhook:', error);
    return null;
  }
}

// Проверка после установки
async function verifyWebhook() {
  console.log('✅ Проверяю установленный Webhook...');
  
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
    const response = await makeRequest(url);
    
    console.log('🎯 Финальное состояние Webhook:');
    console.log(JSON.stringify(response, null, 2));
    
    if (response.result && response.result.url === WEBHOOK_URL) {
      console.log('✅ Webhook успешно настроен на актуальный URL!');
    } else {
      console.log('❌ Webhook не настроен правильно');
    }
    
    return response;
  } catch (error) {
    console.error('❌ Ошибка при проверке Webhook:', error);
    return null;
  }
}

// Основная функция
async function main() {
  console.log('🚀 Начинаю настройку Webhook для @UniFarming_Bot');
  console.log(`📍 Целевой URL: ${WEBHOOK_URL}`);
  console.log('─'.repeat(50));
  
  // Шаг 1: Проверка текущего состояния
  await checkCurrentWebhook();
  
  console.log('─'.repeat(50));
  
  // Шаг 2: Установка нового Webhook
  await setWebhook();
  
  console.log('─'.repeat(50));
  
  // Шаг 3: Проверка результата
  await verifyWebhook();
  
  console.log('─'.repeat(50));
  console.log('🏁 Настройка Webhook завершена!');
}

// Запуск скрипта
main().catch(console.error);