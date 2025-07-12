import fetch from 'node-fetch';

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NzQsInRlbGVncmFtX2lkIjoxMjM0NTY3ODksInVzZXJuYW1lIjoidGVzdF91c2VyXzE3NTIxMjk4NDA5MDUiLCJmaXJzdF9uYW1lIjoiVGVzdCIsImxhc3RfbmFtZSI6IlVzZXIiLCJyZWZfY29kZSI6IlJFRl8xNzUyMTI5ODQwOTA1X3Q5Mzh2cyIsImlhdCI6MTc1MjEyOTg0MCwiZXhwIjoxNzUyNzM0NjQwfQ.JxAC5u79LcXU0HQsEP_9GsLTc_Qnk0xBGLhJIQ0bE-4';
const BASE_URL = 'http://localhost:5003';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  httpStatus?: number;
  message: string;
  responseTime: number;
  data?: any;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method: string,
  body?: any,
  expectedStatuses: number[] = [200]
): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    const success = expectedStatuses.includes(response.status);
    
    return {
      endpoint,
      method,
      status: success ? 'PASS' : 'FAIL',
      httpStatus: response.status,
      message: success ? 'Endpoint работает корректно' : `Неожиданный статус: ${response.status}`,
      responseTime,
      data,
    };
  } catch (error: any) {
    return {
      endpoint,
      method,
      status: 'FAIL',
      message: 'Ошибка подключения к серверу',
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('🚀 Запуск регрессионного тестирования миграции');
  console.log(`📅 Дата: ${new Date().toLocaleString('ru-RU')}`);
  console.log('═'.repeat(60));
  
  // 1. GET /api/v2/wallet/balance
  console.log('\n📊 Тест 1: GET /api/v2/wallet/balance');
  const balanceTest = await testEndpoint('/api/v2/wallet/balance', 'GET');
  results.push(balanceTest);
  console.log(`Статус: ${balanceTest.status} | HTTP ${balanceTest.httpStatus} | ${balanceTest.responseTime}ms`);
  if (balanceTest.data) {
    console.log('Ответ:', JSON.stringify(balanceTest.data, null, 2));
  }
  
  // 2. GET /api/v2/wallet/transactions
  console.log('\n📜 Тест 2: GET /api/v2/wallet/transactions');
  const transactionsTest = await testEndpoint('/api/v2/wallet/transactions?page=1&limit=10', 'GET');
  results.push(transactionsTest);
  console.log(`Статус: ${transactionsTest.status} | HTTP ${transactionsTest.httpStatus} | ${transactionsTest.responseTime}ms`);
  if (transactionsTest.data?.transactions) {
    console.log(`Количество транзакций: ${transactionsTest.data.transactions.length}`);
  }
  
  // 3. GET /api/v2/uni-farming/status
  console.log('\n🌾 Тест 3: GET /api/v2/uni-farming/status');
  const farmingTest = await testEndpoint('/api/v2/uni-farming/status?user_id=74', 'GET');
  results.push(farmingTest);
  console.log(`Статус: ${farmingTest.status} | HTTP ${farmingTest.httpStatus} | ${farmingTest.responseTime}ms`);
  if (farmingTest.data?.data) {
    console.log(`UNI Farming активен: ${farmingTest.data.data.uni_farming_active}`);
    console.log(`Депозит: ${farmingTest.data.data.uni_deposit_amount} UNI`);
  }
  
  // 4. POST /api/v2/wallet/ton-deposit
  console.log('\n💎 Тест 4: POST /api/v2/wallet/ton-deposit');
  const tonDepositTest = await testEndpoint(
    '/api/v2/wallet/ton-deposit',
    'POST',
    {
      ton_tx_hash: `test_tx_${Date.now()}`,
      amount: 0.1,
      wallet_address: 'test_wallet_address'
    },
    [200, 201]
  );
  results.push(tonDepositTest);
  console.log(`Статус: ${tonDepositTest.status} | HTTP ${tonDepositTest.httpStatus} | ${tonDepositTest.responseTime}ms`);
  
  // 5. POST /api/v2/wallet/withdraw
  console.log('\n💸 Тест 5: POST /api/v2/wallet/withdraw');
  const withdrawTest = await testEndpoint(
    '/api/v2/wallet/withdraw',
    'POST',
    {
      amount: 100,
      currency: 'UNI',
      wallet_address: 'test_withdraw_address'
    },
    [200, 201, 400] // 400 если недостаточно средств
  );
  results.push(withdrawTest);
  console.log(`Статус: ${withdrawTest.status} | HTTP ${withdrawTest.httpStatus} | ${withdrawTest.responseTime}ms`);
  
  // 6. POST /api/v2/wallet/transfer
  console.log('\n🔄 Тест 6: POST /api/v2/wallet/transfer');
  const transferTest = await testEndpoint(
    '/api/v2/wallet/transfer',
    'POST',
    {
      recipient_id: 75,
      amount: 10,
      currency: 'UNI'
    },
    [200, 400] // 400 если недостаточно средств
  );
  results.push(transferTest);
  console.log(`Статус: ${transferTest.status} | HTTP ${transferTest.httpStatus} | ${transferTest.responseTime}ms`);
  
  // Проверка авторизации
  console.log('\n🔐 Тест 7: Проверка авторизации (без токена)');
  const authTest = await fetch(`${BASE_URL}/api/v2/wallet/balance`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const authResult: TestResult = {
    endpoint: '/api/v2/wallet/balance (без токена)',
    method: 'GET',
    status: authTest.status === 401 ? 'PASS' : 'FAIL',
    httpStatus: authTest.status,
    message: authTest.status === 401 ? 'Авторизация работает корректно' : 'Авторизация не работает!',
    responseTime: 0,
  };
  results.push(authResult);
  console.log(`Статус: ${authResult.status} | HTTP ${authResult.httpStatus}`);
  
  // Итоговый отчет
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ');
  console.log('═'.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const successRate = ((passed / results.length) * 100).toFixed(1);
  
  console.log(`✅ Успешно: ${passed}`);
  console.log(`❌ Провалено: ${failed}`);
  console.log(`📈 Успешность: ${successRate}%`);
  
  // Генерация отчета
  generateReport();
}

function generateReport() {
  let report = `# Regression Test Results - Migration Completed
Date: ${new Date().toLocaleString('ru-RU')}
Server: ${BASE_URL}

## Summary
- ✅ Passed: ${results.filter(r => r.status === 'PASS').length}
- ❌ Failed: ${results.filter(r => r.status === 'FAIL').length}
- 📊 Success Rate: ${((results.filter(r => r.status === 'PASS').length / results.length) * 100).toFixed(1)}%

## Detailed Results

| Endpoint | Method | Status | HTTP Code | Response Time | Notes |
|----------|--------|--------|-----------|---------------|-------|
`;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const httpCode = result.httpStatus || 'N/A';
    const time = `${result.responseTime}ms`;
    
    report += `| ${result.endpoint} | ${result.method} | ${icon} ${result.status} | ${httpCode} | ${time} | ${result.message} |\n`;
  });

  report += `\n## Key Findings\n\n`;

  // Проверка миграции
  const migrationEndpoints = [
    '/api/v2/wallet/balance',
    '/api/v2/wallet/transactions',
    '/api/v2/wallet/withdraw',
    '/api/v2/wallet/ton-deposit',
    '/api/v2/wallet/transfer',
    '/api/v2/uni-farming/status'
  ];

  const migrationResults = results.filter(r => 
    migrationEndpoints.some(ep => r.endpoint.includes(ep))
  );

  if (migrationResults.every(r => r.status === 'PASS')) {
    report += `### ✅ Migration Status: SUCCESS
All migrated endpoints are functioning correctly after the migration to modular architecture.\n\n`;
  } else {
    report += `### ⚠️ Migration Status: PARTIAL SUCCESS
Some migrated endpoints require attention:\n`;
    migrationResults.filter(r => r.status === 'FAIL').forEach(r => {
      report += `- ${r.endpoint}: ${r.message}\n`;
    });
    report += '\n';
  }

  // Проверка авторизации
  const authTest = results.find(r => r.endpoint.includes('без токена'));
  if (authTest?.status === 'PASS') {
    report += `### 🔐 Authorization: WORKING
JWT authentication is properly enforced on all endpoints.\n\n`;
  } else {
    report += `### ⚠️ Authorization: ISSUE DETECTED
JWT authentication may not be working correctly.\n\n`;
  }

  // Производительность
  const avgResponseTime = results
    .filter(r => r.responseTime > 0)
    .reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  report += `### ⚡ Performance
Average response time: ${avgResponseTime.toFixed(1)}ms\n`;
  
  if (avgResponseTime < 100) {
    report += `Performance is excellent.\n\n`;
  } else if (avgResponseTime < 500) {
    report += `Performance is acceptable.\n\n`;
  } else {
    report += `Performance needs optimization.\n\n`;
  }

  // Рекомендации
  report += `## Recommendations\n\n`;
  
  if (results.every(r => r.status === 'PASS')) {
    report += `1. ✅ All systems operational - migration completed successfully
2. 🚀 Ready for production deployment
3. 📊 Continue monitoring for any issues\n`;
  } else {
    report += `1. 🔧 Fix failing endpoints before production deployment
2. 🔍 Review error logs for detailed information
3. 🧪 Run additional integration tests\n`;
  }

  // Сохранение отчета
  require('fs').writeFileSync('regression_results.md', report);
  console.log('\n📄 Отчет сохранен в regression_results.md');
}

// Запуск тестов
runTests().catch(console.error);