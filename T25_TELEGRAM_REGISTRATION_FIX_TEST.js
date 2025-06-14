/**
 * T25: Тест исправления регистрации пользователей через Telegram
 * Проверяет новую логику прямой регистрации когда initData пустой
 */

const fetch = require('node-fetch');

class TelegramRegistrationFixTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      directRegistration: false,
      standardRegistration: false,
      userInDatabase: false,
      jwtToken: null,
      refCode: null,
      errors: []
    };
  }

  log(status, message, details = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${status}: ${message}`);
    if (details) {
      console.log('Details:', JSON.stringify(details, null, 2));
    }
  }

  /**
   * Тест прямой регистрации через данные пользователя (без initData)
   */
  async testDirectRegistration() {
    this.log('INFO', 'Тестирование прямой регистрации без initData');
    
    try {
      const testUser = {
        telegram_id: Math.floor(Math.random() * 1000000) + 100000,
        username: `testuser_${Date.now()}`,
        first_name: 'Test',
        last_name: 'User',
        language_code: 'en',
        direct_registration: true
      };

      const response = await fetch(`${this.baseUrl}/api/v2/register/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testUser)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        this.log('SUCCESS', 'Прямая регистрация успешна');
        this.results.directRegistration = true;
        this.results.jwtToken = data.token;
        this.results.refCode = data.user?.ref_code;
        
        this.log('INFO', 'Данные зарегистрированного пользователя', {
          id: data.user?.id,
          telegram_id: data.user?.telegram_id,
          username: data.user?.username,
          ref_code: data.user?.ref_code,
          token_length: data.token?.length
        });
      } else {
        this.log('ERROR', 'Прямая регистрация не удалась', data);
        this.results.errors.push({
          test: 'directRegistration',
          error: data.error || 'Unknown error',
          status: response.status
        });
      }
    } catch (error) {
      this.log('ERROR', 'Ошибка при тестировании прямой регистрации', error.message);
      this.results.errors.push({
        test: 'directRegistration',
        error: error.message
      });
    }
  }

  /**
   * Проверка наличия пользователя в базе данных
   */
  async testUserInDatabase() {
    if (!this.results.jwtToken) {
      this.log('SKIP', 'Пропуск проверки базы данных - нет токена');
      return;
    }

    this.log('INFO', 'Проверка наличия пользователя в базе данных');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.results.jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        this.log('SUCCESS', 'Пользователь найден в базе данных');
        this.results.userInDatabase = true;
        
        this.log('INFO', 'Профиль пользователя из базы', {
          id: data.user?.id,
          telegram_id: data.user?.telegram_id,
          username: data.user?.username,
          ref_code: data.user?.ref_code,
          balance: data.user?.balance
        });
      } else {
        this.log('ERROR', 'Пользователь не найден в базе данных', data);
        this.results.errors.push({
          test: 'userInDatabase',
          error: data.error || 'User not found',
          status: response.status
        });
      }
    } catch (error) {
      this.log('ERROR', 'Ошибка при проверке базы данных', error.message);
      this.results.errors.push({
        test: 'userInDatabase',
        error: error.message
      });
    }
  }

  /**
   * Тест реферальной ссылки
   */
  async testReferralLink() {
    if (!this.results.refCode) {
      this.log('SKIP', 'Пропуск проверки реферальной ссылки - нет ref_code');
      return;
    }

    this.log('INFO', 'Проверка реферальной ссылки');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/referral/info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.results.jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        this.log('SUCCESS', 'Реферальная информация получена');
        
        this.log('INFO', 'Реферальные данные', {
          ref_code: data.ref_code,
          referral_count: data.referral_count,
          referral_link: data.referral_link
        });
      } else {
        this.log('ERROR', 'Ошибка получения реферальной информации', data);
        this.results.errors.push({
          test: 'referralLink',
          error: data.error || 'Referral info not available',
          status: response.status
        });
      }
    } catch (error) {
      this.log('ERROR', 'Ошибка при проверке реферальной ссылки', error.message);
      this.results.errors.push({
        test: 'referralLink',
        error: error.message
      });
    }
  }

  /**
   * Генерация итогового отчета
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('ОТЧЕТ О ТЕСТИРОВАНИИ TELEGRAM РЕГИСТРАЦИИ');
    console.log('='.repeat(60));
    
    console.log('\n📋 РЕЗУЛЬТАТЫ ТЕСТОВ:');
    console.log(`✅ Прямая регистрация: ${this.results.directRegistration ? 'ПРОЙДЕН' : 'НЕ ПРОЙДЕН'}`);
    console.log(`✅ Пользователь в БД: ${this.results.userInDatabase ? 'ПРОЙДЕН' : 'НЕ ПРОЙДЕН'}`);
    console.log(`✅ JWT токен: ${this.results.jwtToken ? 'ПОЛУЧЕН' : 'НЕ ПОЛУЧЕН'}`);
    console.log(`✅ Реферальный код: ${this.results.refCode ? 'ПОЛУЧЕН' : 'НЕ ПОЛУЧЕН'}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ ОШИБКИ:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.error}`);
        if (error.status) {
          console.log(`   HTTP Status: ${error.status}`);
        }
      });
    }
    
    const allTestsPassed = this.results.directRegistration && 
                          this.results.userInDatabase && 
                          this.results.jwtToken && 
                          this.results.refCode;
    
    console.log('\n🎯 ОБЩИЙ РЕЗУЛЬТАТ:');
    if (allTestsPassed) {
      console.log('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ - СИСТЕМА РАБОТАЕТ КОРРЕКТНО');
      console.log('🚀 Telegram регистрация полностью функциональна');
    } else {
      console.log('❌ НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ - ТРЕБУЮТСЯ ИСПРАВЛЕНИЯ');
      console.log('🔧 Необходимо проверить серверную логику');
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Основной метод тестирования
   */
  async runTest() {
    console.log('🚀 ЗАПУСК ТЕСТИРОВАНИЯ TELEGRAM РЕГИСТРАЦИИ');
    console.log('Проверяем новую логику прямой регистрации без initData\n');
    
    await this.testDirectRegistration();
    await this.testUserInDatabase();
    await this.testReferralLink();
    
    this.generateReport();
  }
}

async function main() {
  const tester = new TelegramRegistrationFixTest();
  await tester.runTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TelegramRegistrationFixTest };