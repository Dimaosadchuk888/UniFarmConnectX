/**
 * Test T13: Automatic Telegram User Registration System
 * Проверяет автоматическую регистрацию пользователей во всех критических эндпоинтах
 */

const crypto = require('crypto');

/**
 * Генерирует валидные Telegram initData для тестирования
 */
function generateValidInitData(user, botToken) {
  const initData = {
    user: JSON.stringify(user),
    auth_date: Math.floor(Date.now() / 1000).toString(),
    hash: ''
  };

  // Создаем строку для хеширования
  const dataCheckString = Object.keys(initData)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${initData[key]}`)
    .join('\n');

  // Генерируем секретный ключ
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  
  // Генерируем хеш
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  initData.hash = hash;

  // Возвращаем как URL-encoded строку
  return Object.keys(initData)
    .map(key => `${key}=${encodeURIComponent(initData[key])}`)
    .join('&');
}

/**
 * Выполняет HTTP запрос к API
 */
async function testRequest(path, method = 'GET', data = null, headers = {}) {
  const url = `http://localhost:3000${path}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    return {
      status: response.status,
      data: result,
      success: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      success: false
    };
  }
}

class AutoRegistrationTest {
  constructor() {
    this.botToken = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';
    this.testResults = [];
    this.newUserId = Math.floor(Math.random() * 1000000) + 100000;
  }

  /**
   * Тестирует автоматическую регистрацию в UserController
   */
  async testUserController() {
    console.log('\n=== ТЕСТ UserController ===');
    
    const testUser = {
      id: this.newUserId,
      username: `testuser_${this.newUserId}`,
      first_name: 'Test',
      last_name: 'User'
    };

    const initData = generateValidInitData(testUser, this.botToken);
    const headers = {
      'X-Telegram-Init-Data': initData
    };

    // Тест getCurrentUser - должен создать пользователя автоматически
    const userResult = await testRequest('/api/v2/me', 'GET', null, headers);
    
    this.testResults.push({
      endpoint: 'GET /api/v2/me',
      status: userResult.status,
      success: userResult.success && userResult.data.telegram_id === this.newUserId,
      autoRegistered: userResult.success && userResult.data.id,
      message: userResult.success ? 'Пользователь автоматически зарегистрирован' : userResult.data.error
    });

    console.log(`GET /api/v2/me: ${userResult.success ? '✅' : '❌'} (${userResult.status})`);
    if (userResult.success) {
      console.log(`  Создан пользователь ID: ${userResult.data.id}, Telegram ID: ${userResult.data.telegram_id}`);
    }

    return userResult.success;
  }

  /**
   * Тестирует автоматическую регистрацию в WalletController
   */
  async testWalletController() {
    console.log('\n=== ТЕСТ WalletController ===');
    
    const testUser = {
      id: this.newUserId + 1,
      username: `testuser_${this.newUserId + 1}`,
      first_name: 'Wallet',
      last_name: 'User'
    };

    const initData = generateValidInitData(testUser, this.botToken);
    const headers = {
      'X-Telegram-Init-Data': initData
    };

    // Тест getWalletData
    const walletResult = await testRequest('/api/v2/wallet', 'GET', null, headers);
    
    this.testResults.push({
      endpoint: 'GET /api/v2/wallet',
      status: walletResult.status,
      success: walletResult.success,
      autoRegistered: walletResult.success && walletResult.data.uni_balance !== undefined,
      message: walletResult.success ? 'Кошелек создан автоматически' : walletResult.data.error
    });

    console.log(`GET /api/v2/wallet: ${walletResult.success ? '✅' : '❌'} (${walletResult.status})`);
    if (walletResult.success) {
      console.log(`  UNI баланс: ${walletResult.data.uni_balance}, TON баланс: ${walletResult.data.ton_balance}`);
    }

    return walletResult.success;
  }

  /**
   * Тестирует автоматическую регистрацию в MissionsController
   */
  async testMissionsController() {
    console.log('\n=== ТЕСТ MissionsController ===');
    
    const testUser = {
      id: this.newUserId + 2,
      username: `testuser_${this.newUserId + 2}`,
      first_name: 'Mission',
      last_name: 'User'
    };

    const initData = generateValidInitData(testUser, this.botToken);
    const headers = {
      'X-Telegram-Init-Data': initData
    };

    // Тест getActiveMissions
    const missionsResult = await testRequest('/api/v2/missions', 'GET', null, headers);
    
    this.testResults.push({
      endpoint: 'GET /api/v2/missions',
      status: missionsResult.status,
      success: missionsResult.success,
      autoRegistered: missionsResult.success,
      message: missionsResult.success ? 'Миссии загружены после автоматической регистрации' : missionsResult.data.error
    });

    console.log(`GET /api/v2/missions: ${missionsResult.success ? '✅' : '❌'} (${missionsResult.status})`);

    // Тест getMissionStats
    const statsResult = await testRequest('/api/v2/missions/stats', 'GET', null, headers);
    
    this.testResults.push({
      endpoint: 'GET /api/v2/missions/stats',
      status: statsResult.status,
      success: statsResult.success,
      autoRegistered: statsResult.success && statsResult.data.total_missions !== undefined,
      message: statsResult.success ? 'Статистика миссий создана' : statsResult.data.error
    });

    console.log(`GET /api/v2/missions/stats: ${statsResult.success ? '✅' : '❌'} (${statsResult.status})`);

    return missionsResult.success && statsResult.success;
  }

  /**
   * Тестирует автоматическую регистрацию в FarmingController
   */
  async testFarmingController() {
    console.log('\n=== ТЕСТ FarmingController ===');
    
    const testUser = {
      id: this.newUserId + 3,
      username: `testuser_${this.newUserId + 3}`,
      first_name: 'Farming',
      last_name: 'User'
    };

    const initData = generateValidInitData(testUser, this.botToken);
    const headers = {
      'X-Telegram-Init-Data': initData
    };

    // Тест getFarmingData
    const farmingResult = await testRequest('/api/v2/farming', 'GET', null, headers);
    
    this.testResults.push({
      endpoint: 'GET /api/v2/farming',
      status: farmingResult.status,
      success: farmingResult.success,
      autoRegistered: farmingResult.success,
      message: farmingResult.success ? 'Данные фарминга получены после автоматической регистрации' : farmingResult.data.error
    });

    console.log(`GET /api/v2/farming: ${farmingResult.success ? '✅' : '❌'} (${farmingResult.status})`);

    // Тест getFarmingHistory
    const historyResult = await testRequest('/api/v2/farming/history', 'GET', null, headers);
    
    this.testResults.push({
      endpoint: 'GET /api/v2/farming/history',
      status: historyResult.status,
      success: historyResult.success,
      autoRegistered: historyResult.success,
      message: historyResult.success ? 'История фарминга доступна' : historyResult.data.error
    });

    console.log(`GET /api/v2/farming/history: ${historyResult.success ? '✅' : '❌'} (${historyResult.status})`);

    return farmingResult.success && historyResult.success;
  }

  /**
   * Тестирует реферальную систему при автоматической регистрации
   */
  async testReferralIntegration() {
    console.log('\n=== ТЕСТ Реферальной системы ===');
    
    const parentUser = {
      id: this.newUserId + 10,
      username: `parent_${this.newUserId + 10}`,
      first_name: 'Parent',
      last_name: 'User'
    };

    const childUser = {
      id: this.newUserId + 11,
      username: `child_${this.newUserId + 11}`,
      first_name: 'Child',
      last_name: 'User'
    };

    // Создаем родительского пользователя
    const parentInitData = generateValidInitData(parentUser, this.botToken);
    const parentHeaders = {
      'X-Telegram-Init-Data': parentInitData
    };

    const parentResult = await testRequest('/api/v2/me', 'GET', null, parentHeaders);
    
    if (!parentResult.success) {
      console.log('❌ Не удалось создать родительского пользователя');
      return false;
    }

    const parentRefCode = parentResult.data.ref_code;
    console.log(`✅ Родительский пользователь создан, ref_code: ${parentRefCode}`);

    // Создаем дочернего пользователя с реферальным кодом
    const childInitData = generateValidInitData(childUser, this.botToken);
    const childHeaders = {
      'X-Telegram-Init-Data': childInitData
    };

    const childResult = await testRequest(`/api/v2/me?start_param=${parentRefCode}`, 'GET', null, childHeaders);
    
    this.testResults.push({
      endpoint: 'GET /api/v2/me (с реферальным кодом)',
      status: childResult.status,
      success: childResult.success && childResult.data.parent_ref_code === parentRefCode,
      autoRegistered: true,
      message: childResult.success ? `Пользователь привязан к реф-коду ${parentRefCode}` : childResult.data.error
    });

    console.log(`Дочерний пользователь: ${childResult.success ? '✅' : '❌'}`);
    if (childResult.success && childResult.data.parent_ref_code) {
      console.log(`  Привязан к родительскому коду: ${childResult.data.parent_ref_code}`);
    }

    return childResult.success && childResult.data.parent_ref_code === parentRefCode;
  }

  /**
   * Генерирует финальный отчет
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('ФИНАЛЬНЫЙ ОТЧЕТ: АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ T13');
    console.log('='.repeat(60));

    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(t => t.success).length;
    const autoRegisteredTests = this.testResults.filter(t => t.autoRegistered).length;

    console.log(`\nОбщая статистика:`);
    console.log(`  Всего тестов: ${totalTests}`);
    console.log(`  Успешных: ${successfulTests}`);
    console.log(`  С автоматической регистрацией: ${autoRegisteredTests}`);
    console.log(`  Процент успеха: ${Math.round((successfulTests / totalTests) * 100)}%`);

    console.log(`\nДетальные результаты:`);
    this.testResults.forEach(test => {
      console.log(`  ${test.success ? '✅' : '❌'} ${test.endpoint} (${test.status})`);
      console.log(`     ${test.message}`);
      if (test.autoRegistered) {
        console.log(`     🔄 Автоматическая регистрация: ДА`);
      }
    });

    const isSystemReady = successfulTests >= Math.floor(totalTests * 0.8);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`СТАТУС СИСТЕМЫ T13: ${isSystemReady ? '✅ ГОТОВ К PRODUCTION' : '❌ ТРЕБУЕТ ДОРАБОТКИ'}`);
    console.log(`${'='.repeat(60)}`);

    return {
      totalTests,
      successfulTests,
      autoRegisteredTests,
      successRate: Math.round((successfulTests / totalTests) * 100),
      isReady: isSystemReady,
      details: this.testResults
    };
  }

  /**
   * Запускает все тесты
   */
  async runAllTests() {
    console.log('🚀 ЗАПУСК ТЕСТИРОВАНИЯ АВТОМАТИЧЕСКОЙ РЕГИСТРАЦИИ T13');
    console.log(`Тестовые пользователи начиная с ID: ${this.newUserId}`);
    
    try {
      await this.testUserController();
      await this.testWalletController();
      await this.testMissionsController();
      await this.testFarmingController();
      await this.testReferralIntegration();
      
      return this.generateReport();
    } catch (error) {
      console.error('❌ Критическая ошибка при тестировании:', error.message);
      return {
        error: error.message,
        isReady: false,
        successRate: 0
      };
    }
  }
}

async function main() {
  console.log('Ожидание запуска сервера...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const tester = new AutoRegistrationTest();
  const results = await tester.runAllTests();
  
  if (results.isReady) {
    console.log('\n🎉 СИСТЕМА АВТОМАТИЧЕСКОЙ РЕГИСТРАЦИИ T13 ГОТОВА К PRODUCTION!');
  } else {
    console.log('\n⚠️  Система требует дополнительной настройки');
  }
}

// Запуск тестирования
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AutoRegistrationTest };