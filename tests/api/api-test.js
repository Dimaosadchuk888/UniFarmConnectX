/**
 * Скрипт для тестування API ендпоінтів UniFarm
 */
const fetch = require('node-fetch');

const BASE_URL = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';

// Список ендпоінтів для тестування
const endpoints = [
  { method: 'GET', url: '/api/v2/missions/active', authRequired: false, name: 'Активні місії' },
  { method: 'GET', url: '/api/v2/user-missions', authRequired: false, name: 'Завершені місії користувача' },
  { method: 'GET', url: '/api/v2/wallet/balance', authRequired: true, name: 'Баланс гаманця' },
  { method: 'GET', url: '/api/v2/daily-bonus/status', authRequired: true, name: 'Статус щоденного бонусу' },
  { method: 'GET', url: '/api/v2/referrals/tree', authRequired: true, name: 'Реферальне дерево' },
  { method: 'GET', url: '/api/v2/ton-farming/boosts', authRequired: false, name: 'TON бусти' },
  { method: 'GET', url: '/api/v2/boosts', authRequired: false, name: 'Стандартні бусти' },
];

// Тестовий користувач (можна замінити на реального)
const testUser = {
  userId: 1, // Замінити на реальний ID, якщо можливо
  telegramData: JSON.stringify({
    id: 123456789,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    auth_date: Math.floor(Date.now() / 1000)
  })
};

// Функція для тестування одного ендпоінта
async function testEndpoint(endpoint) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (endpoint.authRequired) {
      headers['X-User-ID'] = String(testUser.userId);
      headers['X-Telegram-Data'] = testUser.telegramData;
    }
    
    const response = await fetch(`${BASE_URL}${endpoint.url}`, {
      method: endpoint.method,
      headers
    });
    
    const status = response.status;
    const isSuccess = status >= 200 && status < 300;
    let responseBody;
    
    try {
      responseBody = await response.json();
    } catch (e) {
      responseBody = { error: 'Неможливо розпарсити JSON відповідь' };
    }
    
    const hasSuccessField = responseBody && ('success' in responseBody);
    const hasDataOrErrorField = responseBody && (('data' in responseBody) || ('error' in responseBody));
    const isStandardized = hasSuccessField && hasDataOrErrorField;
    
    return {
      endpoint: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
      status,
      isSuccess,
      isStandardized,
      response: responseBody
    };
  } catch (error) {
    return {
      endpoint: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
      status: 0,
      isSuccess: false,
      isStandardized: false,
      error: error.message
    };
  }
}

// Основна функція для тестування всіх ендпоінтів
async function testAllEndpoints() {
  console.log('Початок тестування API ендпоінтів\n');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    process.stdout.write(`Тестування ${endpoint.method} ${endpoint.url}... `);
    const result = await testEndpoint(endpoint);
    
    if (result.isSuccess) {
      if (result.isStandardized) {
        process.stdout.write('✅ OK (Стандартизовано)\n');
      } else {
        process.stdout.write('⚠️ OK (Не стандартизовано)\n');
      }
    } else {
      process.stdout.write('❌ ПОМИЛКА\n');
    }
    
    results.push(result);
  }
  
  console.log('\nРезультати тестування:');
  console.log('=====================\n');
  
  let criticalIssuesCount = 0;
  let nonCriticalIssuesCount = 0;
  
  results.forEach(result => {
    console.log(`Ендпоінт: ${result.endpoint} (${result.method} ${result.url})`);
    console.log(`Статус: ${result.status}`);
    
    if (!result.isSuccess) {
      console.log('Тип проблеми: Недоступність ендпоінта');
      console.log('Критичність: КРИТИЧНА');
      criticalIssuesCount++;
    } else if (!result.isStandardized) {
      console.log('Тип проблеми: Не відповідає стандартній структурі відповіді');
      console.log('Критичність: НЕ КРИТИЧНА');
      nonCriticalIssuesCount++;
    } else {
      console.log('✅ Все в порядку');
    }
    
    console.log('---------------------\n');
  });
  
  console.log(`Загальний підсумок:`);
  console.log(`- Всього ендпоінтів: ${results.length}`);
  console.log(`- Критичних проблем: ${criticalIssuesCount}`);
  console.log(`- Не критичних проблем: ${nonCriticalIssuesCount}`);
  console.log(`- Успішних ендпоінтів: ${results.length - criticalIssuesCount - nonCriticalIssuesCount}`);
}

// Запуск тестування
testAllEndpoints().catch(error => {
  console.error('Помилка при тестуванні:', error);
});
