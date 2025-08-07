#!/usr/bin/env node

/**
 * Тест готовности к деплою после миграции домена
 */

import https from 'https';
import http from 'http';

const NEW_DOMAIN = 'https://uni-farm-connect-unifarm01010101.replit.app';

console.log('🚀 ТЕСТИРОВАНИЕ ГОТОВНОСТИ К ДЕПЛОЮ');
console.log('===================================');
console.log(`Новый домен: ${NEW_DOMAIN}`);
console.log('');

// Проверка переменных окружения
console.log('📋 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:');
console.log('------------------------');
console.log(`TELEGRAM_WEBAPP_URL: ${process.env.TELEGRAM_WEBAPP_URL || '❌ НЕ УСТАНОВЛЕНА'}`);
console.log(`APP_DOMAIN: ${process.env.APP_DOMAIN || '❌ НЕ УСТАНОВЛЕНА'}`);
console.log(`CORS_ORIGINS: ${process.env.CORS_ORIGINS || '❌ НЕ УСТАНОВЛЕНА'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ УСТАНОВЛЕНА' : '❌ НЕ УСТАНОВЛЕНА'}`);
console.log(`TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ УСТАНОВЛЕНА' : '❌ НЕ УСТАНОВЛЕНА'}`);
console.log('');

// Проверка TON Connect манифеста
console.log('🔗 TON CONNECT МАНИФЕСТ:');
console.log('------------------------');

function checkUrl(url, description) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, (res) => {
      console.log(`${description}: ${res.statusCode === 200 ? '✅' : '❌'} HTTP ${res.statusCode}`);
      resolve(res.statusCode === 200);
    });
    
    request.on('error', (err) => {
      console.log(`${description}: ❌ ОШИБКА - ${err.message}`);
      resolve(false);
    });
    
    request.setTimeout(5000, () => {
      console.log(`${description}: ❌ ТАЙМАУТ`);
      request.destroy();
      resolve(false);
    });
  });
}

async function runTests() {
  // Проверка доступности манифестов
  await checkUrl(`${NEW_DOMAIN}/tonconnect-manifest.json`, 'Основной манифест');
  await checkUrl(`${NEW_DOMAIN}/.well-known/tonconnect-manifest.json`, 'Well-known манифест');
  
  console.log('');
  console.log('🎯 РЕКОМЕНДАЦИИ:');
  console.log('----------------');
  
  if (!process.env.TELEGRAM_WEBAPP_URL) {
    console.log('❌ Установите TELEGRAM_WEBAPP_URL в Replit Secrets');
  }
  
  if (!process.env.APP_DOMAIN) {
    console.log('❌ Установите APP_DOMAIN в Replit Secrets');
  }
  
  if (!process.env.CORS_ORIGINS) {
    console.log('❌ Установите CORS_ORIGINS в Replit Secrets');
  }
  
  console.log('✅ Перезапустите приложение после обновления секретов');
  console.log('✅ Проверьте работу TON Connect в браузере');
  console.log('');
  console.log('🚀 После этого приложение готово к деплою!');
}

runTests().catch(console.error);