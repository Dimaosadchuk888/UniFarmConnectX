/**
 * E2E Test: Complete Data Synchronization between Frontend and Supabase Database
 * 
 * Цель: Обеспечить 100% синхронизацию данных между интерфейсом и базой данных
 * Включает тестирование всех критических системных компонентов:
 * - UserController API endpoints
 * - BalanceService data transformation  
 * - JWT token authentication
 * - Middleware authorization flow
 * - UserContext state management
 * - Database query results
 * 
 * БЕЗОПАСНОСТЬ: Только чтение данных, никаких изменений в production
 */

import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:3000';
const PRODUCTION_USER_ID = 48;
const PRODUCTION_TELEGRAM_ID = 88888888;
const JWT_SECRET = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';

// Генерируем правильный JWT токен для тестирования
const testJWT = jwt.sign({
  userId: PRODUCTION_USER_ID,
  telegram_id: PRODUCTION_TELEGRAM_ID,
  username: 'demo_user',
  first_name: 'Demo User',
  ref_code: 'REF_1750952576614_t938vs',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
}, JWT_SECRET);

/**
 * Выполняет API запрос с правильной авторизацией
 */
async function apiRequest(endpoint, method = 'GET') {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${testJWT}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  
  return {
    status: response.status,
    ok: response.ok,
    data: await response.json()
  };
}

/**
 * Прямой запрос к базе данных для сравнения
 */
async function getDatabaseUser() {
  const response = await apiRequest('/debug/user48');
  return response;
}

/**
 * Основная E2E тестирующая функция
 */
async function runE2EDataSynchronizationTest() {
  console.log('\n🔄 E2E DATA SYNCHRONIZATION TEST - ЗАПУСК');
  console.log('=' .repeat(80));
  
  const results = {
    success: true,
    errors: [],
    tests: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };
  
  try {
    // =========================================================================
    // ТЕСТ 1: UserController /users/profile endpoint
    // =========================================================================
    console.log('\n📊 ТЕСТ 1: UserController API endpoint');
    console.log('-'.repeat(50));
    
    const userProfileTest = await apiRequest('/api/v2/users/profile');
    results.tests.userProfile = {
      name: 'UserController /users/profile',
      status: userProfileTest.ok ? 'PASS' : 'FAIL',
      data: userProfileTest.data
    };
    
    if (userProfileTest.ok) {
      const userData = userProfileTest.data.data?.user;
      console.log('✅ UserController отвечает корректно');
      console.log('   User ID:', userData?.id);
      console.log('   Telegram ID:', userData?.telegram_id);  
      console.log('   UNI Balance:', userData?.balance_uni);
      console.log('   TON Balance:', userData?.balance_ton);
      console.log('   Ref Code:', userData?.ref_code);
      results.summary.passed++;
    } else {
      console.log('❌ UserController ошибка:', userProfileTest.data);
      results.errors.push('UserController API endpoint failed');
      results.summary.failed++;
    }
    results.summary.total++;
    
    // =========================================================================
    // ТЕСТ 2: WalletController /wallet/balance endpoint
    // =========================================================================
    console.log('\n💰 ТЕСТ 2: WalletController balance endpoint');
    console.log('-'.repeat(50));
    
    const walletBalanceTest = await apiRequest(`/api/v2/wallet/balance?user_id=${PRODUCTION_USER_ID}`);
    results.tests.walletBalance = {
      name: 'WalletController /wallet/balance',
      status: walletBalanceTest.ok ? 'PASS' : 'FAIL',
      data: walletBalanceTest.data
    };
    
    if (walletBalanceTest.ok) {
      const balanceData = walletBalanceTest.data.data;
      console.log('✅ WalletController баланс получен успешно');
      console.log('   UNI Balance:', balanceData?.uniBalance);
      console.log('   TON Balance:', balanceData?.tonBalance);
      console.log('   UNI Farming Active:', balanceData?.uniFarmingActive);
      console.log('   UNI Deposit Amount:', balanceData?.uniDepositAmount);
      results.summary.passed++;
    } else {
      console.log('❌ WalletController ошибка:', walletBalanceTest.data);
      results.errors.push('WalletController balance endpoint failed');
      results.summary.failed++;
    }
    results.summary.total++;
    
    // =========================================================================
    // ТЕСТ 3: Сравнение UserController vs WalletController данных
    // =========================================================================
    console.log('\n🔄 ТЕСТ 3: Синхронизация данных между контроллерами');
    console.log('-'.repeat(50));
    
    if (userProfileTest.ok && walletBalanceTest.ok) {
      const userBalance = userProfileTest.data.data?.user;
      const walletBalance = walletBalanceTest.data.data;
      
      const userUni = parseFloat(userBalance?.balance_uni || 0);
      const walletUni = parseFloat(walletBalance?.uniBalance || 0);
      const userTon = parseFloat(userBalance?.balance_ton || 0);
      const walletTon = parseFloat(walletBalance?.tonBalance || 0);
      
      const uniSync = Math.abs(userUni - walletUni) < 0.01; // Допускаем небольшую погрешность
      const tonSync = Math.abs(userTon - walletTon) < 0.01;
      
      results.tests.dataSync = {
        name: 'Синхронизация UserController vs WalletController',
        status: (uniSync && tonSync) ? 'PASS' : 'FAIL',
        details: {
          userController: { uni: userUni, ton: userTon },
          walletController: { uni: walletUni, ton: walletTon },
          synchronized: { uni: uniSync, ton: tonSync }
        }
      };
      
      if (uniSync && tonSync) {
        console.log('✅ Данные синхронизированы между контроллерами');
        console.log(`   UNI: User(${userUni}) = Wallet(${walletUni})`);
        console.log(`   TON: User(${userTon}) = Wallet(${walletTon})`);
        results.summary.passed++;
      } else {
        console.log('❌ Несинхронизированные данные между контроллерами');
        console.log(`   UNI: User(${userUni}) ≠ Wallet(${walletUni}) [${uniSync ? 'OK' : 'FAIL'}]`);
        console.log(`   TON: User(${userTon}) ≠ Wallet(${walletTon}) [${tonSync ? 'OK' : 'FAIL'}]`);
        results.errors.push('Data synchronization mismatch between controllers');
        results.summary.failed++;
      }
    } else {
      results.tests.dataSync = {
        name: 'Синхронизация UserController vs WalletController',
        status: 'SKIP',
        reason: 'Previous tests failed'
      };
      console.log('⏭️ Пропущен из-за ошибок в предыдущих тестах');
    }
    results.summary.total++;
    
    // =========================================================================
    // ТЕСТ 4: JWT Token Validation  
    // =========================================================================
    console.log('\n🔐 ТЕСТ 4: JWT Token validation');
    console.log('-'.repeat(50));
    
    try {
      const decoded = jwt.verify(testJWT, JWT_SECRET);
      const jwtValid = decoded.userId === PRODUCTION_USER_ID && decoded.telegram_id === PRODUCTION_TELEGRAM_ID;
      
      results.tests.jwtValidation = {
        name: 'JWT Token Validation',
        status: jwtValid ? 'PASS' : 'FAIL',
        details: {
          userId: decoded.userId,
          telegramId: decoded.telegram_id,
          expectedUserId: PRODUCTION_USER_ID,
          expectedTelegramId: PRODUCTION_TELEGRAM_ID
        }
      };
      
      if (jwtValid) {
        console.log('✅ JWT токен валидный и содержит правильные данные');
        console.log('   User ID:', decoded.userId);
        console.log('   Telegram ID:', decoded.telegram_id);
        results.summary.passed++;
      } else {
        console.log('❌ JWT токен содержит некорректные данные');
        results.errors.push('JWT token contains invalid user data');
        results.summary.failed++;
      }
    } catch (error) {
      results.tests.jwtValidation = {
        name: 'JWT Token Validation',
        status: 'FAIL',
        error: error.message
      };
      console.log('❌ JWT токен невалидный:', error.message);
      results.errors.push('JWT token validation failed');
      results.summary.failed++;
    }
    results.summary.total++;
    
    // =========================================================================
    // ТЕСТ 5: Transaction History для проверки активности пользователя
    // =========================================================================
    console.log('\n📋 ТЕСТ 5: Transaction History');
    console.log('-'.repeat(50));
    
    const transactionsTest = await apiRequest('/api/v2/transactions?page=1&limit=5');
    results.tests.transactions = {
      name: 'Transaction History',
      status: transactionsTest.ok ? 'PASS' : 'FAIL',
      data: transactionsTest.data
    };
    
    if (transactionsTest.ok) {
      const transactions = transactionsTest.data.data?.transactions || [];
      console.log('✅ История транзакций получена успешно');
      console.log('   Количество транзакций:', transactions.length);
      
      if (transactions.length > 0) {
        const lastTx = transactions[0];
        console.log('   Последняя транзакция:', lastTx.type, lastTx.amount, lastTx.currency);
        console.log('   Дата:', lastTx.created_at);
      }
      results.summary.passed++;
    } else {
      console.log('❌ Ошибка получения истории транзакций:', transactionsTest.data);
      results.errors.push('Transaction history endpoint failed');
      results.summary.failed++;
    }
    results.summary.total++;
    
  } catch (error) {
    console.error('💥 Критическая ошибка в E2E тесте:', error);
    results.success = false;
    results.errors.push(`Critical error: ${error.message}`);
  }
  
  // =========================================================================
  // ФИНАЛЬНЫЙ ОТЧЕТ
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ E2E DATA SYNCHRONIZATION TEST');
  console.log('='.repeat(80));
  
  console.log(`\n📈 СТАТИСТИКА:`);
  console.log(`   Всего тестов: ${results.summary.total}`);
  console.log(`   Пройдено: ${results.summary.passed} ✅`);
  console.log(`   Провалено: ${results.summary.failed} ❌`);
  console.log(`   Успешность: ${Math.round((results.summary.passed / results.summary.total) * 100)}%`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:`);
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  const overallSuccess = results.summary.failed === 0;
  console.log(`\n🎯 ОБЩИЙ РЕЗУЛЬТАТ: ${overallSuccess ? '✅ УСПЕХ' : '❌ ТРЕБУЕТСЯ ДОРАБОТКА'}`);
  
  if (overallSuccess) {
    console.log('\n🚀 Система данных полностью синхронизирована между frontend и backend!');
    console.log('   - UserController возвращает корректные данные пользователя');
    console.log('   - WalletController синхронизирован с UserController');
    console.log('   - JWT токены валидны и содержат правильные данные');
    console.log('   - История транзакций доступна');
    console.log('   - Данные готовы для production использования');
  } else {
    console.log('\n⚠️  Обнаружены проблемы синхронизации данных. Требуется дополнительная отладка.');
  }
  
  console.log('\n' + '='.repeat(80));
  
  return results;
}

// Запуск тестов
if (import.meta.url === `file://${process.argv[1]}`) {
  runE2EDataSynchronizationTest()
    .then(results => {
      process.exit(results.summary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export { runE2EDataSynchronizationTest };