/**
 * T18: Диагностика регистрации Telegram пользователей
 * Проверяет все компоненты системы регистрации
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { users } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

class TelegramRegistrationDiagnostic {
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(this.pool);
    this.issues = [];
    this.fixes = [];
  }

  log(section, status, message, details = null) {
    console.log(`[${section}] ${status} ${message}`);
    if (details) {
      console.log(`    ${JSON.stringify(details, null, 2)}`);
    }
  }

  /**
   * Проверяет структуру таблицы users
   */
  async checkDatabaseStructure() {
    this.log('DATABASE', '🔍', 'Проверка структуры таблицы users');
    
    try {
      // Проверяем существование таблицы users
      const tableCheck = await this.db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      
      if (tableCheck.rows.length === 0) {
        this.issues.push('Таблица users не существует');
        this.log('DATABASE', '❌', 'Таблица users не найдена');
        return false;
      }
      
      // Проверяем структуру полей
      const columnsCheck = await this.db.execute(sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY column_name
      `);
      
      const columns = columnsCheck.rows.map(row => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES'
      }));
      
      this.log('DATABASE', '✅', 'Структура таблицы users', { columns: columns.length });
      
      // Проверяем критические поля
      const requiredFields = ['id', 'telegram_id', 'username', 'ref_code', 'parent_ref_code'];
      const missingFields = requiredFields.filter(field => 
        !columns.some(col => col.name === field)
      );
      
      if (missingFields.length > 0) {
        this.issues.push(`Отсутствуют поля: ${missingFields.join(', ')}`);
        this.log('DATABASE', '⚠️', 'Отсутствуют критические поля', { missing: missingFields });
      }
      
      return true;
    } catch (error) {
      this.issues.push(`Ошибка подключения к базе данных: ${error.message}`);
      this.log('DATABASE', '❌', 'Ошибка подключения к БД', { error: error.message });
      return false;
    }
  }

  /**
   * Проверяет валидацию Telegram initData
   */
  async checkTelegramValidation() {
    this.log('TELEGRAM', '🔍', 'Проверка валидации Telegram initData');
    
    try {
      const { validateTelegramInitData } = await import('./utils/telegram.js');
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        this.issues.push('TELEGRAM_BOT_TOKEN не настроен');
        this.log('TELEGRAM', '❌', 'Отсутствует TELEGRAM_BOT_TOKEN');
        return false;
      }
      
      // Создаем тестовый initData
      const testUser = {
        id: 123456789,
        username: 'testuser',
        first_name: 'Test'
      };
      
      const authDate = Math.floor(Date.now() / 1000);
      const initDataParams = [
        `auth_date=${authDate}`,
        `user=${encodeURIComponent(JSON.stringify(testUser))}`,
        `query_id=test_query_${Date.now()}`
      ];
      
      const dataCheckString = initDataParams.sort().join('\n');
      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
      const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
      
      const testInitData = [...initDataParams, `hash=${hash}`].join('&');
      
      // Тестируем валидацию
      const validation = validateTelegramInitData(testInitData, botToken);
      
      if (validation.valid && validation.user) {
        this.log('TELEGRAM', '✅', 'Валидация Telegram работает корректно');
        return true;
      } else {
        this.issues.push('Ошибка валидации Telegram initData');
        this.log('TELEGRAM', '❌', 'Валидация не работает', { error: validation.error });
        return false;
      }
    } catch (error) {
      this.issues.push(`Ошибка модуля telegram: ${error.message}`);
      this.log('TELEGRAM', '❌', 'Ошибка импорта telegram utils', { error: error.message });
      return false;
    }
  }

  /**
   * Проверяет маршруты авторизации
   */
  async checkAuthRoutes() {
    this.log('ROUTES', '🔍', 'Проверка маршрутов авторизации');
    
    try {
      // Проверяем существование файлов маршрутов
      const { default: authRoutes } = await import('./modules/auth/routes.js');
      
      this.log('ROUTES', '✅', 'Маршруты auth загружены');
      
      // Проверяем AuthController
      const { AuthController } = await import('./modules/auth/controller.js');
      const authController = new AuthController();
      
      if (typeof authController.registerTelegram === 'function') {
        this.log('ROUTES', '✅', 'Метод registerTelegram найден');
      } else {
        this.issues.push('Метод registerTelegram отсутствует в AuthController');
        this.log('ROUTES', '❌', 'Метод registerTelegram не найден');
      }
      
      return true;
    } catch (error) {
      this.issues.push(`Ошибка загрузки маршрутов: ${error.message}`);
      this.log('ROUTES', '❌', 'Ошибка загрузки маршрутов', { error: error.message });
      return false;
    }
  }

  /**
   * Проверяет UserService
   */
  async checkUserService() {
    this.log('SERVICES', '🔍', 'Проверка UserService');
    
    try {
      const { UserService } = await import('./modules/users/service.js');
      const userService = new UserService();
      
      // Проверяем методы
      const requiredMethods = ['findOrCreateFromTelegram'];
      const missingMethods = requiredMethods.filter(method => 
        typeof userService[method] !== 'function'
      );
      
      if (missingMethods.length === 0) {
        this.log('SERVICES', '✅', 'Все методы UserService найдены');
        return true;
      } else {
        this.issues.push(`Отсутствуют методы в UserService: ${missingMethods.join(', ')}`);
        this.log('SERVICES', '❌', 'Методы отсутствуют', { missing: missingMethods });
        return false;
      }
    } catch (error) {
      this.issues.push(`Ошибка UserService: ${error.message}`);
      this.log('SERVICES', '❌', 'Ошибка UserService', { error: error.message });
      return false;
    }
  }

  /**
   * Тестирует создание пользователя в базе данных
   */
  async testUserCreation() {
    this.log('USER_CREATION', '🔍', 'Тест создания пользователя');
    
    try {
      const testTelegramId = Math.floor(Math.random() * 1000000) + 100000;
      const testUsername = `testuser_${Date.now()}`;
      const testRefCode = `REF${testTelegramId}${Date.now()}`.substring(0, 12).toUpperCase();
      
      // Пытаемся создать тестового пользователя
      const [newUser] = await this.db
        .insert(users)
        .values({
          telegram_id: testTelegramId,
          username: testUsername,
          ref_code: testRefCode
        })
        .returning();
      
      if (newUser && newUser.id) {
        this.log('USER_CREATION', '✅', 'Пользователь создан успешно', {
          id: newUser.id,
          telegram_id: newUser.telegram_id,
          ref_code: newUser.ref_code
        });
        
        // Удаляем тестового пользователя
        await this.db
          .delete(users)
          .where(eq(users.id, newUser.id));
          
        this.log('USER_CREATION', '🧹', 'Тестовый пользователь удален');
        return true;
      } else {
        this.issues.push('Не удалось создать пользователя в БД');
        this.log('USER_CREATION', '❌', 'Создание пользователя неуспешно');
        return false;
      }
    } catch (error) {
      this.issues.push(`Ошибка создания пользователя: ${error.message}`);
      this.log('USER_CREATION', '❌', 'Ошибка создания', { error: error.message });
      return false;
    }
  }

  /**
   * Генерирует план исправлений
   */
  generateFixPlan() {
    this.log('FIXES', '🔧', 'Генерация плана исправлений');
    
    this.issues.forEach((issue, index) => {
      if (issue.includes('Таблица users не существует')) {
        this.fixes.push('Выполнить миграцию базы данных: npm run db:push');
      }
      
      if (issue.includes('Отсутствуют поля')) {
        this.fixes.push('Обновить схему базы данных (T15 синхронизация)');
      }
      
      if (issue.includes('TELEGRAM_BOT_TOKEN')) {
        this.fixes.push('Настроить переменную окружения TELEGRAM_BOT_TOKEN');
      }
      
      if (issue.includes('registerTelegram')) {
        this.fixes.push('Добавить метод registerTelegram в AuthController');
      }
      
      if (issue.includes('UserService')) {
        this.fixes.push('Исправить методы в UserService');
      }
    });
    
    return this.fixes;
  }

  /**
   * Основной метод диагностики
   */
  async runDiagnostic() {
    console.log('🚀 ДИАГНОСТИКА T18: РЕГИСТРАЦИЯ TELEGRAM ПОЛЬЗОВАТЕЛЕЙ');
    console.log('='.repeat(70));
    
    const checks = {
      database: await this.checkDatabaseStructure(),
      telegram: await this.checkTelegramValidation(),
      routes: await this.checkAuthRoutes(),
      services: await this.checkUserService(),
      userCreation: await this.testUserCreation()
    };
    
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ:');
    console.log('='.repeat(70));
    
    Object.entries(checks).forEach(([check, passed]) => {
      const status = passed ? '✅' : '❌';
      const checkName = check.charAt(0).toUpperCase() + check.slice(1);
      console.log(`${status} ${checkName}: ${passed ? 'Пройден' : 'Провален'}`);
    });
    
    console.log(`\n🎯 Общий результат: ${passedChecks}/${totalChecks} проверок пройдено`);
    
    if (this.issues.length > 0) {
      console.log('\n⚠️ НАЙДЕННЫЕ ПРОБЛЕМЫ:');
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    const fixes = this.generateFixPlan();
    if (fixes.length > 0) {
      console.log('\n🔧 ПЛАН ИСПРАВЛЕНИЙ:');
      fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix}`);
      });
    }
    
    if (passedChecks === totalChecks) {
      console.log('\n🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! Система регистрации готова к работе.');
    } else {
      console.log('\n⚠️ Требуются исправления для полной функциональности.');
    }
    
    return {
      passed: passedChecks === totalChecks,
      checks,
      issues: this.issues,
      fixes: this.fixes
    };
  }
}

// Запуск диагностики
async function main() {
  try {
    const diagnostic = new TelegramRegistrationDiagnostic();
    const result = await diagnostic.runDiagnostic();
    
    // Сохраняем отчет
    const report = {
      timestamp: new Date().toISOString(),
      task: 'T18_TELEGRAM_REGISTRATION_DIAGNOSTIC',
      result,
      summary: {
        passed: result.passed,
        issues_count: result.issues.length,
        fixes_count: result.fixes.length
      }
    };
    
    await import('fs').then(fs => {
      fs.writeFileSync('T18_DIAGNOSTIC_REPORT.json', JSON.stringify(report, null, 2));
    });
    
    console.log('\n✅ Отчет сохранен: T18_DIAGNOSTIC_REPORT.json');
    
    await diagnostic.pool.end();
  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TelegramRegistrationDiagnostic };