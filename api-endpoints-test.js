/**
 * Автоматизированный тест всех API-эндпоинтов UniFarm
 * 
 * Этот скрипт проверяет работоспособность каждого API-эндпоинта и соответствие его ответов
 * стандартизированному формату { success: true/false, data/error: ... }
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// Базовый URL для API запросов
const BASE_URL = process.env.API_URL || 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev';

// Тестовые учетные данные
const TEST_USER = {
  id: 1,
  username: 'test_user',
  guest_id: 'test-guest-id',
  ref_code: 'TEST1234',
  balance_uni: 100,
  balance_ton: 1.5
};

// Результаты тестирования
const testResults = [];

/**
 * Выполняет API-запрос
 */
async function callApi(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`Выполняем ${method} запрос к ${url}`);
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return { status: response.status, data };
    } else {
      const text = await response.text();
      return { status: response.status, text };
    }
  } catch (error) {
    console.error(`Ошибка при запросе к ${url}:`, error.message);
    return { status: 500, error: error.message };
  }
}

/**
 * Регистрирует результат теста
 */
function recordTestResult(endpoint, method, status, isSuccess, isStandardized, notes = '') {
  testResults.push({
    endpoint,
    method,
    status,
    isSuccess,
    isStandardized,
    notes
  });
}

/**
 * Тестирует каждый API-эндпоинт
 */
async function testAllEndpoints() {
  console.log('🔍 Начинаем тестирование API эндпоинтов...\n');

  // 1. Тест базового API
  const healthCheck = await callApi('/api/test-json');
  recordTestResult('/api/test-json', 'GET', healthCheck.status, 
    healthCheck.status === 200, 
    healthCheck.data && typeof healthCheck.data.status === 'string',
    'Базовый проверочный эндпоинт');

  // 2. Проверка подключения к базе данных через системный статус
  const dbStatus = await callApi('/api/system/status');
  recordTestResult('/api/system/status', 'GET', dbStatus.status, 
    dbStatus.status === 200, 
    dbStatus.data && dbStatus.data.success === true,
    `Статус DB: ${dbStatus.data?.data?.database || 'неизвестно'}`);

  // 3. Тестирование API пользователей
  const userApi = await callApi(`/api/users/${TEST_USER.id}`);
  recordTestResult(`/api/users/${TEST_USER.id}`, 'GET', userApi.status, 
    userApi.status === 200, 
    userApi.data && (userApi.data.success === true || userApi.data.success === false),
    userApi.data?.success ? 'Пользователь найден' : 'Пользователь не найден');

  // 4. Тестирование API восстановления сессии
  const sessionRestore = await callApi('/api/session/restore', 'POST', { guest_id: TEST_USER.guest_id });
  recordTestResult('/api/session/restore', 'POST', sessionRestore.status, 
    sessionRestore.status === 200 || sessionRestore.status === 400, 
    sessionRestore.data && (sessionRestore.data.success === true || sessionRestore.data.success === false),
    sessionRestore.data?.success ? 'Сессия восстановлена' : 'Сессия не найдена');

  // 5. Тестирование API баланса кошелька
  const walletBalance = await callApi('/api/wallet/balance?user_id=1');
  recordTestResult('/api/wallet/balance', 'GET', walletBalance.status, 
    walletBalance.status === 200, 
    walletBalance.data && (walletBalance.data.success === true || walletBalance.data.success === false),
    `Баланс ${walletBalance.data?.success ? 'получен' : 'не получен'}`);

  // 6. Тестирование API транзакций пользователя
  const transactions = await callApi('/api/user/transactions?user_id=1');
  recordTestResult('/api/user/transactions', 'GET', transactions.status, 
    transactions.status === 200, 
    transactions.data && (transactions.data.success === true || transactions.data.success === false),
    `Транзакции ${transactions.data?.success ? 'получены' : 'не получены'}`);

  // 7. Тестирование API получения текущего пользователя
  const currentUser = await callApi('/api/me');
  recordTestResult('/api/me', 'GET', currentUser.status, 
    currentUser.status === 200 || currentUser.status === 401, 
    currentUser.data && (currentUser.data.success === true || currentUser.data.success === false),
    currentUser.data?.success ? 'Пользователь авторизован' : 'Пользователь не авторизован');

  // 8. Тестирование API реферальной системы
  const referrals = await callApi('/api/referrals?user_id=1');
  recordTestResult('/api/referrals', 'GET', referrals.status, 
    referrals.status === 200, 
    referrals.data && (referrals.data.success === true || referrals.data.success === false),
    `Рефералы ${referrals.data?.success ? 'получены' : 'не получены'}`);

  // 9. Тестирование API информации о фарминге UNI
  const uniFarming = await callApi('/api/uni-farming/info?user_id=1');
  recordTestResult('/api/uni-farming/info', 'GET', uniFarming.status, 
    uniFarming.status === 200, 
    uniFarming.data && (uniFarming.data.success === true || uniFarming.data.success === false),
    `Информация о фарминге UNI ${uniFarming.data?.success ? 'получена' : 'не получена'}`);

  // 10. Тестирование API активных бустов
  const activeBoosts = await callApi('/api/boosts/active?user_id=1');
  recordTestResult('/api/boosts/active', 'GET', activeBoosts.status, 
    activeBoosts.status === 200, 
    activeBoosts.data && (activeBoosts.data.success === true || activeBoosts.data.success === false),
    `Активные бусты ${activeBoosts.data?.success ? 'получены' : 'не получены'}`);

  // 11. Тестирование API ежедневного бонуса
  const dailyBonus = await callApi('/api/daily-bonus/status?user_id=1');
  recordTestResult('/api/daily-bonus/status', 'GET', dailyBonus.status, 
    dailyBonus.status === 200, 
    dailyBonus.data && (dailyBonus.data.success === true || dailyBonus.data.success === false),
    `Статус ежедневного бонуса ${dailyBonus.data?.success ? 'получен' : 'не получен'}`);

  // 12. Тестирование API доступных миссий
  const activeMissions = await callApi('/api/missions/active');
  recordTestResult('/api/missions/active', 'GET', activeMissions.status, 
    activeMissions.status === 200, 
    activeMissions.data && (activeMissions.data.success === true || activeMissions.data.success === false),
    `Активные миссии ${activeMissions.data?.success ? 'получены' : 'не получены'}`);

  // 13. Тестирование API миссий пользователя
  const userMissions = await callApi('/api/user_missions?user_id=1');
  recordTestResult('/api/user_missions', 'GET', userMissions.status, 
    userMissions.status === 200, 
    userMissions.data && (userMissions.data.success === true || userMissions.data.success === false),
    `Миссии пользователя ${userMissions.data?.success ? 'получены' : 'не получены'}`);

  console.log('\n✅ Тестирование API эндпоинтов завершено');
}

/**
 * Генерирует отчет о результатах тестирования
 */
function generateReport() {
  console.log('\n📊 Отчет о результатах тестирования API:');
  console.log('=============================================');
  
  let passedCount = 0;
  let failedCount = 0;
  
  testResults.forEach(result => {
    const statusSymbol = result.isSuccess ? '✅' : '❌';
    const standardizedSymbol = result.isStandardized ? '✓' : '✗';
    
    console.log(`${statusSymbol} ${result.method} ${result.endpoint} [${result.status}] [Стандарт API: ${standardizedSymbol}]`);
    console.log(`   ${result.notes}`);
    
    if (result.isSuccess && result.isStandardized) {
      passedCount++;
    } else {
      failedCount++;
    }
  });
  
  console.log('=============================================');
  console.log(`Итого: ${passedCount} успешно, ${failedCount} с ошибками`);
  console.log(`Общее соответствие: ${Math.round((passedCount / testResults.length) * 100)}%`);
  
  // Предоставляем рекомендации, если есть проблемы
  if (failedCount > 0) {
    provideRecommendations();
  }
}

/**
 * Анализирует проблемы и дает рекомендации по исправлению
 */
function provideRecommendations() {
  console.log('\n🛠️ Рекомендации по исправлению:');
  
  const failedEndpoints = testResults.filter(result => !result.isSuccess || !result.isStandardized);
  
  // Группируем по типам проблем
  const connectionIssues = failedEndpoints.filter(result => result.status >= 500);
  const authIssues = failedEndpoints.filter(result => result.status === 401 || result.status === 403);
  const standardIssues = failedEndpoints.filter(result => !result.isStandardized);
  const notFoundIssues = failedEndpoints.filter(result => result.status === 404);
  
  if (connectionIssues.length > 0) {
    console.log('1. Проблемы с подключением к базе данных:');
    console.log('   - Проверьте переменные окружения DATABASE_URL и другие переменные для подключения к БД');
    console.log('   - Убедитесь, что PostgreSQL запущен и доступен');
    console.log('   - Проверьте логи сервера на наличие ошибок подключения');
  }
  
  if (authIssues.length > 0) {
    console.log('2. Проблемы с аутентификацией:');
    console.log('   - Проверьте сессию пользователя и cookie');
    console.log('   - Убедитесь, что пользователь существует в базе данных');
  }
  
  if (standardIssues.length > 0) {
    console.log('3. Проблемы со стандартизацией API:');
    console.log('   - Следующие эндпоинты не соответствуют стандарту { success: true/false, data/error: ... }:');
    standardIssues.forEach(issue => {
      console.log(`     - ${issue.method} ${issue.endpoint}`);
    });
  }
  
  if (notFoundIssues.length > 0) {
    console.log('4. Отсутствующие эндпоинты:');
    console.log('   - Следующие эндпоинты не найдены (404):');
    notFoundIssues.forEach(issue => {
      console.log(`     - ${issue.method} ${issue.endpoint}`);
    });
    console.log('   - Проверьте маршрутизацию и регистрацию маршрутов в routes.ts');
  }
}

// Запускаем тестирование и генерируем отчет
testAllEndpoints()
  .then(() => {
    generateReport();
  })
  .catch(error => {
    console.error('Ошибка при тестировании API:', error);
  });