/**
 * Скрипт для тестирования API в production-режиме
 * Проверяет доступность API через основной domain без указания порта
 */

import fetch from 'node-fetch';

// Production URL
const PRODUCTION_URL = 'https://uni-farm-connect-2-misterxuniverse.replit.app';

// Список API-эндпоинтов для проверки
const API_ENDPOINTS = [
  '/',                          // Health check
  '/api/user/check',            // Проверка пользователя
  '/UniFarm',                   // Mini App URL
  '/app',                       // Альтернативный Mini App URL
  '/telegram',                  // Альтернативный Mini App URL
  '/telegram-app'               // Альтернативный Mini App URL
];

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Проверяет доступность API-эндпоинта
 */
async function checkEndpoint(endpoint) {
  const url = `${PRODUCTION_URL}${endpoint}`;
  console.log(`${colors.blue}🔍 Проверка ${url}...${colors.reset}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Получаем данные ответа
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Для HTML-ответов ограничиваем вывод
    if (typeof data === 'string' && data.length > 100) {
      data = data.substring(0, 100) + '... (truncated)';
    }
    
    return {
      url,
      status: response.status,
      success: response.ok,
      responseTime,
      contentType,
      data
    };
  } catch (error) {
    return {
      url,
      status: 'Error',
      success: false,
      error: error.message
    };
  }
}

/**
 * Форматирует результат проверки для вывода
 */
function formatResult(result) {
  const statusColor = result.success ? colors.green : colors.red;
  const statusText = result.success ? 'SUCCESS' : 'FAILED';
  
  let output = `${statusColor}[${statusText}]${colors.reset} ${result.url}\n`;
  output += `  ${colors.yellow}Status:${colors.reset} ${result.status}\n`;
  
  if (result.responseTime) {
    output += `  ${colors.yellow}Time:${colors.reset} ${result.responseTime}ms\n`;
  }
  
  if (result.contentType) {
    output += `  ${colors.yellow}Content-Type:${colors.reset} ${result.contentType}\n`;
  }
  
  if (result.data) {
    output += `  ${colors.yellow}Data:${colors.reset} ${typeof result.data === 'object' ? JSON.stringify(result.data) : result.data}\n`;
  }
  
  if (result.error) {
    output += `  ${colors.red}Error:${colors.reset} ${result.error}\n`;
  }
  
  return output;
}

/**
 * Выводит итоговый отчет
 */
function printSummary(results) {
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  console.log('\n===========================================================');
  console.log(`${colors.cyan}📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ API${colors.reset}`);
  console.log('-----------------------------------------------------------');
  console.log(`${colors.green}✅ Успешно:${colors.reset} ${successCount}/${results.length}`);
  console.log(`${colors.red}❌ Ошибок:${colors.reset} ${failCount}/${results.length}`);
  console.log('===========================================================\n');
  
  if (failCount > 0) {
    console.log(`${colors.yellow}⚠️ РЕКОМЕНДАЦИИ:${colors.reset}`);
    console.log('1. Убедитесь, что приложение развернуто через Replit Deploy');
    console.log('2. Проверьте настройки Deployments в Replit (Run Command, Domain)');
    console.log('3. При необходимости перезапустите деплой через интерфейс Replit\n');
  } else {
    console.log(`${colors.green}✅ Все API-эндпоинты работают корректно!${colors.reset}\n`);
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log(`${colors.magenta}🚀 Начинаем проверку API в production-режиме${colors.reset}`);
  console.log(`${colors.magenta}📌 Production URL: ${PRODUCTION_URL}${colors.reset}\n`);
  
  const results = [];
  
  for (const endpoint of API_ENDPOINTS) {
    const result = await checkEndpoint(endpoint);
    console.log(formatResult(result));
    results.push(result);
  }
  
  printSummary(results);
}

main().catch(error => {
  console.error(`${colors.red}❌ Ошибка при выполнении скрипта:${colors.reset}`, error);
  process.exit(1);
});