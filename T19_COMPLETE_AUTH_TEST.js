/**
 * T19: Полный тест системы авторизации и регистрации через Telegram
 * Создает тестового пользователя и проверяет все этапы
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

class CompleteAuthTest {
  constructor() {
    this.botToken = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';
    this.baseUrl = 'http://localhost:3000/api/v2';
    this.testUser = {
      id: Math.floor(Math.random() * 1000000) + 100000,
      first_name: "TestUser",
      username: "testuser_" + Date.now(),
      language_code: "ru"
    };
  }

  log(status, message, details = null) {
    const timestamp = new Date().toISOString();
    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️';
    console.log(`[${timestamp}] ${icon} ${message}`);
    if (details) console.log(`    ${JSON.stringify(details, null, 2)}`);
  }

  /**
   * Создает валидные Telegram initData
   */
  createValidInitData() {
    const authDate = Math.floor(Date.now() / 1000);
    
    const dataParams = new URLSearchParams();
    dataParams.append('user', JSON.stringify(this.testUser));
    dataParams.append('auth_date', authDate.toString());
    dataParams.append('query_id', 'test_' + Date.now());
    
    // Создаем HMAC подпись
    const sortedParams = Array.from(dataParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(this.botToken)
      .digest();
    
    const hash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');
    
    dataParams.append('hash', hash);
    
    return dataParams.toString();
  }

  /**
   * Тестирует регистрацию пользователя
   */
  async testRegistration() {
    try {
      this.log('info', 'Тестирование регистрации пользователя...');
      
      const initData = this.createValidInitData();
      
      const response = await fetch(`${this.baseUrl}/register/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData
        },
        body: JSON.stringify({
          initData: initData,
          refBy: null
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.token) {
        this.log('success', 'Регистрация успешна', {
          user_id: data.user.id,
          telegram_id: data.user.telegram_id,
          token_length: data.token.length
        });
        return { success: true, token: data.token, user: data.user };
      } else {
        this.log('error', 'Регистрация не удалась', {
          status: response.status,
          response: data
        });
        return { success: false, error: data.error || 'Unknown error' };
      }
      
    } catch (error) {
      this.log('error', 'Ошибка при регистрации', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Тестирует авторизацию существующего пользователя
   */
  async testAuthentication() {
    try {
      this.log('info', 'Тестирование авторизации пользователя...');
      
      const initData = this.createValidInitData();
      
      const response = await fetch(`${this.baseUrl}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData
        },
        body: JSON.stringify({
          initData: initData,
          refBy: null
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.token) {
        this.log('success', 'Авторизация успешна', {
          user_id: data.user.id,
          telegram_id: data.user.telegram_id
        });
        return { success: true, token: data.token, user: data.user };
      } else {
        this.log('info', 'Авторизация не удалась (ожидаемо для нового пользователя)', {
          status: response.status,
          response: data
        });
        return { success: false, error: data.error || 'Unknown error' };
      }
      
    } catch (error) {
      this.log('error', 'Ошибка при авторизации', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Тестирует доступ к защищенным эндпоинтам
   */
  async testProtectedEndpoints(token) {
    try {
      this.log('info', 'Тестирование защищенных эндпоинтов...');
      
      const endpoints = [
        '/me',
        '/users/profile'
      ];
      
      const results = {};
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          
          if (response.ok) {
            this.log('success', `Эндпоинт ${endpoint} доступен`, {
              status: response.status,
              has_user_data: !!data.user_id || !!data.id
            });
            results[endpoint] = 'success';
          } else {
            this.log('error', `Эндпоинт ${endpoint} недоступен`, {
              status: response.status,
              error: data.error
            });
            results[endpoint] = 'error';
          }
        } catch (error) {
          this.log('error', `Ошибка доступа к ${endpoint}`, { error: error.message });
          results[endpoint] = 'error';
        }
      }
      
      return results;
      
    } catch (error) {
      this.log('error', 'Ошибка тестирования эндпоинтов', { error: error.message });
      return {};
    }
  }

  /**
   * Полный тест системы авторизации
   */
  async runCompleteTest() {
    this.log('info', 'Запуск полного теста системы авторизации...');
    
    const report = {
      timestamp: new Date().toISOString(),
      test_user: this.testUser,
      results: {
        authentication: null,
        registration: null,
        protected_endpoints: {}
      },
      status: 'unknown'
    };
    
    // 1. Проверяем авторизацию (должна не пройти для нового пользователя)
    const authResult = await this.testAuthentication();
    report.results.authentication = authResult;
    
    // 2. Проверяем регистрацию
    const regResult = await this.testRegistration();
    report.results.registration = regResult;
    
    // 3. Если регистрация прошла, тестируем защищенные эндпоинты
    if (regResult.success && regResult.token) {
      const endpointsResult = await this.testProtectedEndpoints(regResult.token);
      report.results.protected_endpoints = endpointsResult;
    }
    
    // Определяем общий статус
    if (regResult.success) {
      const endpointsWorking = Object.values(report.results.protected_endpoints).filter(s => s === 'success').length;
      if (endpointsWorking >= 1) {
        report.status = 'success';
        this.log('success', 'Система авторизации работает корректно');
      } else {
        report.status = 'partial';
        this.log('info', 'Регистрация работает, но проблемы с защищенными эндпоинтами');
      }
    } else {
      report.status = 'failed';
      this.log('error', 'Система авторизации не работает');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('ОТЧЕТ T19: ПОЛНЫЙ ТЕСТ АВТОРИЗАЦИИ TELEGRAM');
    console.log('='.repeat(80));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(80));
    
    return report;
  }
}

async function main() {
  try {
    const tester = new CompleteAuthTest();
    await tester.runCompleteTest();
  } catch (error) {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  }
}

main();