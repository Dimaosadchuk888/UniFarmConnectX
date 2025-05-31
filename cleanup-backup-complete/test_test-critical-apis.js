/**
 * Тестирование критически важных API эндпоинтов UniFarm
 * 
 * Проверяет работоспособность всех ключевых API согласно REDMAP
 */

const baseUrl = process.env.APP_URL || 'http://localhost:3000';

// Список критически важных эндпоинтов для тестирования
const criticalEndpoints = [
  // Миссии
  { method: 'GET', path: '/api/v2/missions/active', description: 'Получение активных миссий' },
  { method: 'GET', path: '/api/v2/user-missions', description: 'Получение миссий пользователя' },
  { method: 'POST', path: '/api/v2/missions/complete', description: 'Завершение миссии' },
  
  // UNI Фарминг
  { method: 'GET', path: '/api/v2/uni-farming/status', description: 'Статус UNI фарминга' },
  { method: 'POST', path: '/api/v2/uni-farming/purchase', description: 'Покупка UNI фарминга' },
  { method: 'POST', path: '/api/v2/uni-farming/withdraw', description: 'Вывод средств UNI фарминга' },
  
  // TON Буст
  { method: 'GET', path: '/api/v2/ton-farming/boosts', description: 'Получение TON буст пакетов' },
  { method: 'POST', path: '/api/v2/ton-farming/purchase', description: 'Покупка TON буста' },
  
  // Буст пакеты
  { method: 'GET', path: '/api/v2/boosts', description: 'Получение буст пакетов' },
  
  // Реферальная система
  { method: 'GET', path: '/api/v2/referral/code', description: 'Получение реферального кода' },
  { method: 'POST', path: '/api/v2/referrals/apply', description: 'Применение реферального кода' },
  { method: 'GET', path: '/api/v2/referral/tree', description: 'Получение реферального дерева' },
  
  // Кошелек
  { method: 'GET', path: '/api/v2/wallet/balance', description: 'Получение баланса кошелька' },
  { method: 'POST', path: '/api/v2/wallet/withdraw', description: 'Вывод средств' },
  
  // Ежедневные бонусы
  { method: 'GET', path: '/api/v2/daily-bonus/status', description: 'Статус ежедневного бонуса' },
  { method: 'POST', path: '/api/v2/daily-bonus/claim', description: 'Получение ежедневного бонуса' },
  
  // Пользователи и сессии
  { method: 'GET', path: '/api/v2/me', description: 'Получение информации о пользователе' },
  { method: 'POST', path: '/api/v2/session/restore', description: 'Восстановление сессии' }
];

/**
 * Выполняет HTTP запрос к API
 */
async function callApi(endpoint, testData = {}) {
  const url = `${baseUrl}${endpoint.path}`;
  
  const options = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  // Добавляем тестовые данные для POST запросов
  if (endpoint.method === 'POST' && Object.keys(testData).length > 0) {
    options.body = JSON.stringify(testData);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      parsedData = { rawResponse: data };
    }

    return {
      status: response.status,
      success: response.ok,
      data: parsedData,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Тестирует конкретный эндпоинт
 */
async function testEndpoint(endpoint) {
  console.log(`\n🧪 Тестирование: ${endpoint.method} ${endpoint.path}`);
  console.log(`📝 Описание: ${endpoint.description}`);
  
  // Подготавливаем тестовые данные в зависимости от эндпоинта
  let testData = {};
  
  if (endpoint.path.includes('/missions/complete')) {
    testData = { missionId: 1, userId: 1 };
  } else if (endpoint.path.includes('/uni-farming/purchase')) {
    testData = { amount: 1000 };
  } else if (endpoint.path.includes('/uni-farming/withdraw')) {
    testData = { amount: 100 };
  } else if (endpoint.path.includes('/ton-farming/purchase')) {
    testData = { packageId: 1 };
  } else if (endpoint.path.includes('/referrals/apply')) {
    testData = { referralCode: 'TEST123' };
  } else if (endpoint.path.includes('/wallet/withdraw')) {
    testData = { amount: 100, address: 'test-address' };
  } else if (endpoint.path.includes('/session/restore')) {
    testData = { sessionId: 'test-session' };
  }

  const result = await callApi(endpoint, testData);
  
  // Анализируем результат
  if (result.status === 0) {
    console.log(`❌ ОШИБКА СОЕДИНЕНИЯ: ${result.error}`);
    return { ...endpoint, status: 'CONNECTION_ERROR', error: result.error };
  }
  
  if (result.status === 404) {
    console.log(`❌ ЭНДПОИНТ НЕ НАЙДЕН (404)`);
    return { ...endpoint, status: 'NOT_FOUND', error: 'Endpoint not implemented' };
  }
  
  if (result.status === 401 || result.status === 403) {
    console.log(`🔒 ТРЕБУЕТСЯ АВТОРИЗАЦИЯ (${result.status})`);
    return { ...endpoint, status: 'AUTH_REQUIRED', error: 'Authentication required' };
  }
  
  if (result.status >= 500) {
    console.log(`💥 СЕРВЕРНАЯ ОШИБКА (${result.status})`);
    console.log(`   Ответ: ${JSON.stringify(result.data, null, 2)}`);
    return { ...endpoint, status: 'SERVER_ERROR', error: result.data };
  }
  
  if (result.status >= 400) {
    console.log(`⚠️ КЛИЕНТСКАЯ ОШИБКА (${result.status})`);
    console.log(`   Ответ: ${JSON.stringify(result.data, null, 2)}`);
    return { ...endpoint, status: 'CLIENT_ERROR', error: result.data };
  }
  
  if (result.success) {
    console.log(`✅ УСПЕШНО (${result.status})`);
    
    // Проверяем формат ответа
    const hasStandardFormat = result.data && 
      (result.data.hasOwnProperty('success') || 
       result.data.hasOwnProperty('data') || 
       result.data.hasOwnProperty('error'));
    
    if (hasStandardFormat) {
      console.log(`   📊 Стандартный формат ответа: ДА`);
    } else {
      console.log(`   📊 Стандартный формат ответа: НЕТ`);
      console.log(`   📄 Ответ: ${JSON.stringify(result.data, null, 2)}`);
    }
    
    return { 
      ...endpoint, 
      status: 'SUCCESS', 
      responseData: result.data,
      hasStandardFormat 
    };
  }
  
  return { ...endpoint, status: 'UNKNOWN', error: 'Unknown status' };
}

/**
 * Запускает полное тестирование всех критических эндпоинтов
 */
async function runFullTest() {
  console.log('🚀 ЗАПУСК ТЕСТИРОВАНИЯ КРИТИЧЕСКИХ API ЭНДПОИНТОВ');
  console.log(`🌐 Базовый URL: ${baseUrl}`);
  console.log(`📊 Всего эндпоинтов для тестирования: ${criticalEndpoints.length}\n`);
  
  const results = [];
  
  for (const endpoint of criticalEndpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Генерируем отчет
  console.log('\n' + '='.repeat(60));
  console.log('📋 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
  console.log('='.repeat(60));
  
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'SUCCESS').length,
    notFound: results.filter(r => r.status === 'NOT_FOUND').length,
    authRequired: results.filter(r => r.status === 'AUTH_REQUIRED').length,
    serverError: results.filter(r => r.status === 'SERVER_ERROR').length,
    clientError: results.filter(r => r.status === 'CLIENT_ERROR').length,
    connectionError: results.filter(r => r.status === 'CONNECTION_ERROR').length
  };
  
  console.log(`\n📊 СТАТИСТИКА:`);
  console.log(`   Всего протестировано: ${summary.total}`);
  console.log(`   ✅ Успешно: ${summary.success}`);
  console.log(`   ❌ Не найдено: ${summary.notFound}`);
  console.log(`   🔒 Требуют авторизации: ${summary.authRequired}`);
  console.log(`   💥 Серверные ошибки: ${summary.serverError}`);
  console.log(`   ⚠️ Клиентские ошибки: ${summary.clientError}`);
  console.log(`   🌐 Ошибки соединения: ${summary.connectionError}`);
  
  // Детальная информация о проблемных эндпоинтах
  const problematicEndpoints = results.filter(r => 
    r.status === 'NOT_FOUND' || 
    r.status === 'SERVER_ERROR' || 
    r.status === 'CONNECTION_ERROR'
  );
  
  if (problematicEndpoints.length > 0) {
    console.log(`\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ (${problematicEndpoints.length}):`);
    problematicEndpoints.forEach(endpoint => {
      console.log(`   ${endpoint.method} ${endpoint.path} - ${endpoint.status}`);
      if (endpoint.error) {
        console.log(`      Ошибка: ${typeof endpoint.error === 'string' ? endpoint.error : JSON.stringify(endpoint.error)}`);
      }
    });
  }
  
  // Эндпоинты, требующие только авторизации
  const authEndpoints = results.filter(r => r.status === 'AUTH_REQUIRED');
  if (authEndpoints.length > 0) {
    console.log(`\n🔒 ТРЕБУЮТ АВТОРИЗАЦИИ (${authEndpoints.length}):`);
    authEndpoints.forEach(endpoint => {
      console.log(`   ${endpoint.method} ${endpoint.path}`);
    });
  }
  
  // Успешные эндпоинты
  const successEndpoints = results.filter(r => r.status === 'SUCCESS');
  if (successEndpoints.length > 0) {
    console.log(`\n✅ РАБОТАЮТ КОРРЕКТНО (${successEndpoints.length}):`);
    successEndpoints.forEach(endpoint => {
      console.log(`   ${endpoint.method} ${endpoint.path} - ${endpoint.hasStandardFormat ? 'Стандартный формат' : 'Нестандартный формат'}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  console.log('='.repeat(60));
  
  return results;
}

// Запускаем тестирование, если файл выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullTest().catch(console.error);
}

export { runFullTest, testEndpoint, criticalEndpoints };