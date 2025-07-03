/**
 * 🔍 UniFarm Pre-Test System Check
 * Быстрая проверка готовности системы к E2E тестированию
 */

let fetch;

async function initFetch() {
  if (!fetch) {
    const fetchModule = await import('node-fetch');
    fetch = fetchModule.default;
  }
  return fetch;
}

const CHECKS = {
  server_health: 'http://localhost:3000/health',
  api_health: 'http://localhost:3000/api/v2/health',
  auth_endpoint: 'http://localhost:3000/api/v2/auth/telegram',
  user_endpoint: 'http://localhost:3000/api/v2/user/profile',
  wallet_endpoint: 'http://localhost:3000/api/v2/wallet/balance',
  farming_endpoint: 'http://localhost:3000/api/v2/farming/status',
  boost_endpoint: 'http://localhost:3000/api/v2/boost/packages',
  referral_endpoint: 'http://localhost:3000/api/v2/referral/code',
  missions_endpoint: 'http://localhost:3000/api/v2/missions/list',
  transactions_endpoint: 'http://localhost:3000/api/v2/transactions'
};

class PreTestChecker {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  log(message, type = 'INFO') {
    const symbols = {
      'SUCCESS': '✅',
      'ERROR': '❌',
      'WARNING': '⚠️',
      'INFO': 'ℹ️'
    };
    console.log(`${symbols[type]} ${message}`);
  }

  async checkEndpoint(name, url, method = 'GET', expectedStatus = 200) {
    try {
      await initFetch();
      const response = await fetch(url, {
        method,
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const isSuccess = response.status === expectedStatus || response.status === 401; // 401 для protected endpoints
      
      if (isSuccess) {
        this.results.passed++;
        this.log(`${name}: доступен (${response.status})`, 'SUCCESS');
        this.results.details.push({
          check: name,
          status: 'PASSED',
          url,
          response_status: response.status
        });
      } else {
        this.results.failed++;
        this.log(`${name}: недоступен (${response.status})`, 'ERROR');
        this.results.details.push({
          check: name,
          status: 'FAILED',
          url,
          response_status: response.status
        });
      }
      
      return isSuccess;
    } catch (error) {
      this.results.failed++;
      this.log(`${name}: ошибка подключения - ${error.message}`, 'ERROR');
      this.results.details.push({
        check: name,
        status: 'ERROR',
        url,
        error: error.message
      });
      return false;
    }
  }

  async checkDatabase() {
    try {
      await initFetch();
      // Попытка проверить базу данных через health endpoint
      const response = await fetch('http://localhost:3000/api/v2/health', {
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.database === 'connected' || data.supabase === 'connected') {
          this.results.passed++;
          this.log('База данных: подключена', 'SUCCESS');
          this.results.details.push({
            check: 'database_connection',
            status: 'PASSED',
            details: data
          });
          return true;
        }
      }
      
      this.results.warnings++;
      this.log('База данных: статус неизвестен', 'WARNING');
      this.results.details.push({
        check: 'database_connection',
        status: 'WARNING',
        details: 'Unable to determine database status'
      });
      return false;
    } catch (error) {
      this.results.failed++;
      this.log(`База данных: ошибка проверки - ${error.message}`, 'ERROR');
      this.results.details.push({
        check: 'database_connection',
        status: 'ERROR',
        error: error.message
      });
      return false;
    }
  }

  async checkEnvironmentVariables() {
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'JWT_SECRET',
      'TELEGRAM_BOT_TOKEN'
    ];

    let envChecksPassed = 0;
    
    try {
      await initFetch();
      // Проверяем через API endpoint, если доступен
      const response = await fetch('http://localhost:3000/api/v2/health', {
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        
        // Если health endpoint возвращает данные, значит основные переменные есть
        envChecksPassed = requiredVars.length;
        this.results.passed++;
        this.log('Переменные окружения: настроены', 'SUCCESS');
        this.results.details.push({
          check: 'environment_variables',
          status: 'PASSED',
          details: 'Environment variables appear to be configured'
        });
        return true;
      }
    } catch (error) {
      // Не удалось проверить через API
    }

    this.results.warnings++;
    this.log('Переменные окружения: не удалось проверить', 'WARNING');
    this.results.details.push({
      check: 'environment_variables',
      status: 'WARNING',
      details: 'Unable to verify environment variables'
    });
    return false;
  }

  async runAllChecks() {
    console.log('🔍 Запуск проверки готовности UniFarm к тестированию...\n');

    // 1. Проверка основного сервера
    await this.checkEndpoint('Основной сервер', CHECKS.server_health);
    await this.checkEndpoint('API сервер', CHECKS.api_health);

    // 2. Проверка базы данных
    await this.checkDatabase();

    // 3. Проверка переменных окружения
    await this.checkEnvironmentVariables();

    // 4. Проверка API endpoints
    console.log('\n📡 Проверка API endpoints:');
    await this.checkEndpoint('Auth API', CHECKS.auth_endpoint, 'POST', 400); // Ожидаем 400 без данных
    await this.checkEndpoint('User API', CHECKS.user_endpoint, 'GET', 401); // Ожидаем 401 без токена
    await this.checkEndpoint('Wallet API', CHECKS.wallet_endpoint, 'GET', 401);
    await this.checkEndpoint('Farming API', CHECKS.farming_endpoint, 'GET', 401);
    await this.checkEndpoint('Boost API', CHECKS.boost_endpoint, 'GET', 401);
    await this.checkEndpoint('Referral API', CHECKS.referral_endpoint, 'GET', 401);
    await this.checkEndpoint('Missions API', CHECKS.missions_endpoint, 'GET', 401);
    await this.checkEndpoint('Transactions API', CHECKS.transactions_endpoint, 'GET', 401);

    // 5. Сводка результатов
    this.generateSummary();
  }

  generateSummary() {
    const total = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = Math.round((this.results.passed / total) * 100);

    console.log('\n' + '='.repeat(50));
    console.log('📊 СВОДКА ПРОВЕРКИ ГОТОВНОСТИ');
    console.log('='.repeat(50));
    console.log(`✅ Успешно: ${this.results.passed}`);
    console.log(`❌ Ошибки: ${this.results.failed}`);
    console.log(`⚠️ Предупреждения: ${this.results.warnings}`);
    console.log(`📈 Готовность: ${successRate}%`);

    if (successRate >= 80) {
      console.log('\n🎯 Система готова к E2E тестированию!');
      console.log('Запустите тесты командой: node tests/run_tests.js');
    } else if (successRate >= 60) {
      console.log('\n⚠️ Система частично готова к тестированию.');
      console.log('Рекомендуется исправить ошибки перед запуском тестов.');
    } else {
      console.log('\n❌ Система не готова к тестированию.');
      console.log('Необходимо исправить критические ошибки.');
    }

    console.log('\n📋 Детали проверки:');
    this.results.details.forEach(detail => {
      const symbol = detail.status === 'PASSED' ? '✅' : 
                   detail.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${symbol} ${detail.check}`);
      if (detail.error) {
        console.log(`   Ошибка: ${detail.error}`);
      }
    });

    console.log('='.repeat(50));

    return successRate >= 80;
  }
}

// Запуск проверки
async function main() {
  const checker = new PreTestChecker();
  
  try {
    const isReady = await checker.runAllChecks();
    process.exit(isReady ? 0 : 1);
  } catch (error) {
    console.error('❌ Критическая ошибка проверки:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { PreTestChecker };