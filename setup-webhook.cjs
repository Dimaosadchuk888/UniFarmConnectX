#!/usr/bin/env node

const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = 'https://uni-farm-connect-x-alinabndrnk99.replit.app/webhook';

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не установлен');
  process.exit(1);
}

const data = JSON.stringify({
  url: WEBHOOK_URL,
  allowed_updates: ['message', 'callback_query', 'inline_query']
});

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${BOT_TOKEN}/setWebhook`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      if (result.ok) {
        console.log('✅ Webhook установлен успешно!');
        console.log(`📍 URL: ${WEBHOOK_URL}`);
      } else {
        console.error('❌ Ошибка установки webhook:', result.description);
      }
    } catch (error) {
      console.error('❌ Ошибка парсинга ответа:', error);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Ошибка запроса:', error);
});

req.write(data);
req.end();