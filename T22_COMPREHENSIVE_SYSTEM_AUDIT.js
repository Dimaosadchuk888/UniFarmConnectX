/**
 * T22: Комплексная проверка всей системы UniFarm
 * Полный аудит для выявления скрытых проблем
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

class ComprehensiveSystemAudit {
  constructor() {
    this.criticalIssues = [];
    this.warnings = [];
    this.recommendations = [];
    this.checkedComponents = [];
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const icon = level === 'critical' ? '🔴' : level === 'warning' ? '🟡' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${icon} ${message}`);
    if (details) console.log(`    ${JSON.stringify(details, null, 2)}`);
  }

  /**
   * 1. Проверка целостности файловой структуры
   */
  checkFileStructure() {
    this.log('info', 'Проверка целостности файловой структуры...');
    
    const criticalFiles = [
      'package.json',
      'client/index.html',
      'client/src/main.tsx',
      'client/src/App.tsx',
      'server/routes.ts',
      'modules/auth/controller.ts',
      'modules/auth/service.ts',
      'modules/user/service.ts',
      'shared/schema.ts',
      'core/db.ts',
      'utils/telegram.ts'
    ];

    let missingFiles = [];
    
    criticalFiles.forEach(file => {
      if (!existsSync(file)) {
        missingFiles.push(file);
      }
    });

    if (missingFiles.length > 0) {
      this.criticalIssues.push(`Отсутствуют критичные файлы: ${missingFiles.join(', ')}`);
    } else {
      this.checkedComponents.push('✅ Все критичные файлы присутствуют');
    }
  }

  /**
   * 2. Анализ зависимостей и импортов
   */
  checkDependencies() {
    this.log('info', 'Анализ зависимостей и импортов...');
    
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      
      // Проверяем критичные зависимости
      const criticalDeps = [
        '@neondatabase/serverless',
        'drizzle-orm',
        'express',
        'jsonwebtoken',
        '@tonconnect/ui-react',
        'react',
        'typescript'
      ];

      const missingDeps = criticalDeps.filter(dep => 
        !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
      );

      if (missingDeps.length > 0) {
        this.criticalIssues.push(`Отсутствуют критичные зависимости: ${missingDeps.join(', ')}`);
      } else {
        this.checkedComponents.push('✅ Все критичные зависимости установлены');
      }

      // Проверяем скрипты
      if (!packageJson.scripts?.dev) {
        this.warnings.push('Отсутствует скрипт dev в package.json');
      }

    } catch (error) {
      this.criticalIssues.push(`Ошибка чтения package.json: ${error.message}`);
    }
  }

  /**
   * 3. Проверка схемы базы данных
   */
  checkDatabaseSchema() {
    this.log('info', 'Проверка схемы базы данных...');
    
    try {
      const schemaContent = readFileSync('shared/schema.ts', 'utf8');
      
      // Проверяем основные таблицы
      const requiredTables = [
        'users',
        'user_sessions',
        'farming_deposits',
        'referral_earnings',
        'missions',
        'user_missions'
      ];

      const missingTables = requiredTables.filter(table => 
        !schemaContent.includes(`export const ${table}`)
      );

      if (missingTables.length > 0) {
        this.warnings.push(`Возможно отсутствуют таблицы в схеме: ${missingTables.join(', ')}`);
      } else {
        this.checkedComponents.push('✅ Основные таблицы определены в схеме');
      }

      // Проверяем наличие типов
      if (!schemaContent.includes('export type User')) {
        this.warnings.push('Отсутствуют экспортируемые типы User');
      }

      // Проверяем наличие insert схем
      if (!schemaContent.includes('createInsertSchema')) {
        this.warnings.push('Отсутствуют Zod схемы для валидации');
      }

    } catch (error) {
      this.criticalIssues.push(`Ошибка чтения schema.ts: ${error.message}`);
    }
  }

  /**
   * 4. Проверка API маршрутов и контроллеров
   */
  checkAPIConsistency() {
    this.log('info', 'Проверка согласованности API маршрутов...');
    
    try {
      const routesContent = readFileSync('server/routes.ts', 'utf8');
      const authControllerContent = readFileSync('modules/auth/controller.ts', 'utf8');
      
      // Проверяем соответствие маршрутов и методов контроллера
      const routeChecks = [
        {
          route: '/auth/telegram',
          method: 'authenticateTelegram',
          required: true
        },
        {
          route: '/register/telegram', 
          method: 'registerTelegram',
          required: true
        }
      ];

      routeChecks.forEach(check => {
        const hasRoute = routesContent.includes(check.route);
        const hasMethod = authControllerContent.includes(check.method);
        
        if (check.required && (!hasRoute || !hasMethod)) {
          this.criticalIssues.push(`Несоответствие маршрута ${check.route} и метода ${check.method}`);
        }
      });

      this.checkedComponents.push('✅ Основные API маршруты проверены');

    } catch (error) {
      this.criticalIssues.push(`Ошибка проверки API: ${error.message}`);
    }
  }

  /**
   * 5. Проверка клиентской части
   */
  checkFrontendIntegrity() {
    this.log('info', 'Проверка целостности фронтенда...');
    
    try {
      const appContent = readFileSync('client/src/App.tsx', 'utf8');
      const userContextContent = readFileSync('client/src/contexts/userContext.tsx', 'utf8');
      
      // Проверяем основные хуки и контексты
      if (!appContent.includes('UserProvider')) {
        this.criticalIssues.push('UserProvider не подключен в App.tsx');
      }

      if (!userContextContent.includes('loadInitialUserData')) {
        this.criticalIssues.push('Отсутствует функция загрузки начальных данных пользователя');
      }

      // Проверяем наличие Telegram интеграции
      if (!userContextContent.includes('window.Telegram?.WebApp')) {
        this.criticalIssues.push('Отсутствует проверка Telegram WebApp в UserContext');
      }

      this.checkedComponents.push('✅ Основные компоненты фронтенда проверены');

    } catch (error) {
      this.criticalIssues.push(`Ошибка проверки фронтенда: ${error.message}`);
    }
  }

  /**
   * 6. Проверка сервисов аутентификации
   */
  checkAuthenticationFlow() {
    this.log('info', 'Проверка потока аутентификации...');
    
    try {
      const authServiceContent = readFileSync('modules/auth/service.ts', 'utf8');
      const userServiceContent = readFileSync('modules/user/service.ts', 'utf8');
      
      // Проверяем методы AuthService
      const requiredAuthMethods = [
        'authenticateWithTelegram',
        'registerWithTelegram'
      ];

      const missingAuthMethods = requiredAuthMethods.filter(method => 
        !authServiceContent.includes(method)
      );

      if (missingAuthMethods.length > 0) {
        this.criticalIssues.push(`Отсутствуют методы в AuthService: ${missingAuthMethods.join(', ')}`);
      }

      // Проверяем методы UserService
      const requiredUserMethods = [
        'findUserByTelegramId',
        'createFromTelegram',
        'findOrCreateFromTelegram'
      ];

      const missingUserMethods = requiredUserMethods.filter(method => 
        !userServiceContent.includes(method)
      );

      if (missingUserMethods.length > 0) {
        this.criticalIssues.push(`Отсутствуют методы в UserService: ${missingUserMethods.join(', ')}`);
      }

      // Проверяем HMAC валидацию
      if (!authServiceContent.includes('validateTelegramInitData')) {
        this.criticalIssues.push('Отсутствует HMAC валидация Telegram данных');
      }

      this.checkedComponents.push('✅ Поток аутентификации проверен');

    } catch (error) {
      this.criticalIssues.push(`Ошибка проверки аутентификации: ${error.message}`);
    }
  }

  /**
   * 7. Проверка переменных окружения
   */
  checkEnvironmentConfig() {
    this.log('info', 'Проверка конфигурации окружения...');
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'TELEGRAM_BOT_TOKEN'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
      this.criticalIssues.push(`Отсутствуют переменные окружения: ${missingEnvVars.join(', ')}`);
    } else {
      this.checkedComponents.push('✅ Основные переменные окружения настроены');
    }

    // Проверяем формат TELEGRAM_BOT_TOKEN
    if (process.env.TELEGRAM_BOT_TOKEN) {
      const tokenPattern = /^\d+:[A-Za-z0-9_-]{35}$/;
      if (!tokenPattern.test(process.env.TELEGRAM_BOT_TOKEN)) {
        this.warnings.push('Возможно некорректный формат TELEGRAM_BOT_TOKEN');
      }
    }
  }

  /**
   * 8. Проверка middleware и безопасности
   */
  checkSecurityMiddleware() {
    this.log('info', 'Проверка middleware безопасности...');
    
    try {
      const routesContent = readFileSync('server/routes.ts', 'utf8');
      
      // Проверяем наличие CORS
      if (!routesContent.includes('cors') && !existsSync('core/middleware/cors.ts')) {
        this.warnings.push('Возможно отсутствует настройка CORS');
      }

      // Проверяем валидацию данных
      if (!routesContent.includes('validateBody') && !routesContent.includes('validate')) {
        this.warnings.push('Возможно отсутствует валидация входящих данных');
      }

      this.checkedComponents.push('✅ Middleware безопасности проверен');

    } catch (error) {
      this.warnings.push(`Ошибка проверки middleware: ${error.message}`);
    }
  }

  /**
   * 9. Проверка логирования и мониторинга
   */
  checkLoggingAndMonitoring() {
    this.log('info', 'Проверка логирования и мониторинга...');
    
    try {
      // Проверяем наличие системы логирования
      if (!existsSync('core/logger.ts') && !existsSync('core/logger.js')) {
        this.warnings.push('Отсутствует централизованная система логирования');
      } else {
        this.checkedComponents.push('✅ Система логирования настроена');
      }

      // Проверяем health check endpoint
      const routesContent = readFileSync('server/routes.ts', 'utf8');
      if (!routesContent.includes('/health')) {
        this.warnings.push('Отсутствует health check endpoint');
      }

    } catch (error) {
      this.warnings.push(`Ошибка проверки мониторинга: ${error.message}`);
    }
  }

  /**
   * 10. Проверка обработки ошибок
   */
  checkErrorHandling() {
    this.log('info', 'Проверка обработки ошибок...');
    
    try {
      const appContent = readFileSync('client/src/App.tsx', 'utf8');
      
      // Проверяем ErrorBoundary
      if (!appContent.includes('ErrorBoundary')) {
        this.warnings.push('Отсутствует ErrorBoundary для обработки ошибок React');
      }

      // Проверяем обработку ошибок в UserContext
      const userContextContent = readFileSync('client/src/contexts/userContext.tsx', 'utf8');
      if (!userContextContent.includes('try') || !userContextContent.includes('catch')) {
        this.warnings.push('Недостаточная обработка ошибок в UserContext');
      }

      this.checkedComponents.push('✅ Базовая обработка ошибок проверена');

    } catch (error) {
      this.warnings.push(`Ошибка проверки обработки ошибок: ${error.message}`);
    }
  }

  /**
   * 11. Проверка производительности и оптимизации
   */
  checkPerformanceOptimizations() {
    this.log('info', 'Проверка оптимизаций производительности...');
    
    try {
      const appContent = readFileSync('client/src/App.tsx', 'utf8');
      
      // Проверяем lazy loading
      if (!appContent.includes('lazy') && !appContent.includes('Suspense')) {
        this.warnings.push('Отсутствует lazy loading компонентов');
      }

      // Проверяем React Query
      if (!appContent.includes('QueryClientProvider')) {
        this.warnings.push('Возможно не настроен QueryClient для кеширования');
      } else {
        this.checkedComponents.push('✅ React Query настроен для оптимизации запросов');
      }

    } catch (error) {
      this.warnings.push(`Ошибка проверки производительности: ${error.message}`);
    }
  }

  /**
   * 12. Проверка совместимости с Telegram
   */
  checkTelegramCompatibility() {
    this.log('info', 'Проверка совместимости с Telegram...');
    
    try {
      const indexHtml = readFileSync('client/index.html', 'utf8');
      
      // Проверяем мета-теги для Telegram
      const telegramMetas = [
        'telegram-web-app-ready',
        'viewport',
        'format-detection'
      ];

      const missingMetas = telegramMetas.filter(meta => !indexHtml.includes(meta));
      
      if (missingMetas.length > 0) {
        this.warnings.push(`Отсутствуют мета-теги для Telegram: ${missingMetas.join(', ')}`);
      }

      // Проверяем подключение Telegram SDK
      if (!indexHtml.includes('telegram-web-app.js')) {
        this.criticalIssues.push('Отсутствует подключение Telegram WebApp SDK');
      }

      this.checkedComponents.push('✅ Базовая совместимость с Telegram проверена');

    } catch (error) {
      this.criticalIssues.push(`Ошибка проверки Telegram совместимости: ${error.message}`);
    }
  }

  /**
   * Генерация рекомендаций
   */
  generateRecommendations() {
    this.log('info', 'Генерация рекомендаций...');
    
    // Критичные рекомендации
    if (this.criticalIssues.length > 0) {
      this.recommendations.push('🔴 КРИТИЧНО: Немедленно исправить критичные проблемы');
    }
    
    // Рекомендации по безопасности
    if (this.warnings.some(w => w.includes('CORS') || w.includes('валидация'))) {
      this.recommendations.push('🔒 Усилить настройки безопасности');
    }
    
    // Рекомендации по производительности
    if (this.warnings.some(w => w.includes('lazy') || w.includes('оптимизация'))) {
      this.recommendations.push('⚡ Добавить оптимизации производительности');
    }
    
    // Рекомендации по мониторингу
    if (this.warnings.some(w => w.includes('логирование') || w.includes('мониторинг'))) {
      this.recommendations.push('📊 Улучшить систему мониторинга');
    }
    
    // Общие рекомендации
    this.recommendations.push('🧪 Провести полное тестирование в Telegram');
    this.recommendations.push('📱 Протестировать на различных устройствах');
    this.recommendations.push('🔍 Настроить автоматическое тестирование');
  }

  /**
   * Основной метод аудита
   */
  async runComprehensiveAudit() {
    this.log('info', 'Запуск комплексного аудита системы...');
    
    // Выполняем все проверки
    this.checkFileStructure();
    this.checkDependencies();
    this.checkDatabaseSchema();
    this.checkAPIConsistency();
    this.checkFrontendIntegrity();
    this.checkAuthenticationFlow();
    this.checkEnvironmentConfig();
    this.checkSecurityMiddleware();
    this.checkLoggingAndMonitoring();
    this.checkErrorHandling();
    this.checkPerformanceOptimizations();
    this.checkTelegramCompatibility();
    
    // Генерируем рекомендации
    this.generateRecommendations();
    
    // Создаем итоговый отчет
    const report = {
      timestamp: new Date().toISOString(),
      task: 'T22_COMPREHENSIVE_SYSTEM_AUDIT',
      audit_scope: '12 категорий проверок',
      system_health: this.criticalIssues.length === 0 ? 'ЗДОРОВАЯ' : 
                     this.criticalIssues.length <= 2 ? 'ТРЕБУЕТ_ВНИМАНИЯ' : 'КРИТИЧНЫЕ_ПРОБЛЕМЫ',
      
      summary: {
        critical_issues: this.criticalIssues.length,
        warnings: this.warnings.length,
        verified_components: this.checkedComponents.length,
        recommendations: this.recommendations.length
      },
      
      details: {
        critical_issues: this.criticalIssues,
        warnings: this.warnings,
        verified_components: this.checkedComponents,
        recommendations: this.recommendations
      },
      
      next_steps: [
        'Исправить все критичные проблемы',
        'Рассмотреть предупреждения',
        'Внедрить рекомендации',
        'Провести финальное тестирование'
      ]
    };
    
    console.log('\n' + '='.repeat(80));
    console.log('КОМПЛЕКСНЫЙ АУДИТ СИСТЕМЫ T22');
    console.log('='.repeat(80));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(80));
    
    return report;
  }
}

async function main() {
  try {
    const audit = new ComprehensiveSystemAudit();
    await audit.runComprehensiveAudit();
  } catch (error) {
    console.error('Критическая ошибка аудита:', error);
    process.exit(1);
  }
}

main();