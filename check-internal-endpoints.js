#!/usr/bin/env node

/**
 * Проверка внутренних API endpoints через localhost
 */

import http from 'http';

console.log('🔍 ПРОВЕРКА ВНУТРЕННИХ ENDPOINTS');
console.log('================================');

function checkLocalEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      const status = res.statusCode;
      const statusIcon = status === 200 ? '✅' : status === 404 ? '⚠️' : '❌';
      console.log(`${description}: ${statusIcon} HTTP ${status}`);
      resolve(status === 200);
    });

    req.on('error', (err) => {
      console.log(`${description}: ❌ ОШИБКА - ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`${description}: ❌ ТАЙМАУТ`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function checkEndpoints() {
  const endpoints = [
    ['/tonconnect-manifest.json', 'TON Connect манифест'],
    ['/.well-known/tonconnect-manifest.json', 'Well-known манифест'],
    ['/api/v2/health', 'Health API'],
    ['/webhook', 'Webhook endpoint'],
    ['/api/v2/users/profile', 'User Profile API'],
    ['/api/v2/wallet/balance', 'Wallet Balance API']
  ];

  console.log('Проверяем endpoints на localhost:3000...\n');

  let workingEndpoints = 0;
  for (const [path, description] of endpoints) {
    const isWorking = await checkLocalEndpoint(path, description);
    if (isWorking) workingEndpoints++;
  }

  console.log(`\n📊 Результат: ${workingEndpoints}/${endpoints.length} endpoints работают`);
  
  if (workingEndpoints >= 4) {
    console.log('✅ Сервер работает корректно!');
  } else {
    console.log('⚠️ Возможны проблемы с сервером');
  }
}

checkEndpoints().catch(console.error);