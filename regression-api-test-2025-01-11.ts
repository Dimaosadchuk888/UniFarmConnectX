/**
 * Регрессионное тестирование API endpoints UniFarm
 * Дата: 11 января 2025
 * Цель: Проверить работоспособность всех критических API endpoints
 */

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  httpStatus?: number;
  message: string;
  responseTime?: number;
  data?: any;
}

const testResults: TestResult[] = [];
const BASE_URL = 'http://localhost:3000';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbUlkIjo5OTk0ODksInVzZXJuYW1lIjoidGVzdF91c2VyXzE3NTIxMjk4NDA5MDUiLCJyZWZDb2RlIjoiVEVTVF8xNzUyMTI5ODQwOTA1X2Rva3h2MCIsImlhdCI6MTc1MjIzMjU4MywiZXhwIjoxNzUyODM3MzgzfQ.s2_JPwkjBJQ5dTODm4sTXdHc5xrcSqmP-1Jy3ueFIq4';

// Цветной вывод
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(
  endpoint: string, 
  method: string = 'GET', 
  requiresAuth: boolean = true,
  body?: any
): Promise<void> {
  const startTime = Date.now();
  
  try {
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    if (requiresAuth) {
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
    }
    
    const options: RequestInit = {
      method,
      headers
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const responseTime = Date.now() - startTime;
    
    let responseData = null;
    try {
      responseData = await response.json();
    } catch (e) {
      // Response might not be JSON
    }
    
    if (response.ok) {
      testResults.push({
        endpoint,
        method,
        status: 'PASS',
        httpStatus: response.status,
        message: `${response.status} OK (${responseTime}ms)`,
        responseTime,
        data: responseData
      });
      log(`[PASS] ${method} ${endpoint} - ${response.status} (${responseTime}ms)`, 'green');
    } else if (response.status === 401 && requiresAuth) {
      testResults.push({
        endpoint,
        method,
        status: 'WARN',
        httpStatus: response.status,
        message: `Требуется авторизация (${responseTime}ms)`,
        responseTime
      });
      log(`[WARN] ${method} ${endpoint} - 401 Unauthorized (${responseTime}ms)`, 'yellow');
    } else {
      testResults.push({
        endpoint,
        method,
        status: 'FAIL',
        httpStatus: response.status,
        message: `${response.status} ${response.statusText}`,
        responseTime,
        data: responseData
      });
      log(`[FAIL] ${method} ${endpoint} - ${response.status} (${responseTime}ms)`, 'red');
    }
  } catch (error: any) {
    testResults.push({
      endpoint,
      method,
      status: 'FAIL',
      message: error.message || 'Network error'
    });
    log(`[FAIL] ${method} ${endpoint} - ${error.message}`, 'red');
  }
}

async function runTests() {
  log('\nРЕГРЕССИОННОЕ ТЕСТИРОВАНИЕ API UNIFARM', 'magenta');
  log('========================================\n', 'magenta');
  
  // 1. Тестирование аутентификации
  log('=== МОДУЛЬ: АУТЕНТИФИКАЦИЯ ===', 'blue');
  await testEndpoint('/api/v2/auth/guest', 'POST', false);
  await testEndpoint('/api/v2/auth/refresh', 'POST', true);
  
  // 2. Тестирование пользователей
  log('\n=== МОДУЛЬ: ПОЛЬЗОВАТЕЛИ ===', 'blue');
  await testEndpoint('/api/v2/users/profile?user_id=74', 'GET', true);
  await testEndpoint('/api/v2/users/stats?user_id=74', 'GET', true);
  
  // 3. Тестирование кошелька
  log('\n=== МОДУЛЬ: КОШЕЛЕК ===', 'blue');
  await testEndpoint('/api/v2/wallet/balance?user_id=74', 'GET', true);
  await testEndpoint('/api/v2/wallet/history?user_id=74', 'GET', true);
  
  // 4. Тестирование UNI Farming
  log('\n=== МОДУЛЬ: UNI FARMING ===', 'blue');
  await testEndpoint('/api/v2/uni-farming/status?user_id=74', 'GET', true);
  await testEndpoint('/api/v2/uni-farming/history?user_id=74', 'GET', true);
  
  // 5. Тестирование TON Boost
  log('\n=== МОДУЛЬ: TON BOOST ===', 'blue');
  await testEndpoint('/api/v2/boost/packages', 'GET', true);
  await testEndpoint('/api/v2/boost/farming-status?user_id=74', 'GET', true);
  await testEndpoint('/api/v2/boost/active?user_id=74', 'GET', true);
  
  // 6. Тестирование реферальной системы
  log('\n=== МОДУЛЬ: РЕФЕРАЛЬНАЯ СИСТЕМА ===', 'blue');
  await testEndpoint('/api/v2/referral/stats?user_id=74', 'GET', true);
  await testEndpoint('/api/v2/referral/74/list', 'GET', true);
  
  // 7. Тестирование миссий
  log('\n=== МОДУЛЬ: МИССИИ ===', 'blue');
  await testEndpoint('/api/v2/missions', 'GET', true);
  await testEndpoint('/api/v2/missions/user?user_id=74', 'GET', true);
  
  // 8. Тестирование ежедневных бонусов
  log('\n=== МОДУЛЬ: ЕЖЕДНЕВНЫЕ БОНУСЫ ===', 'blue');
  await testEndpoint('/api/v2/daily-bonus/status?user_id=74', 'GET', true);
  await testEndpoint('/api/v2/daily-bonus/74/stats', 'GET', true);
  
  // 9. Тестирование транзакций
  log('\n=== МОДУЛЬ: ТРАНЗАКЦИИ ===', 'blue');
  await testEndpoint('/api/v2/transactions?user_id=74', 'GET', true);
  await testEndpoint('/api/v2/transactions/summary?user_id=74', 'GET', true);
  
  // 10. Тестирование мониторинга
  log('\n=== МОДУЛЬ: МОНИТОРИНГ ===', 'blue');
  await testEndpoint('/api/v2/monitor/health', 'GET', false);
  await testEndpoint('/api/v2/monitor/stats', 'GET', false);
  
  // Генерация отчета
  generateReport();
}

function generateReport() {
  log('\n========== ИТОГОВЫЙ ОТЧЕТ ==========', 'magenta');
  
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const warned = testResults.filter(r => r.status === 'WARN').length;
  
  const passRate = ((passed / total) * 100).toFixed(1);
  
  log(`\nВсего тестов: ${total}`, 'blue');
  log(`Успешно: ${passed} (${passRate}%)`, 'green');
  log(`Предупреждения: ${warned}`, 'yellow');
  log(`Ошибки: ${failed}`, 'red');
  
  // Статистика по модулям
  const modules: { [key: string]: { pass: number; fail: number; warn: number } } = {};
  
  const moduleMapping: { [key: string]: string } = {
    '/auth': 'Аутентификация',
    '/users': 'Пользователи',
    '/wallet': 'Кошелек',
    '/uni-farming': 'UNI Farming',
    '/boost': 'TON Boost',
    '/referral': 'Реферальная система',
    '/missions': 'Миссии',
    '/daily-bonus': 'Ежедневные бонусы',
    '/transactions': 'Транзакции',
    '/monitor': 'Мониторинг'
  };
  
  testResults.forEach(result => {
    const modulePath = Object.keys(moduleMapping).find(path => result.endpoint.includes(path));
    const moduleName = modulePath ? moduleMapping[modulePath] : 'Другое';
    
    if (!modules[moduleName]) {
      modules[moduleName] = { pass: 0, fail: 0, warn: 0 };
    }
    
    modules[moduleName][result.status.toLowerCase() as 'pass' | 'fail' | 'warn']++;
  });
  
  log('\n=== СТАТИСТИКА ПО МОДУЛЯМ ===', 'blue');
  Object.entries(modules).forEach(([module, stats]) => {
    const total = stats.pass + stats.fail + stats.warn;
    const status = stats.fail > 0 ? 'FAIL' : stats.warn > 0 ? 'WARN' : 'PASS';
    const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
    log(`${module}: ${stats.pass}/${total} (${status})`, color);
  });
  
  // Критические проблемы
  const criticalIssues = testResults.filter(r => r.status === 'FAIL');
  if (criticalIssues.length > 0) {
    log('\n=== КРИТИЧЕСКИЕ ПРОБЛЕМЫ ===', 'red');
    criticalIssues.forEach(issue => {
      log(`- ${issue.method} ${issue.endpoint}: ${issue.message}`, 'red');
    });
  }
  
  // Анализ времени отклика
  const responseTimes = testResults
    .filter(r => r.responseTime)
    .map(r => r.responseTime!);
    
  if (responseTimes.length > 0) {
    const avgTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
    const maxTime = Math.max(...responseTimes);
    const minTime = Math.min(...responseTimes);
    
    log('\n=== ПРОИЗВОДИТЕЛЬНОСТЬ ===', 'blue');
    log(`Среднее время отклика: ${avgTime}ms`, 'blue');
    log(`Минимальное: ${minTime}ms`, 'green');
    log(`Максимальное: ${maxTime}ms`, maxTime > 1000 ? 'red' : 'yellow');
  }
  
  // Рекомендации
  log('\n=== РЕКОМЕНДАЦИИ ===', 'yellow');
  if (failed > 0) {
    log('1. Проверить работу сервера и доступность endpoints', 'yellow');
  }
  if (warned > 5) {
    log('2. Проверить JWT токен и авторизацию', 'yellow');
  }
  if (passRate < 80) {
    log('3. Требуется дополнительная диагностика системы', 'yellow');
  } else if (passRate >= 95) {
    log('✓ API работает отлично!', 'green');
  } else {
    log('✓ API работает стабильно', 'green');
  }
  
  // Готовность системы
  let readiness = parseFloat(passRate);
  if (failed > 0) readiness -= failed * 3;
  if (warned > 5) readiness -= 5;
  readiness = Math.max(0, Math.min(100, readiness));
  
  log(`\n=== ГОТОВНОСТЬ API: ${readiness.toFixed(1)}% ===`, 
    readiness >= 80 ? 'green' : readiness >= 60 ? 'yellow' : 'red');
}

// Запуск тестов
runTests().catch(error => {
  log('\nКРИТИЧЕСКАЯ ОШИБКА ПРИ ЗАПУСКЕ ТЕСТОВ', 'red');
  console.error(error);
});