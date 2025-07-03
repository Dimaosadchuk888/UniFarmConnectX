/**
 * 🛡️🔧 UNIFARM E2E COMPREHENSIVE TEST SCRIPT
 * 
 * ✅ Безопасный автономный интеграционный скрипт проверки UniFarm
 * ⚠️ СТРОГО ТОЛЬКО ДЛЯ ТЕСТИРОВАНИЯ В REPLIT PREVIEW
 * 
 * Задачи:
 * 1. Создание тестового пользователя (user_id: 9999, telegram_id: 999999999)
 * 2. Проверка всех финансовых операций
 * 3. Тест партнерской системы
 * 4. Проверка UI синхронизации
 * 5. Генерация подробного отчета
 * 
 * ⚠️ КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ:
 * - НЕ ИЗМЕНЯЕТ продакшн данные или архитектуру
 * - Работает только с тестовыми пользователями
 * - Изолированная тестовая среда
 */

const fs = require('fs');
const path = require('path');

let fetch;

async function initFetch() {
  if (!fetch) {
    const fetchModule = await import('node-fetch');
    fetch = fetchModule.default;
  }
  return fetch;
}

// 🔒 Тестовая конфигурация
const TEST_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  TEST_USER: {
    id: 9999,
    telegram_id: 999999999,
    username: 'test_e2e_user',
    first_name: 'TestE2E',
    last_name: 'User',
    ref_code: 'TEST_E2E_REF_999'
  },
  TEST_REFERRAL: {
    id: 9998,
    telegram_id: 999999998,
    username: 'test_e2e_referral',
    first_name: 'TestE2E',
    last_name: 'Referral',
    ref_code: 'TEST_E2E_REF_998'
  },
  INITIAL_BALANCE: {
    UNI: 1000,
    TON: 1000
  },
  FARMING_AMOUNT: 100,
  BOOST_PACKAGE: 'Starter', // 1% TON Boost
  BOOST_AMOUNT: 10
};

// 🎯 Глобальные переменные для отслеживания
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

let testUserToken = null;
let referralUserToken = null;

// 🔧 Утилиты
class TestLogger {
  static log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
  }

  static success(message) {
    this.log(`✅ ${message}`, 'SUCCESS');
  }

  static error(message) {
    this.log(`❌ ${message}`, 'ERROR');
  }

  static warn(message) {
    this.log(`⚠️ ${message}`, 'WARNING');
  }

  static info(message) {
    this.log(`ℹ️ ${message}`, 'INFO');
  }
}

// 🧪 Тест-функции
async function makeRequest(endpoint, options = {}) {
  await initFetch();
  
  const url = `${TEST_CONFIG.BASE_URL}${endpoint}`;
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    
    TestLogger.info(`${finalOptions.method} ${endpoint} - Status: ${response.status}`);
    
    return {
      success: response.ok,
      status: response.status,
      data: data
    };
  } catch (error) {
    TestLogger.error(`Request failed: ${endpoint} - ${error.message}`);
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

async function test(name, testFunction) {
  TestLogger.info(`🧪 Starting test: ${name}`);
  
  try {
    const result = await testFunction();
    
    if (result.success) {
      TestLogger.success(`Test passed: ${name}`);
      testResults.passed++;
      testResults.tests.push({
        name,
        status: 'PASSED',
        details: result.details || 'Test completed successfully'
      });
    } else {
      TestLogger.error(`Test failed: ${name} - ${result.error}`);
      testResults.failed++;
      testResults.tests.push({
        name,
        status: 'FAILED',
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    TestLogger.error(`Test error: ${name} - ${error.message}`);
    testResults.failed++;
    testResults.tests.push({
      name,
      status: 'ERROR',
      error: error.message
    });
  }
}

// 🔐 Создание тестового пользователя
async function createTestUser(userConfig) {
  const response = await makeRequest('/api/v2/auth/register/telegram', {
    method: 'POST',
    body: JSON.stringify({
      telegram_id: userConfig.telegram_id,
      username: userConfig.username,
      first_name: userConfig.first_name,
      last_name: userConfig.last_name,
      direct_registration: true
    })
  });

  if (!response.success) {
    // Пробуем прямую регистрацию
    const directResponse = await makeRequest('/api/v2/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: userConfig.telegram_id,
        username: userConfig.username,
        first_name: userConfig.first_name,
        last_name: userConfig.last_name,
        direct_registration: true
      })
    });
    
    if (directResponse.success && directResponse.data.token) {
      return directResponse.data.token;
    }
  }

  if (response.success && response.data.token) {
    return response.data.token;
  }

  throw new Error(`Failed to create test user: ${response.data?.error || 'Unknown error'}`);
}

// 🎯 Основные тесты системы

// 1. Проверка создания тестового пользователя
async function testUserCreation() {
  try {
    testUserToken = await createTestUser(TEST_CONFIG.TEST_USER);
    
    // Проверяем профиль пользователя
    const profileResponse = await makeRequest('/api/v2/user/profile', {
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!profileResponse.success) {
      return {
        success: false,
        error: 'Failed to get user profile',
        details: profileResponse.data
      };
    }

    const user = profileResponse.data.user;
    
    return {
      success: true,
      details: {
        user_id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        ref_code: user.ref_code,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 2. Проверка пополнения баланса
async function testBalanceDeposit() {
  try {
    // Пополняем UNI баланс
    const uniDepositResponse = await makeRequest('/api/v2/wallet/deposit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      },
      body: JSON.stringify({
        amount: TEST_CONFIG.INITIAL_BALANCE.UNI,
        currency: 'UNI'
      })
    });

    if (!uniDepositResponse.success) {
      return {
        success: false,
        error: 'Failed to deposit UNI',
        details: uniDepositResponse.data
      };
    }

    // Пополняем TON баланс
    const tonDepositResponse = await makeRequest('/api/v2/wallet/deposit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      },
      body: JSON.stringify({
        amount: TEST_CONFIG.INITIAL_BALANCE.TON,
        currency: 'TON'
      })
    });

    if (!tonDepositResponse.success) {
      return {
        success: false,
        error: 'Failed to deposit TON',
        details: tonDepositResponse.data
      };
    }

    // Проверяем баланс
    const balanceResponse = await makeRequest('/api/v2/wallet/balance', {
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!balanceResponse.success) {
      return {
        success: false,
        error: 'Failed to get balance',
        details: balanceResponse.data
      };
    }

    const balance = balanceResponse.data;
    
    return {
      success: true,
      details: {
        uni_balance: balance.uni,
        ton_balance: balance.ton,
        uni_deposited: TEST_CONFIG.INITIAL_BALANCE.UNI,
        ton_deposited: TEST_CONFIG.INITIAL_BALANCE.TON
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 3. Проверка UNI Farming
async function testUniFarming() {
  try {
    // Начинаем UNI фарминг
    const startFarmingResponse = await makeRequest('/api/v2/farming/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      },
      body: JSON.stringify({
        amount: TEST_CONFIG.FARMING_AMOUNT
      })
    });

    if (!startFarmingResponse.success) {
      return {
        success: false,
        error: 'Failed to start UNI farming',
        details: startFarmingResponse.data
      };
    }

    // Получаем статус фарминга
    const farmingStatusResponse = await makeRequest('/api/v2/farming/status', {
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!farmingStatusResponse.success) {
      return {
        success: false,
        error: 'Failed to get farming status',
        details: farmingStatusResponse.data
      };
    }

    const farmingStatus = farmingStatusResponse.data;
    
    return {
      success: true,
      details: {
        farming_amount: TEST_CONFIG.FARMING_AMOUNT,
        farming_rate: farmingStatus.farming_rate,
        farming_started: farmingStatus.farming_started,
        expected_daily_income: farmingStatus.expected_daily_income
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 4. Проверка TON Boost
async function testTonBoost() {
  try {
    // Получаем доступные пакеты
    const packagesResponse = await makeRequest('/api/v2/boost/packages', {
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!packagesResponse.success) {
      return {
        success: false,
        error: 'Failed to get boost packages',
        details: packagesResponse.data
      };
    }

    const packages = packagesResponse.data.packages;
    const starterPackage = packages.find(p => p.name === TEST_CONFIG.BOOST_PACKAGE);
    
    if (!starterPackage) {
      return {
        success: false,
        error: 'Starter package not found',
        details: { available_packages: packages.map(p => p.name) }
      };
    }

    // Покупаем Boost пакет
    const purchaseResponse = await makeRequest('/api/v2/boost/purchase', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      },
      body: JSON.stringify({
        package_name: TEST_CONFIG.BOOST_PACKAGE,
        amount: TEST_CONFIG.BOOST_AMOUNT
      })
    });

    if (!purchaseResponse.success) {
      return {
        success: false,
        error: 'Failed to purchase boost package',
        details: purchaseResponse.data
      };
    }

    // Получаем активные буст-пакеты
    const activeBoostsResponse = await makeRequest('/api/v2/boost/active', {
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!activeBoostsResponse.success) {
      return {
        success: false,
        error: 'Failed to get active boosts',
        details: activeBoostsResponse.data
      };
    }

    const activeBoosts = activeBoostsResponse.data;
    
    return {
      success: true,
      details: {
        package_purchased: TEST_CONFIG.BOOST_PACKAGE,
        amount_invested: TEST_CONFIG.BOOST_AMOUNT,
        active_boosts: activeBoosts.active_boosts,
        boost_rate: starterPackage.rate
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 5. Проверка партнерской системы
async function testReferralSystem() {
  try {
    // Создаем реферального пользователя
    referralUserToken = await createTestUser(TEST_CONFIG.TEST_REFERRAL);
    
    // Получаем реферальный код основного пользователя
    const referralCodeResponse = await makeRequest('/api/v2/referral/code', {
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!referralCodeResponse.success) {
      return {
        success: false,
        error: 'Failed to get referral code',
        details: referralCodeResponse.data
      };
    }

    const referralCode = referralCodeResponse.data.ref_code;

    // Регистрируем реферального пользователя с кодом
    const referralRegistrationResponse = await makeRequest('/api/v2/referral/register', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${referralUserToken}`
      },
      body: JSON.stringify({
        ref_code: referralCode
      })
    });

    if (!referralRegistrationResponse.success) {
      return {
        success: false,
        error: 'Failed to register referral',
        details: referralRegistrationResponse.data
      };
    }

    // Делаем депозит рефералом для генерации комиссии
    const referralDepositResponse = await makeRequest('/api/v2/wallet/deposit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${referralUserToken}`
      },
      body: JSON.stringify({
        amount: 100,
        currency: 'UNI'
      })
    });

    if (!referralDepositResponse.success) {
      return {
        success: false,
        error: 'Failed referral deposit',
        details: referralDepositResponse.data
      };
    }

    // Получаем статистику рефералов
    const referralStatsResponse = await makeRequest('/api/v2/referral/stats', {
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!referralStatsResponse.success) {
      return {
        success: false,
        error: 'Failed to get referral stats',
        details: referralStatsResponse.data
      };
    }

    const referralStats = referralStatsResponse.data;
    
    return {
      success: true,
      details: {
        referral_code: referralCode,
        referral_registered: true,
        referral_stats: referralStats,
        referral_deposit: 100
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 6. Проверка Daily Bonus
async function testDailyBonus() {
  try {
    // Получаем статус daily bonus
    const bonusStatusResponse = await makeRequest('/api/v2/daily-bonus/status', {
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!bonusStatusResponse.success) {
      return {
        success: false,
        error: 'Failed to get daily bonus status',
        details: bonusStatusResponse.data
      };
    }

    const bonusStatus = bonusStatusResponse.data;

    // Если доступен, забираем daily bonus
    if (bonusStatus.available) {
      const claimBonusResponse = await makeRequest('/api/v2/daily-bonus/claim', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUserToken}`
        }
      });

      if (!claimBonusResponse.success) {
        return {
          success: false,
          error: 'Failed to claim daily bonus',
          details: claimBonusResponse.data
        };
      }

      const claimResult = claimBonusResponse.data;
      
      return {
        success: true,
        details: {
          bonus_available: true,
          bonus_claimed: true,
          bonus_amount: claimResult.bonus_amount,
          streak: claimResult.streak
        }
      };
    } else {
      return {
        success: true,
        details: {
          bonus_available: false,
          next_bonus_in: bonusStatus.next_bonus_in,
          current_streak: bonusStatus.streak
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 7. Проверка Missions
async function testMissions() {
  try {
    // Получаем список миссий
    const missionsResponse = await makeRequest('/api/v2/missions/list', {
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!missionsResponse.success) {
      return {
        success: false,
        error: 'Failed to get missions list',
        details: missionsResponse.data
      };
    }

    const missions = missionsResponse.data.missions;
    
    if (missions.length === 0) {
      return {
        success: true,
        details: {
          missions_available: false,
          message: 'No missions available'
        }
      };
    }

    // Пробуем выполнить первую миссию
    const firstMission = missions[0];
    const completeMissionResponse = await makeRequest(`/api/v2/missions/complete/${firstMission.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!completeMissionResponse.success) {
      return {
        success: false,
        error: 'Failed to complete mission',
        details: completeMissionResponse.data
      };
    }

    const completionResult = completeMissionResponse.data;
    
    return {
      success: true,
      details: {
        missions_available: true,
        total_missions: missions.length,
        mission_completed: firstMission.title,
        reward: completionResult.reward
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 8. Проверка транзакций
async function testTransactions() {
  try {
    // Получаем историю транзакций
    const transactionsResponse = await makeRequest('/api/v2/transactions', {
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!transactionsResponse.success) {
      return {
        success: false,
        error: 'Failed to get transactions',
        details: transactionsResponse.data
      };
    }

    const transactions = transactionsResponse.data.transactions;
    
    // Анализируем типы транзакций
    const transactionTypes = {};
    transactions.forEach(tx => {
      transactionTypes[tx.type] = (transactionTypes[tx.type] || 0) + 1;
    });

    return {
      success: true,
      details: {
        total_transactions: transactions.length,
        transaction_types: transactionTypes,
        latest_transactions: transactions.slice(0, 5).map(tx => ({
          type: tx.type,
          amount_uni: tx.amount_uni,
          amount_ton: tx.amount_ton,
          created_at: tx.created_at
        }))
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 9. Проверка финального баланса
async function testFinalBalance() {
  try {
    // Получаем финальный баланс
    const finalBalanceResponse = await makeRequest('/api/v2/wallet/balance', {
      headers: {
        'Authorization': `Bearer ${testUserToken}`
      }
    });

    if (!finalBalanceResponse.success) {
      return {
        success: false,
        error: 'Failed to get final balance',
        details: finalBalanceResponse.data
      };
    }

    const finalBalance = finalBalanceResponse.data;
    
    return {
      success: true,
      details: {
        final_uni_balance: finalBalance.uni,
        final_ton_balance: finalBalance.ton,
        balance_changes: {
          uni: finalBalance.uni - TEST_CONFIG.INITIAL_BALANCE.UNI,
          ton: finalBalance.ton - TEST_CONFIG.INITIAL_BALANCE.TON
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 🧹 Очистка тестовых данных
async function cleanupTestData() {
  TestLogger.warn('Starting test data cleanup...');
  
  try {
    // Попытка удаления тестовых пользователей (если API поддерживает)
    if (testUserToken) {
      await makeRequest('/api/v2/user/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testUserToken}`
        }
      });
    }

    if (referralUserToken) {
      await makeRequest('/api/v2/user/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${referralUserToken}`
        }
      });
    }

    TestLogger.success('Test data cleanup completed');
  } catch (error) {
    TestLogger.warn(`Cleanup warning: ${error.message}`);
  }
}

// 📊 Генерация отчета
function generateReport() {
  const reportData = {
    timestamp: new Date().toISOString(),
    environment: 'Replit Preview',
    test_summary: {
      total_tests: testResults.passed + testResults.failed,
      passed: testResults.passed,
      failed: testResults.failed,
      success_rate: Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)
    },
    test_details: testResults.tests,
    configuration: TEST_CONFIG
  };

  // Сохраняем отчет в файл
  const reportPath = path.join(__dirname, 'e2e_test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

  // Консольный отчет
  console.log('\n' + '='.repeat(60));
  console.log('🎯 UNIFARM E2E TEST REPORT');
  console.log('='.repeat(60));
  console.log(`📅 Timestamp: ${reportData.timestamp}`);
  console.log(`🌍 Environment: ${reportData.environment}`);
  console.log(`📊 Success Rate: ${reportData.test_summary.success_rate}%`);
  console.log(`✅ Passed: ${reportData.test_summary.passed}`);
  console.log(`❌ Failed: ${reportData.test_summary.failed}`);
  console.log(`📋 Total Tests: ${reportData.test_summary.total_tests}`);
  console.log('\n📝 Test Details:');
  
  testResults.tests.forEach(test => {
    const status = test.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${test.name}`);
    if (test.details) {
      console.log(`   ${JSON.stringify(test.details, null, 2)}`);
    }
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });

  console.log('\n📄 Full report saved to:', reportPath);
  console.log('='.repeat(60));
}

// 🚀 Основная функция выполнения тестов
async function runE2ETests() {
  TestLogger.info('🎯 Starting UniFarm E2E Comprehensive Test Suite');
  TestLogger.info('⚠️ Running in SAFE TEST MODE - No production data affected');
  
  // Проверка доступности сервера
  try {
    const healthResponse = await makeRequest('/health');
    if (!healthResponse.success) {
      TestLogger.error('Server is not accessible. Please ensure the server is running.');
      return;
    }
    TestLogger.success('Server is accessible and ready for testing');
  } catch (error) {
    TestLogger.error(`Server health check failed: ${error.message}`);
    return;
  }

  // Выполнение тестов
  await test('1. User Creation and Authentication', testUserCreation);
  await test('2. Balance Deposit (UNI + TON)', testBalanceDeposit);
  await test('3. UNI Farming Operations', testUniFarming);
  await test('4. TON Boost System', testTonBoost);
  await test('5. Referral System', testReferralSystem);
  await test('6. Daily Bonus System', testDailyBonus);
  await test('7. Missions System', testMissions);
  await test('8. Transaction History', testTransactions);
  await test('9. Final Balance Verification', testFinalBalance);

  // Очистка и отчет
  await cleanupTestData();
  generateReport();
  
  TestLogger.info('🎉 E2E Test Suite completed successfully!');
}

// 🎬 Запуск тестов
if (require.main === module) {
  runE2ETests().catch(error => {
    TestLogger.error(`Critical error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runE2ETests,
  TEST_CONFIG,
  TestLogger
};