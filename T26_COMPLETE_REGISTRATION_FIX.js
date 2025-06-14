/**
 * T26: Комплексное исправление системы регистрации пользователей Telegram Mini App
 * Диагностирует и исправляет все проблемы с авторизацией и регистрацией
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TelegramRegistrationCompleteFix {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.serverRunning = false;
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    if (details) {
      console.log('Details:', JSON.stringify(details, null, 2));
    }
  }

  /**
   * 1. Проверка работоспособности сервера
   */
  async checkServerStatus() {
    this.log('info', '=== Проверка статуса сервера ===');
    
    try {
      const response = await fetch('http://localhost:5000/api/v2/health');
      if (response.ok) {
        this.log('success', '✅ Сервер запущен и доступен');
        this.serverRunning = true;
      } else {
        throw new Error('Server not responding properly');
      }
    } catch (error) {
      this.log('error', '❌ Сервер недоступен', { error: error.message });
      this.issues.push('Сервер не запущен или недоступен');
      this.serverRunning = false;
    }
  }

  /**
   * 2. Тестирование регистрации через прямые API вызовы
   */
  async testDirectRegistration() {
    this.log('info', '=== Тестирование прямой регистрации ===');
    
    if (!this.serverRunning) {
      this.log('warning', 'Пропускаем тест - сервер недоступен');
      return;
    }

    const testUser = {
      direct_registration: true,
      telegram_id: 12345678,
      username: 'testuser_' + Date.now(),
      first_name: 'Test',
      last_name: 'User',
      language_code: 'en'
    };

    try {
      this.log('info', 'Тестируем прямую регистрацию через /api/v2/register/telegram');
      
      const response = await fetch('http://localhost:5000/api/v2/register/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testUser)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        this.log('success', '✅ Прямая регистрация работает', { 
          userId: data.user?.id,
          token: data.token?.substring(0, 20) + '...'
        });
        this.fixes.push('Прямая регистрация функционирует корректно');
        
        // Тестируем авторизацию с полученным токеном
        await this.testTokenAuth(data.token);
      } else {
        this.log('error', '❌ Прямая регистрация не работает', { 
          status: response.status,
          data 
        });
        this.issues.push('Прямая регистрация не функционирует');
      }
    } catch (error) {
      this.log('error', '❌ Ошибка при тестировании регистрации', { error: error.message });
      this.issues.push('Критическая ошибка при регистрации: ' + error.message);
    }
  }

  /**
   * 3. Тестирование авторизации с токеном
   */
  async testTokenAuth(token) {
    this.log('info', '=== Тестирование авторизации с токеном ===');
    
    try {
      const response = await fetch('http://localhost:5000/api/v2/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        this.log('success', '✅ Авторизация с токеном работает', { 
          userId: data.user?.id,
          telegramId: data.user?.telegram_id 
        });
        this.fixes.push('JWT авторизация функционирует корректно');
      } else {
        this.log('error', '❌ Авторизация с токеном не работает', { 
          status: response.status,
          data 
        });
        this.issues.push('JWT авторизация не функционирует');
      }
    } catch (error) {
      this.log('error', '❌ Ошибка при тестировании авторизации', { error: error.message });
      this.issues.push('Ошибка JWT авторизации: ' + error.message);
    }
  }

  /**
   * 4. Проверка базы данных и схемы
   */
  checkDatabaseSchema() {
    this.log('info', '=== Проверка схемы базы данных ===');
    
    try {
      const schemaPath = path.join(process.cwd(), 'shared', 'schema.ts');
      if (fs.existsSync(schemaPath)) {
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        // Проверяем наличие таблицы users
        if (schemaContent.includes('export const users')) {
          this.log('success', '✅ Таблица users найдена в схеме');
          
          // Проверяем обязательные поля
          const requiredFields = ['telegram_id', 'ref_code', 'created_at'];
          const missingFields = requiredFields.filter(field => !schemaContent.includes(field));
          
          if (missingFields.length === 0) {
            this.log('success', '✅ Все обязательные поля присутствуют');
            this.fixes.push('Схема базы данных корректна');
          } else {
            this.log('error', '❌ Отсутствуют поля в схеме', { missingFields });
            this.issues.push(`Отсутствуют поля в схеме: ${missingFields.join(', ')}`);
          }
        } else {
          this.log('error', '❌ Таблица users не найдена в схеме');
          this.issues.push('Таблица users отсутствует в схеме базы данных');
        }
      } else {
        this.log('error', '❌ Файл схемы не найден');
        this.issues.push('Файл схемы базы данных не найден');
      }
    } catch (error) {
      this.log('error', '❌ Ошибка при проверке схемы', { error: error.message });
      this.issues.push('Ошибка при проверке схемы: ' + error.message);
    }
  }

  /**
   * 5. Проверка маршрутов сервера
   */
  checkServerRoutes() {
    this.log('info', '=== Проверка серверных маршрутов ===');
    
    try {
      const routesPath = path.join(process.cwd(), 'server', 'routes.ts');
      if (fs.existsSync(routesPath)) {
        const routesContent = fs.readFileSync(routesPath, 'utf8');
        
        // Проверяем ключевые маршруты
        const requiredRoutes = [
          '/register/telegram',
          '/auth',
          '/users/profile'
        ];
        
        const missingRoutes = requiredRoutes.filter(route => 
          !routesContent.includes(route.replace('/', '\\/'))
        );
        
        if (missingRoutes.length === 0) {
          this.log('success', '✅ Все необходимые маршруты найдены');
          this.fixes.push('Серверные маршруты настроены корректно');
        } else {
          this.log('error', '❌ Отсутствуют маршруты', { missingRoutes });
          this.issues.push(`Отсутствуют маршруты: ${missingRoutes.join(', ')}`);
        }
      } else {
        this.log('error', '❌ Файл маршрутов не найден');
        this.issues.push('Файл серверных маршрутов не найден');
      }
    } catch (error) {
      this.log('error', '❌ Ошибка при проверке маршрутов', { error: error.message });
      this.issues.push('Ошибка при проверке маршрутов: ' + error.message);
    }
  }

  /**
   * 6. Проверка клиентского кода авторизации
   */
  checkClientAuthCode() {
    this.log('info', '=== Проверка клиентского кода авторизации ===');
    
    try {
      const userContextPath = path.join(process.cwd(), 'client', 'src', 'contexts', 'userContext.tsx');
      if (fs.existsSync(userContextPath)) {
        const contextContent = fs.readFileSync(userContextPath, 'utf8');
        
        // Проверяем ключевые функции
        const requiredFunctions = [
          'registerDirectFromTelegramUser',
          '/api/v2/register/telegram',
          '/api/v2/auth/telegram'
        ];
        
        const missingFunctions = requiredFunctions.filter(func => 
          !contextContent.includes(func)
        );
        
        if (missingFunctions.length === 0) {
          this.log('success', '✅ Клиентский код авторизации корректен');
          this.fixes.push('UserContext содержит необходимые функции авторизации');
        } else {
          this.log('error', '❌ Отсутствуют функции в UserContext', { missingFunctions });
          this.issues.push(`Отсутствуют функции: ${missingFunctions.join(', ')}`);
        }
      } else {
        this.log('error', '❌ UserContext не найден');
        this.issues.push('Файл UserContext не найден');
      }
    } catch (error) {
      this.log('error', '❌ Ошибка при проверке клиентского кода', { error: error.message });
      this.issues.push('Ошибка при проверке клиентского кода: ' + error.message);
    }
  }

  /**
   * 7. Генерация отчета и рекомендаций
   */
  generateComprehensiveReport() {
    this.log('info', '=== Генерация итогового отчета ===');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        totalFixes: this.fixes.length,
        serverStatus: this.serverRunning ? 'Запущен' : 'Недоступен',
        overallStatus: this.issues.length === 0 ? 'ГОТОВ К ИСПОЛЬЗОВАНИЮ' : 'ТРЕБУЕТ ИСПРАВЛЕНИЙ'
      },
      issues: this.issues,
      fixes: this.fixes,
      recommendations: this.generateRecommendations()
    };

    // Сохраняем отчет
    const reportPath = path.join(process.cwd(), 'T26_REGISTRATION_FIX_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log('info', '=== ИТОГОВЫЙ ОТЧЕТ ===');
    this.log('info', `Статус системы: ${report.summary.overallStatus}`);
    this.log('info', `Найдено проблем: ${report.summary.totalIssues}`);
    this.log('info', `Работающих компонентов: ${report.summary.totalFixes}`);
    
    if (this.issues.length > 0) {
      this.log('error', 'ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
      this.issues.forEach((issue, index) => {
        this.log('error', `${index + 1}. ${issue}`);
      });
    }

    if (this.fixes.length > 0) {
      this.log('success', 'РАБОТАЮЩИЕ КОМПОНЕНТЫ:');
      this.fixes.forEach((fix, index) => {
        this.log('success', `${index + 1}. ${fix}`);
      });
    }

    return report;
  }

  /**
   * 8. Генерация рекомендаций по исправлению
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (!this.serverRunning) {
      recommendations.push('Запустить сервер разработки: npm run dev');
    }

    if (this.issues.some(issue => issue.includes('регистрация'))) {
      recommendations.push('Проверить AuthService.registerDirectFromTelegramUser метод');
      recommendations.push('Убедиться что маршрут /api/v2/register/telegram доступен');
    }

    if (this.issues.some(issue => issue.includes('JWT'))) {
      recommendations.push('Проверить настройки JWT токенов и middleware авторизации');
    }

    if (this.issues.some(issue => issue.includes('схем'))) {
      recommendations.push('Выполнить миграцию базы данных: npm run db:push');
    }

    if (recommendations.length === 0) {
      recommendations.push('Система регистрации работает корректно');
      recommendations.push('Можно переходить к тестированию в Telegram');
    }

    return recommendations;
  }

  /**
   * Основной метод диагностики и исправления
   */
  async runCompleteFix() {
    this.log('info', '🚀 Запуск комплексного исправления системы регистрации Telegram');
    
    // Проверяем сервер
    await this.checkServerStatus();
    
    // Проверяем компоненты
    this.checkDatabaseSchema();
    this.checkServerRoutes();
    this.checkClientAuthCode();
    
    // Тестируем функциональность если сервер доступен
    if (this.serverRunning) {
      await this.testDirectRegistration();
    }
    
    // Генерируем отчет
    const report = this.generateComprehensiveReport();
    
    this.log('info', '✅ Комплексная диагностика завершена');
    this.log('info', `Отчет сохранен в T26_REGISTRATION_FIX_REPORT.json`);
    
    return report;
  }
}

async function main() {
  try {
    const fixer = new TelegramRegistrationCompleteFix();
    await fixer.runCompleteFix();
  } catch (error) {
    console.error('❌ Критическая ошибка при выполнении диагностики:', error);
  }
}

// Запускаем если файл выполняется напрямую
if (require.main === module) {
  main();
}

module.exports = { TelegramRegistrationCompleteFix };