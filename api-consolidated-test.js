/**
 * Скрипт для тестування API ендпоінтів з використанням консолідованих контролерів
 * 
 * Цей скрипт перевіряє всі основні API ендпоінти, які використовують нові консолідовані
 * контролери, та генерує звіт про їх статус і відповідність стандартам відповіді API
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Базова URL для API запитів
const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Список ендпоінтів для тестування (використовуються консолідовані контролери)
const endpoints = [
  // Mission Controller
  { 
    path: '/api/v2/missions/active', 
    method: 'GET', 
    description: 'Отримання активних місій',
    expectedStatus: 200,
    controller: 'MissionController'
  },
  { 
    path: '/api/v2/user-missions', 
    method: 'GET', 
    description: 'Отримання виконаних користувачем місій',
    expectedStatus: 200,
    controller: 'MissionController'
  },
  { 
    path: '/api/v2/missions/with-completion', 
    method: 'GET', 
    description: 'Отримання місій з інформацією про виконання',
    expectedStatus: 200,
    controller: 'MissionController'
  },
  
  // Referral Controller
  { 
    path: '/api/v2/referrals/tree', 
    method: 'GET', 
    description: 'Отримання реферального дерева',
    expectedStatus: 200,
    controller: 'ReferralController'
  },
  { 
    path: '/api/v2/referrals/stats', 
    method: 'GET', 
    description: 'Отримання реферальної статистики',
    expectedStatus: 200,
    controller: 'ReferralController'
  },
  
  // Boost Controller
  { 
    path: '/api/v2/boosts', 
    method: 'GET', 
    description: 'Отримання списку доступних бустів',
    expectedStatus: 200,
    controller: 'BoostController'
  },
  { 
    path: '/api/v2/boosts/active', 
    method: 'GET', 
    description: 'Отримання активних бустів користувача',
    expectedStatus: 200,
    controller: 'BoostController'
  },
  
  // TON Boost Controller
  { 
    path: '/api/v2/ton-farming/boosts', 
    method: 'GET', 
    description: 'Отримання доступних TON бустів',
    expectedStatus: 200,
    controller: 'TonBoostController'
  },
  { 
    path: '/api/v2/ton-farming/active', 
    method: 'GET', 
    description: 'Отримання активних TON бустів користувача',
    expectedStatus: 200,
    controller: 'TonBoostController'
  },
  { 
    path: '/api/v2/ton-farming/info', 
    method: 'GET', 
    description: 'Отримання інформації про TON фармінг',
    expectedStatus: 200,
    controller: 'TonBoostController'
  },
  
  // Wallet Controller
  { 
    path: '/api/v2/wallet/balance', 
    method: 'GET', 
    description: 'Отримання балансу гаманця',
    expectedStatus: 200,
    controller: 'WalletController'
  },
  { 
    path: '/api/v2/wallet/transactions', 
    method: 'GET', 
    description: 'Отримання транзакцій гаманця',
    expectedStatus: 200,
    controller: 'WalletController'
  },
  
  // Daily Bonus Controller
  { 
    path: '/api/v2/daily-bonus/status', 
    method: 'GET', 
    description: 'Отримання статусу щоденного бонусу',
    expectedStatus: 200,
    controller: 'DailyBonusController'
  },
  { 
    path: '/api/v2/daily-bonus/streak-info', 
    method: 'GET', 
    description: 'Отримання інформації про стрік щоденних бонусів',
    expectedStatus: 200,
    controller: 'DailyBonusController'
  }
];

// Функція для тестування API ендпоінта
async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  console.log(`Тестуємо ${endpoint.method} ${url} (${endpoint.description})`);
  
  try {
    const response = await axios({
      method: endpoint.method,
      url,
      params: endpoint.method === 'GET' ? { test: true } : undefined,
      data: endpoint.method !== 'GET' ? { test: true } : undefined,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Test': 'true'
      }
    });
    
    // Перевіряємо статус відповіді
    const statusMatch = response.status === endpoint.expectedStatus;
    
    // Перевіряємо структуру відповіді (success/data/error)
    const hasStandardStructure = 
      response.data !== undefined && 
      typeof response.data === 'object' && 
      ('success' in response.data) && 
      (response.data.success === true ? 'data' in response.data : 'error' in response.data);
    
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      controller: endpoint.controller,
      statusCode: response.status,
      statusMatch,
      hasStandardStructure,
      responseTime: response.headers['x-response-time'] || 'N/A',
      success: statusMatch && hasStandardStructure,
      response: response.data,
      error: null
    };
  } catch (error) {
    console.error(`Помилка при тестуванні ${endpoint.method} ${url}:`, error.message);
    
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      controller: endpoint.controller,
      statusCode: error.response ? error.response.status : 'Немає відповіді',
      statusMatch: false,
      hasStandardStructure: false,
      responseTime: 'N/A',
      success: false,
      response: error.response ? error.response.data : null,
      error: error.message
    };
  }
}

// Функція для генерації звіту
function generateReport(results) {
  // Загальна статистика
  const totalEndpoints = results.length;
  const successfulEndpoints = results.filter(r => r.success).length;
  const failedEndpoints = totalEndpoints - successfulEndpoints;
  
  // Статистика по контролерам
  const controllerStats = {};
  results.forEach(result => {
    if (!controllerStats[result.controller]) {
      controllerStats[result.controller] = {
        total: 0,
        success: 0,
        failed: 0
      };
    }
    
    controllerStats[result.controller].total++;
    if (result.success) {
      controllerStats[result.controller].success++;
    } else {
      controllerStats[result.controller].failed++;
    }
  });
  
  // Формуємо текст звіту
  let report = '# API Test Report (Consolidated Controllers)\n\n';
  report += `Tested at: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n`;
  report += `- Total Endpoints: ${totalEndpoints}\n`;
  report += `- Successful: ${successfulEndpoints}\n`;
  report += `- Failed: ${failedEndpoints}\n`;
  report += `- Success Rate: ${Math.round((successfulEndpoints / totalEndpoints) * 100)}%\n\n`;
  
  report += `## Controller Statistics\n`;
  for (const [controller, stats] of Object.entries(controllerStats)) {
    report += `### ${controller}\n`;
    report += `- Total Endpoints: ${stats.total}\n`;
    report += `- Successful: ${stats.success}\n`;
    report += `- Failed: ${stats.failed}\n`;
    report += `- Success Rate: ${Math.round((stats.success / stats.total) * 100)}%\n\n`;
  }
  
  report += `## Endpoint Details\n\n`;
  results.forEach(result => {
    report += `### ${result.method} ${result.endpoint}\n`;
    report += `- Controller: ${result.controller}\n`;
    report += `- Status: ${result.success ? '✅ Success' : '❌ Failed'}\n`;
    report += `- Response Code: ${result.statusCode}\n`;
    report += `- Expected Code: ${endpoints.find(e => e.path === result.endpoint).expectedStatus}\n`;
    report += `- Standard Structure: ${result.hasStandardStructure ? 'Yes' : 'No'}\n`;
    report += `- Response Time: ${result.responseTime}\n`;
    
    if (!result.success) {
      report += `- Error: ${result.error || 'Unknown error'}\n`;
      if (result.response) {
        report += `- Response Data: \`\`\`json\n${JSON.stringify(result.response, null, 2)}\n\`\`\`\n`;
      }
    }
    
    report += '\n';
  });
  
  return report;
}

// Головна функція тестування
async function runTests() {
  console.log(`Початок тестування API ендпоінтів (${endpoints.length} ендпоінтів)`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  // Генеруємо та зберігаємо звіт
  const report = generateReport(results);
  fs.writeFileSync('api-consolidated-test-report.md', report);
  
  console.log(`Тестування завершено. Звіт збережено в api-consolidated-test-report.md`);
  console.log(`Загальний результат: ${results.filter(r => r.success).length}/${results.length} успішних ендпоінтів`);
  
  return results;
}

// Запускаємо тестування
runTests().catch(console.error);