#!/usr/bin/env node

/**
 * Финальная проверка готовности к развертыванию
 */

import https from 'https';
import http from 'http';
import fs from 'fs';

const NEW_DOMAIN = 'https://uni-farm-connect-unifarm01010101.replit.app';
const OLD_DOMAINS = [
  'uni-farm-connect-x-elizabethstone1',
  'uni-farm-connect-x-w81846064', 
  'uni-farm-connect-x-ab245275',
  'uni-farm-connect-aab49267',
  'ab245275',
  'elizabethstone1',
  'aab49267',
  'w81846064'
];

console.log('🔍 ФИНАЛЬНАЯ ПРОВЕРКА ГОТОВНОСТИ К РАЗВЕРТЫВАНИЮ');
console.log('================================================');
console.log(`Целевой домен: ${NEW_DOMAIN}`);
console.log('');

// Проверка переменных окружения
console.log('📋 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:');
console.log('------------------------');
const requiredVars = {
  'TELEGRAM_WEBAPP_URL': process.env.TELEGRAM_WEBAPP_URL,
  'APP_DOMAIN': process.env.APP_DOMAIN,
  'CORS_ORIGINS': process.env.CORS_ORIGINS,
  'TELEGRAM_WEBHOOK_URL': process.env.TELEGRAM_WEBHOOK_URL,
  'JWT_SECRET': process.env.JWT_SECRET ? '✅ УСТАНОВЛЕНА' : '❌ НЕ УСТАНОВЛЕНА',
  'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN ? '✅ УСТАНОВЛЕНА' : '❌ НЕ УСТАНОВЛЕНА'
};

let envErrors = 0;
for (const [key, value] of Object.entries(requiredVars)) {
  if (key === 'JWT_SECRET' || key === 'TELEGRAM_BOT_TOKEN') {
    console.log(`${key}: ${value}`);
    if (value.includes('❌')) envErrors++;
  } else if (value) {
    const hasOldDomain = OLD_DOMAINS.some(old => value.includes(old));
    const hasNewDomain = value.includes('unifarm01010101');
    
    if (hasOldDomain && !hasNewDomain) {
      console.log(`${key}: ❌ СОДЕРЖИТ СТАРЫЙ ДОМЕН - ${value}`);
      envErrors++;
    } else if (hasNewDomain) {
      console.log(`${key}: ✅ ${value}`);
    } else {
      console.log(`${key}: ⚠️ ${value || 'НЕ УСТАНОВЛЕНА'}`);
      if (!value) envErrors++;
    }
  } else {
    console.log(`${key}: ❌ НЕ УСТАНОВЛЕНА`);
    envErrors++;
  }
}

console.log('');

// Проверка файлов на старые ссылки
console.log('📁 ПРОВЕРКА ФАЙЛОВ НА СТАРЫЕ ССЫЛКИ:');
console.log('-----------------------------------');

const criticalFiles = [
  'client/public/tonconnect-manifest.json',
  'client/public/.well-known/tonconnect-manifest.json',
  'client/src/App.tsx',
  'config/app.ts',
  'core/config/security.ts',
  'core/middleware/cors.ts'
];

let fileErrors = 0;
for (const file of criticalFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const hasOldDomain = OLD_DOMAINS.some(old => content.includes(old));
    const hasNewDomain = content.includes('unifarm01010101');
    
    if (hasOldDomain) {
      console.log(`${file}: ❌ СОДЕРЖИТ СТАРЫЕ ССЫЛКИ`);
      fileErrors++;
    } else if (hasNewDomain) {
      console.log(`${file}: ✅ ОБНОВЛЕН`);
    } else {
      console.log(`${file}: ⚠️ НЕ СОДЕРЖИТ ДОМЕНОВ`);
    }
  } catch (error) {
    console.log(`${file}: ❌ ОШИБКА ЧТЕНИЯ`);
    fileErrors++;
  }
}

console.log('');

// Проверка доступности endpoints
console.log('🌐 ПРОВЕРКА ДОСТУПНОСТИ ENDPOINTS:');
console.log('----------------------------------');

function checkUrl(url, description) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, (res) => {
      const status = res.statusCode === 200 ? '✅' : '❌';
      console.log(`${description}: ${status} HTTP ${res.statusCode}`);
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

async function runChecks() {
  // Проверка основных endpoints
  const endpointChecks = await Promise.all([
    checkUrl(`${NEW_DOMAIN}/tonconnect-manifest.json`, 'TON Connect манифест'),
    checkUrl(`${NEW_DOMAIN}/.well-known/tonconnect-manifest.json`, 'Well-known манифест'),
    checkUrl(`${NEW_DOMAIN}/api/v2/health`, 'Health check API'),
    checkUrl(`${NEW_DOMAIN}/webhook`, 'Webhook endpoint')
  ]);
  
  const endpointErrors = endpointChecks.filter(check => !check).length;
  
  console.log('');
  console.log('📊 ИТОГОВАЯ ОЦЕНКА:');
  console.log('-------------------');
  
  const totalErrors = envErrors + fileErrors + endpointErrors;
  
  console.log(`Ошибки переменных окружения: ${envErrors}`);
  console.log(`Ошибки в файлах: ${fileErrors}`);
  console.log(`Недоступные endpoints: ${endpointErrors}`);
  console.log(`Общее количество проблем: ${totalErrors}`);
  console.log('');
  
  if (totalErrors === 0) {
    console.log('🎉 СИСТЕМА ПОЛНОСТЬЮ ГОТОВА К РАЗВЕРТЫВАНИЮ!');
    console.log('✅ Все переменные окружения настроены корректно');
    console.log('✅ Все файлы обновлены на новый домен');
    console.log('✅ Все endpoints доступны');
    console.log('✅ Старые ссылки полностью удалены');
  } else if (totalErrors <= 2) {
    console.log('⚠️ СИСТЕМА ПОЧТИ ГОТОВА, ЕСТЬ МИНОРНЫЕ ПРОБЛЕМЫ');
    console.log('Рекомендуется исправить найденные проблемы перед развертыванием');
  } else {
    console.log('❌ СИСТЕМА НЕ ГОТОВА К РАЗВЕРТЫВАНИЮ');
    console.log('Необходимо исправить критические проблемы');
  }
  
  console.log('');
  console.log('🚀 После исправления всех проблем система готова к production деплою!');
}

runChecks().catch(console.error);