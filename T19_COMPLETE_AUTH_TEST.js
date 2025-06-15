/**
 * T19: Полный тест системы авторизации и регистрации через Telegram
 * Создает тестового пользователя и проверяет все этапы
 */

import { validateTelegramInitData, generateJWTToken } from './utils/telegram.js';
import { AuthService } from './modules/auth/service.js';

class CompleteAuthTest {
  constructor() {
    this.authService = new AuthService();
    this.testResults = {
      initDataGeneration: false,
      initDataValidation: false,
      userRegistration: false,
      jwtGeneration: false,
      jwtValidation: false,
      userInDatabase: false,
      authEndpoint: false,
      userContext: false
    };
  }

  log(status, message, details = null) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${status} ${message}`);
    if (details) {
      console.log('    Details:', JSON.stringify(details, null, 2));
    }
  }

  /**
   * Создает валидные Telegram initData
   */
  createValidInitData() {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        this.log('❌', 'TELEGRAM_BOT_TOKEN не найден в переменных окружения');
        return null;
      }

      // Создаем тестовые данные пользователя
      const testUser = {
        id: 777777777,
        first_name: 'Test',
        last_name: 'User',
        username: 'test_user',
        language_code: 'ru'
      };

      const authDate = Math.floor(Date.now() / 1000);
      const queryId = 'test_query_' + Date.now();

      // Создаем параметры для initData
      const params = new URLSearchParams();
      params.append('user', JSON.stringify(testUser));
      params.append('auth_date', authDate.toString());
      params.append('query_id', queryId);

      // Сортируем параметры для создания подписи
      const sortedParams = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Создаем HMAC подпись
      const crypto = require('crypto');
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      const hash = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('hex');

      // Добавляем hash к параметрам
      params.append('hash', hash);

      const initData = params.toString();
      this.log('✅', 'Валидные initData созданы', {
        user_id: testUser.id,
        initData_length: initData.length,
        hash: hash.substring(0, 10) + '...'
      });

      this.testResults.initDataGeneration = true;
      return initData;
    } catch (error) {
      this.log('❌', 'Ошибка создания initData', error.message);
      return null;
    }
  }

  /**
   * Тестирует регистрацию пользователя
   */
  async testRegistration() {
    try {
      this.log('🔄', 'Тестирование регистрации пользователя...');

      const initData = this.createValidInitData();
      if (!initData) {
        this.log('❌', 'Не удалось создать initData для тестирования');
        return false;
      }

      // Проверяем валидацию initData
      const validation = validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
      if (!validation.valid) {
        this.log('❌', 'InitData валидация не прошла', validation.error);
        return false;
      }

      this.log('✅', 'InitData валидация успешна', {
        user_id: validation.user.id,
        username: validation.user.username
      });
      this.testResults.initDataValidation = true;

      // Тестируем аутентификацию через AuthService
      const authResult = await this.authService.authenticateFromTelegram(initData);
      if (!authResult.success) {
        this.log('❌', 'Аутентификация не удалась', authResult.error);
        return false;
      }

      this.log('✅', 'Пользователь зарегистрирован/аутентифицирован', {
        user_id: authResult.user.id,
        telegram_id: authResult.user.telegram_id,
        ref_code: authResult.user.ref_code,
        token_present: !!authResult.token
      });

      this.testResults.userRegistration = true;
      this.testResults.jwtGeneration = !!authResult.token;

      return authResult;
    } catch (error) {
      this.log('❌', 'Ошибка регистрации', error.message);
      return false;
    }
  }

  /**
   * Тестирует авторизацию существующего пользователя
   */
  async testAuthentication() {
    try {
      this.log('🔄', 'Тестирование повторной авторизации...');

      const initData = this.createValidInitData();
      if (!initData) return false;

      // Повторная аутентификация того же пользователя
      const authResult = await this.authService.authenticateFromTelegram(initData);
      if (!authResult.success) {
        this.log('❌', 'Повторная аутентификация не удалась', authResult.error);
        return false;
      }

      this.log('✅', 'Повторная аутентификация успешна', {
        user_id: authResult.user.id,
        is_new_user: authResult.isNewUser,
        token_present: !!authResult.token
      });

      return authResult;
    } catch (error) {
      this.log('❌', 'Ошибка повторной аутентификации', error.message);
      return false;
    }
  }

  /**
   * Тестирует доступ к защищенным эндпоинтам
   */
  async testProtectedEndpoints(token) {
    try {
      this.log('🔄', 'Тестирование защищенных эндпоинтов...');

      if (!token) {
        this.log('❌', 'Токен отсутствует для тестирования эндпоинтов');
        return false;
      }

      const fetch = (await import('node-fetch')).default;

      // Тестируем эндпоинт профиля пользователя
      const response = await fetch('http://localhost:3000/api/v2/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        this.log('❌', 'Эндпоинт /users/profile недоступен', {
          status: response.status,
          statusText: response.statusText
        });
        return false;
      }

      const data = await response.json();
      this.log('✅', 'Защищенный эндпоинт доступен', {
        endpoint: '/users/profile',
        user_data: data.success ? 'present' : 'missing'
      });

      this.testResults.authEndpoint = true;
      return true;
    } catch (error) {
      this.log('❌', 'Ошибка тестирования эндпоинтов', error.message);
      return false;
    }
  }

  /**
   * Полный тест системы авторизации
   */
  async runCompleteTest() {
    this.log('🚀', 'Начало полного тестирования авторизации Telegram');

    // 1. Тестируем регистрацию
    const registrationResult = await this.testRegistration();
    if (!registrationResult) {
      this.log('❌', 'Тест регистрации провален');
      return this.generateReport();
    }

    // 2. Тестируем JWT валидацию
    if (registrationResult.token) {
      const validation = await this.authService.validateToken(registrationResult.token);
      if (validation.valid) {
        this.log('✅', 'JWT токен валидируется успешно', {
          telegram_id: validation.payload.telegram_id,
          exp: new Date(validation.payload.exp * 1000).toLocaleString()
        });
        this.testResults.jwtValidation = true;
      } else {
        this.log('❌', 'JWT токен не прошел валидацию', validation.error);
      }
    }

    // 3. Тестируем повторную аутентификацию
    await this.testAuthentication();

    // 4. Тестируем защищенные эндпоинты
    await this.testProtectedEndpoints(registrationResult.token);

    // 5. Проверяем пользователя в базе данных
    try {
      const { supabase } = await import('./core/supabase.js');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', 777777777)
        .single();

      if (data && !error) {
        this.log('✅', 'Пользователь найден в базе данных', {
          id: data.id,
          telegram_id: data.telegram_id,
          ref_code: data.ref_code
        });
        this.testResults.userInDatabase = true;
      } else {
        this.log('❌', 'Пользователь не найден в базе данных', error?.message);
      }
    } catch (error) {
      this.log('❌', 'Ошибка проверки базы данных', error.message);
    }

    return this.generateReport();
  }

  /**
   * Генерирует отчет о тестировании
   */
  generateReport() {
    const successCount = Object.values(this.testResults).filter(result => result).length;
    const totalTests = Object.keys(this.testResults).length;
    const successRate = Math.round((successCount / totalTests) * 100);

    const report = {
      summary: {
        total_tests: totalTests,
        passed: successCount,
        failed: totalTests - successCount,
        success_rate: successRate + '%'
      },
      results: this.testResults,
      status: successRate >= 80 ? 'SUCCESS' : successRate >= 60 ? 'PARTIAL' : 'FAILED'
    };

    this.log('📊', 'ИТОГОВЫЙ ОТЧЕТ', report);

    if (successRate >= 80) {
      this.log('🎉', 'АВТОРИЗАЦИЯ TELEGRAM РАБОТАЕТ КОРРЕКТНО!');
    } else if (successRate >= 60) {
      this.log('⚠️', 'Авторизация работает частично, требуются исправления');
    } else {
      this.log('🚨', 'Критические проблемы с авторизацией, требуется отладка');
    }

    return report;
  }
}

async function main() {
  try {
    const tester = new CompleteAuthTest();
    await tester.runCompleteTest();
  } catch (error) {
    console.error('Ошибка выполнения теста:', error);
  }
}

// Запускаем тест если файл выполняется напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CompleteAuthTest };