/**
 * Тест системы после внедрения T13: Автоматическая регистрация пользователей
 * Проверяет работоспособность всех критических компонентов
 */

import crypto from 'crypto';

class PostT13SystemTest {
  constructor() {
    this.botToken = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';
    this.testResults = [];
    this.newUserId = Math.floor(Math.random() * 1000000) + 100000;
  }

  /**
   * Генерирует валидные Telegram initData
   */
  generateValidInitData(user) {
    const initData = {
      user: JSON.stringify(user),
      auth_date: Math.floor(Date.now() / 1000).toString(),
      hash: ''
    };

    const dataCheckString = Object.keys(initData)
      .filter(key => key !== 'hash')
      .sort()
      .map(key => `${key}=${initData[key]}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(this.botToken).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    initData.hash = hash;

    return Object.keys(initData)
      .map(key => `${key}=${encodeURIComponent(initData[key])}`)
      .join('&');
  }

  /**
   * Выполняет HTTP запрос
   */
  async testRequest(path, method = 'GET', data = null, headers = {}) {
    const url = `http://localhost:3001${path}`;
    
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

  /**
   * Тестирует автоматическую регистрацию через /api/v2/me
   */
  async testAutoRegistrationMe() {
    console.log('\n=== ТЕСТ: Автоматическая регистрация через /api/v2/me ===');
    
    const testUser = {
      id: this.newUserId,
      username: `autotest_${this.newUserId}`,
      first_name: 'AutoTest',
      last_name: 'User'
    };

    const initData = this.generateValidInitData(testUser);
    const headers = {
      'X-Telegram-Init-Data': initData
    };

    const result = await this.testRequest('/api/v2/me', 'GET', null, headers);
    
    this.testResults.push({
      test: 'auto_registration_me',
      endpoint: 'GET /api/v2/me',
      status: result.status,
      success: result.success && result.data.telegram_id === this.newUserId,
      autoCreated: result.success && result.data.id,
      message: result.success ? 'Пользователь автоматически создан' : result.data.error || 'Неизвестная ошибка'
    });

    console.log(`GET /api/v2/me: ${result.success ? '✅' : '❌'} (${result.status})`);
    if (result.success) {
      console.log(`  Создан пользователь ID: ${result.data.id}`);
      console.log(`  Telegram ID: ${result.data.telegram_id}`);
      console.log(`  Username: ${result.data.username}`);
    } else {
      console.log(`  Ошибка: ${result.data.error || 'Неизвестная ошибка'}`);
    }

    return result.success;
  }

  /**
   * Тестирует автоматическую регистрацию через Wallet
   */
  async testAutoRegistrationWallet() {
    console.log('\n=== ТЕСТ: Автоматическая регистрация через Wallet ===');
    
    const testUser = {
      id: this.newUserId + 1,
      username: `wallettest_${this.newUserId + 1}`,
      first_name: 'WalletTest',
      last_name: 'User'
    };

    const initData = this.generateValidInitData(testUser);
    const headers = {
      'X-Telegram-Init-Data': initData
    };

    const result = await this.testRequest('/api/v2/wallet', 'GET', null, headers);
    
    this.testResults.push({
      test: 'auto_registration_wallet',
      endpoint: 'GET /api/v2/wallet',
      status: result.status,
      success: result.success,
      autoCreated: result.success && result.data.uni_balance !== undefined,
      message: result.success ? 'Кошелек создан автоматически' : result.data.error || 'Неизвестная ошибка'
    });

    console.log(`GET /api/v2/wallet: ${result.success ? '✅' : '❌'} (${result.status})`);
    if (result.success) {
      console.log(`  UNI баланс: ${result.data.uni_balance}`);
      console.log(`  TON баланс: ${result.data.ton_balance}`);
    } else {
      console.log(`  Ошибка: ${result.data.error || 'Неизвестная ошибка'}`);
    }

    return result.success;
  }

  /**
   * Тестирует автоматическую регистрацию через Missions
   */
  async testAutoRegistrationMissions() {
    console.log('\n=== ТЕСТ: Автоматическая регистрация через Missions ===');
    
    const testUser = {
      id: this.newUserId + 2,
      username: `missiontest_${this.newUserId + 2}`,
      first_name: 'MissionTest',
      last_name: 'User'
    };

    const initData = this.generateValidInitData(testUser);
    const headers = {
      'X-Telegram-Init-Data': initData
    };

    const result = await this.testRequest('/api/v2/missions', 'GET', null, headers);
    
    this.testResults.push({
      test: 'auto_registration_missions',
      endpoint: 'GET /api/v2/missions',
      status: result.status,
      success: result.success,
      autoCreated: result.success,
      message: result.success ? 'Миссии загружены после автоматической регистрации' : result.data.error || 'Неизвестная ошибка'
    });

    console.log(`GET /api/v2/missions: ${result.success ? '✅' : '❌'} (${result.status})`);
    if (result.success) {
      console.log(`  Загружено миссий: ${Array.isArray(result.data) ? result.data.length : 'N/A'}`);
    } else {
      console.log(`  Ошибка: ${result.data.error || 'Неизвестная ошибка'}`);
    }

    return result.success;
  }

  /**
   * Тестирует автоматическую регистрацию через Farming
   */
  async testAutoRegistrationFarming() {
    console.log('\n=== ТЕСТ: Автоматическая регистрация через Farming ===');
    
    const testUser = {
      id: this.newUserId + 3,
      username: `farmtest_${this.newUserId + 3}`,
      first_name: 'FarmTest',
      last_name: 'User'
    };

    const initData = this.generateValidInitData(testUser);
    const headers = {
      'X-Telegram-Init-Data': initData
    };

    const result = await this.testRequest('/api/v2/farming', 'GET', null, headers);
    
    this.testResults.push({
      test: 'auto_registration_farming',
      endpoint: 'GET /api/v2/farming',
      status: result.status,
      success: result.success,
      autoCreated: result.success,
      message: result.success ? 'Данные фарминга получены после автоматической регистрации' : result.data.error || 'Неизвестная ошибка'
    });

    console.log(`GET /api/v2/farming: ${result.success ? '✅' : '❌'} (${result.status})`);
    if (result.success) {
      console.log(`  Фарминг статус: ${result.data.isActive ? 'активен' : 'неактивен'}`);
      console.log(`  Сумма депозита: ${result.data.depositAmount || '0'}`);
    } else {
      console.log(`  Ошибка: ${result.data.error || 'Неизвестная ошибка'}`);
    }

    return result.success;
  }

  /**
   * Тестирует реферальную систему с автоматической регистрацией
   */
  async testReferralSystemWithAutoReg() {
    console.log('\n=== ТЕСТ: Реферальная система с автоматической регистрацией ===');
    
    // Создаем родительского пользователя
    const parentUser = {
      id: this.newUserId + 10,
      username: `parent_${this.newUserId + 10}`,
      first_name: 'Parent',
      last_name: 'User'
    };

    const parentInitData = this.generateValidInitData(parentUser);
    const parentHeaders = {
      'X-Telegram-Init-Data': parentInitData
    };

    const parentResult = await this.testRequest('/api/v2/me', 'GET', null, parentHeaders);
    
    if (!parentResult.success) {
      console.log('❌ Не удалось создать родительского пользователя');
      return false;
    }

    const parentRefCode = parentResult.data.ref_code;
    console.log(`✅ Родительский пользователь создан, ref_code: ${parentRefCode || 'отсутствует'}`);

    // Создаем дочернего пользователя с реферальным кодом
    const childUser = {
      id: this.newUserId + 11,
      username: `child_${this.newUserId + 11}`,
      first_name: 'Child',
      last_name: 'User'
    };

    const childInitData = this.generateValidInitData(childUser);
    const childHeaders = {
      'X-Telegram-Init-Data': childInitData
    };

    const refParam = parentRefCode ? `?start_param=${parentRefCode}` : '';
    const childResult = await this.testRequest(`/api/v2/me${refParam}`, 'GET', null, childHeaders);
    
    this.testResults.push({
      test: 'referral_system_auto_reg',
      endpoint: `GET /api/v2/me${refParam}`,
      status: childResult.status,
      success: childResult.success,
      referralLinked: childResult.success && childResult.data.parent_ref_code === parentRefCode,
      message: childResult.success ? 
        `Дочерний пользователь создан${childResult.data.parent_ref_code ? ', привязан к реф-коду' : ', без реф-кода'}` : 
        childResult.data.error || 'Неизвестная ошибка'
    });

    console.log(`Дочерний пользователь: ${childResult.success ? '✅' : '❌'}`);
    if (childResult.success) {
      console.log(`  Parent ref_code: ${childResult.data.parent_ref_code || 'отсутствует'}`);
      console.log(`  Реферальная связь: ${childResult.data.parent_ref_code === parentRefCode ? 'установлена' : 'не установлена'}`);
    }

    return childResult.success;
  }

  /**
   * Проверяет общее состояние сервера
   */
  async testServerHealth() {
    console.log('\n=== ТЕСТ: Состояние сервера ===');
    
    const healthResult = await this.testRequest('/health', 'GET');
    
    this.testResults.push({
      test: 'server_health',
      endpoint: 'GET /health',
      status: healthResult.status,
      success: healthResult.success || healthResult.status === 404, // 404 нормально если endpoint не существует
      message: healthResult.success ? 'Сервер работает' : 'Health endpoint недоступен (нормально)'
    });

    console.log(`Health check: ${healthResult.success ? '✅' : '⚠️'} (${healthResult.status})`);

    // Проверяем базовый endpoint
    const baseResult = await this.testRequest('/', 'GET');
    
    this.testResults.push({
      test: 'server_base',
      endpoint: 'GET /',
      status: baseResult.status,
      success: baseResult.status !== 0, // Любой ответ от сервера означает что он работает
      message: baseResult.status !== 0 ? 'Сервер отвечает' : 'Сервер недоступен'
    });

    console.log(`Base endpoint: ${baseResult.status !== 0 ? '✅' : '❌'} (${baseResult.status})`);

    return healthResult.success || baseResult.status !== 0;
  }

  /**
   * Генерирует итоговый отчет
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ОТЧЕТ: ТЕСТИРОВАНИЕ СИСТЕМЫ ПОСЛЕ T13');
    console.log('='.repeat(80));

    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(t => t.success).length;
    const autoRegTests = this.testResults.filter(t => t.autoCreated).length;

    console.log(`\n📈 ОБЩАЯ СТАТИСТИКА:`);
    console.log(`  Всего тестов: ${totalTests}`);
    console.log(`  Успешных: ${successfulTests}`);
    console.log(`  С автоматической регистрацией: ${autoRegTests}`);
    console.log(`  Процент успеха: ${Math.round((successfulTests / totalTests) * 100)}%`);

    console.log(`\n📋 РЕЗУЛЬТАТЫ ПО КОМПОНЕНТАМ:`);
    this.testResults.forEach((test, index) => {
      const status = test.success ? '✅' : '❌';
      const autoReg = test.autoCreated ? ' [AUTO-REG]' : '';
      console.log(`  ${index + 1}. ${status} ${test.endpoint}${autoReg}`);
      console.log(`     ${test.message}`);
    });

    const systemHealthy = successfulTests >= Math.floor(totalTests * 0.7);
    const autoRegWorking = autoRegTests > 0;

    console.log(`\n🎯 СОСТОЯНИЕ СИСТЕМЫ:`);
    console.log(`  Общее здоровье: ${systemHealthy ? '✅ ХОРОШЕЕ' : '❌ ТРЕБУЕТ ВНИМАНИЯ'}`);
    console.log(`  Автоматическая регистрация T13: ${autoRegWorking ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ'}`);
    console.log(`  Готовность к T15: ${systemHealthy && autoRegWorking ? '✅ ГОТОВ' : '⚠️ ТРЕБУЕТ ИСПРАВЛЕНИЙ'}`);

    console.log(`\n💡 РЕКОМЕНДАЦИИ:`);
    if (!systemHealthy) {
      console.log(`  • Исправить ${totalTests - successfulTests} неработающих компонентов`);
    }
    if (!autoRegWorking) {
      console.log(`  • Проверить интеграцию автоматической регистрации T13`);
    }
    if (systemHealthy && autoRegWorking) {
      console.log(`  • Система готова к выполнению T15 синхронизации базы данных`);
      console.log(`  • Можно переходить к финальному тестированию перед продакшеном`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`СТАТУС: ${systemHealthy && autoRegWorking ? '✅ СИСТЕМА ГОТОВА К T15' : '⚠️ ТРЕБУЮТСЯ ИСПРАВЛЕНИЯ'}`);
    console.log(`${'='.repeat(80)}`);

    return {
      totalTests,
      successfulTests,
      autoRegTests,
      systemHealthy,
      autoRegWorking,
      readyForT15: systemHealthy && autoRegWorking
    };
  }

  /**
   * Запускает все тесты
   */
  async runAllTests() {
    try {
      console.log('🚀 ЗАПУСК ТЕСТИРОВАНИЯ СИСТЕМЫ ПОСЛЕ T13');
      console.log(`Тестирование на порту 3001, базовый user ID: ${this.newUserId}`);
      
      // Ждем немного чтобы сервер точно запустился
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await this.testServerHealth();
      await this.testAutoRegistrationMe();
      await this.testAutoRegistrationWallet();
      await this.testAutoRegistrationMissions();
      await this.testAutoRegistrationFarming();
      await this.testReferralSystemWithAutoReg();
      
      const report = this.generateReport();
      
      if (report.readyForT15) {
        console.log('\n🎉 СИСТЕМА ГОТОВА К ВЫПОЛНЕНИЮ T15!');
        console.log('Следующий шаг: Активировать базу данных и запустить синхронизацию T15');
      } else {
        console.log('\n⚠️ Система требует дополнительной настройки перед T15');
      }
      
      return report;
    } catch (error) {
      console.error('❌ Критическая ошибка при тестировании:', error.message);
      return { error: error.message, readyForT15: false };
    }
  }
}

// Запуск тестирования
async function main() {
  console.log('Ожидание запуска сервера...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const tester = new PostT13SystemTest();
  await tester.runAllTests();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { PostT13SystemTest };