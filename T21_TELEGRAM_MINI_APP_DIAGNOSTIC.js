/**
 * T21: Полная диагностика Telegram Mini App
 * Проверяет все компоненты цепочки инициализации, авторизации и регистрации
 */

import { readFileSync } from 'fs';
import fetch from 'node-fetch';

class TelegramMiniAppDiagnostic {
  constructor() {
    this.issues = [];
    this.findings = [];
    this.recommendations = [];
  }

  log(status, message, details = null) {
    const timestamp = new Date().toISOString();
    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : status === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${icon} ${message}`);
    if (details) console.log(`    ${JSON.stringify(details, null, 2)}`);
  }

  /**
   * 1. Проверка подключения Telegram WebApp SDK
   */
  checkTelegramSDKIntegration() {
    this.log('info', 'Проверка интеграции Telegram WebApp SDK...');
    
    try {
      const indexHtml = readFileSync('client/index.html', 'utf8');
      
      // Проверяем подключение официального SDK
      if (indexHtml.includes('https://telegram.org/js/telegram-web-app.js')) {
        this.findings.push('✅ Telegram WebApp SDK подключен корректно');
      } else {
        this.issues.push('❌ Отсутствует подключение Telegram WebApp SDK');
      }
      
      // Проверяем мета-теги для Telegram
      if (indexHtml.includes('telegram-web-app-ready')) {
        this.findings.push('✅ Мета-тег telegram-web-app-ready присутствует');
      } else {
        this.issues.push('❌ Отсутствует мета-тег telegram-web-app-ready');
      }
      
      // Проверяем инициализацию в HTML
      if (indexHtml.includes('window.Telegram.WebApp.ready()')) {
        this.findings.push('✅ Вызов ready() присутствует в HTML');
      } else {
        this.issues.push('❌ Отсутствует вызов ready() в HTML');
      }
      
      if (indexHtml.includes('window.Telegram.WebApp.expand()')) {
        this.findings.push('✅ Вызов expand() присутствует в HTML');
      } else {
        this.issues.push('❌ Отсутствует вызов expand() в HTML');
      }
      
    } catch (error) {
      this.issues.push(`❌ Ошибка чтения index.html: ${error.message}`);
    }
  }

  /**
   * 2. Проверка useTelegram hook
   */
  checkUseTelegramHook() {
    this.log('info', 'Проверка useTelegram hook...');
    
    try {
      const hookContent = readFileSync('client/src/hooks/useTelegram.ts', 'utf8');
      
      // Проверяем типы Telegram
      if (hookContent.includes('interface TelegramWebApp')) {
        this.findings.push('✅ Типы TelegramWebApp определены');
      } else {
        this.issues.push('❌ Отсутствуют типы TelegramWebApp');
      }
      
      // Проверяем получение initData
      if (hookContent.includes('setInitData(tg.initData)')) {
        this.findings.push('✅ initData извлекается из Telegram WebApp');
      } else {
        this.issues.push('❌ initData не извлекается');
      }
      
      // Проверяем логирование
      if (hookContent.includes('console.log') && hookContent.includes('initData')) {
        this.findings.push('✅ Логирование initData включено');
      } else {
        this.issues.push('❌ Отсутствует логирование initData');
      }
      
      // Проверяем обработку отсутствия initData
      if (hookContent.includes('No initData provided')) {
        this.findings.push('✅ Обработка отсутствия initData присутствует');
      } else {
        this.issues.push('❌ Отсутствует обработка случая без initData');
      }
      
    } catch (error) {
      this.issues.push(`❌ Ошибка чтения useTelegram.ts: ${error.message}`);
    }
  }

  /**
   * 3. Проверка UserContext автоматической регистрации
   */
  checkUserContextRegistration() {
    this.log('info', 'Проверка автоматической регистрации в UserContext...');
    
    try {
      const userContextContent = readFileSync('client/src/contexts/userContext.tsx', 'utf8');
      
      // Проверяем автоматическую загрузку данных
      if (userContextContent.includes('loadInitialUserData')) {
        this.findings.push('✅ Функция загрузки начальных данных присутствует');
      } else {
        this.issues.push('❌ Отсутствует функция загрузки начальных данных');
      }
      
      // Проверяем проверку Telegram данных
      if (userContextContent.includes('window.Telegram?.WebApp')) {
        this.findings.push('✅ Проверка Telegram данных включена');
      } else {
        this.issues.push('❌ Отсутствует проверка Telegram данных');
      }
      
      // Проверяем попытку авторизации
      if (userContextContent.includes('/api/v2/auth/telegram')) {
        this.findings.push('✅ Попытка авторизации через /api/v2/auth/telegram');
      } else {
        this.issues.push('❌ Отсутствует попытка авторизации');
      }
      
      // Проверяем fallback на регистрацию
      if (userContextContent.includes('/api/v2/register/telegram')) {
        this.findings.push('✅ Fallback на регистрацию присутствует');
      } else {
        this.issues.push('❌ Отсутствует fallback на регистрацию');
      }
      
      // Проверяем передачу initData в заголовках
      if (userContextContent.includes('X-Telegram-Init-Data')) {
        this.findings.push('✅ initData передается в заголовке X-Telegram-Init-Data');
      } else {
        this.issues.push('❌ initData не передается в заголовках');
      }
      
      // Проверяем сохранение токена
      if (userContextContent.includes('unifarm_auth_token')) {
        this.findings.push('✅ JWT токен сохраняется в localStorage');
      } else {
        this.issues.push('❌ JWT токен не сохраняется');
      }
      
    } catch (error) {
      this.issues.push(`❌ Ошибка чтения userContext.tsx: ${error.message}`);
    }
  }

  /**
   * 4. Проверка серверных API маршрутов
   */
  checkServerRoutes() {
    this.log('info', 'Проверка серверных API маршрутов...');
    
    try {
      const routesContent = readFileSync('server/routes.ts', 'utf8');
      
      // Проверяем маршрут авторизации
      if (routesContent.includes('/auth/telegram')) {
        this.findings.push('✅ Маршрут /auth/telegram существует');
      } else {
        this.issues.push('❌ Отсутствует маршрут /auth/telegram');
      }
      
      // Проверяем маршрут регистрации
      if (routesContent.includes('/register/telegram')) {
        this.findings.push('✅ Маршрут /register/telegram существует');
      } else {
        this.issues.push('❌ Отсутствует маршрут /register/telegram');
      }
      
      // Проверяем подключение к AuthController
      if (routesContent.includes('AuthController')) {
        this.findings.push('✅ AuthController подключен к маршрутам');
      } else {
        this.issues.push('❌ AuthController не подключен');
      }
      
    } catch (error) {
      this.issues.push(`❌ Ошибка чтения routes.ts: ${error.message}`);
    }
  }

  /**
   * 5. Проверка AuthController
   */
  checkAuthController() {
    this.log('info', 'Проверка AuthController...');
    
    try {
      const authControllerContent = readFileSync('modules/auth/controller.ts', 'utf8');
      
      // Проверяем метод registerTelegram
      if (authControllerContent.includes('registerTelegram')) {
        this.findings.push('✅ Метод registerTelegram существует');
      } else {
        this.issues.push('❌ Отсутствует метод registerTelegram');
      }
      
      // Проверяем метод authenticateWithTelegram
      if (authControllerContent.includes('authenticateWithTelegram')) {
        this.findings.push('✅ Метод authenticateWithTelegram существует');
      } else {
        this.issues.push('❌ Отсутствует метод authenticateWithTelegram');
      }
      
      // Проверяем извлечение initData из заголовков
      if (authControllerContent.includes('X-Telegram-Init-Data')) {
        this.findings.push('✅ initData извлекается из заголовков');
      } else {
        this.issues.push('❌ initData не извлекается из заголовков');
      }
      
    } catch (error) {
      this.issues.push(`❌ Ошибка чтения auth/controller.ts: ${error.message}`);
    }
  }

  /**
   * 6. Проверка AuthService
   */
  checkAuthService() {
    this.log('info', 'Проверка AuthService...');
    
    try {
      const authServiceContent = readFileSync('modules/auth/service.ts', 'utf8');
      
      // Проверяем метод registerWithTelegram
      if (authServiceContent.includes('registerWithTelegram')) {
        this.findings.push('✅ Метод registerWithTelegram существует');
      } else {
        this.issues.push('❌ Отсутствует метод registerWithTelegram');
      }
      
      // Проверяем HMAC валидацию
      if (authServiceContent.includes('validateTelegramInitData')) {
        this.findings.push('✅ HMAC валидация Telegram данных включена');
      } else {
        this.issues.push('❌ Отсутствует HMAC валидация');
      }
      
      // Проверяем импорт UserService
      if (authServiceContent.includes('UserService')) {
        this.findings.push('✅ UserService импортирован');
      } else {
        this.issues.push('❌ UserService не импортирован');
      }
      
      // Проверяем null-safe обработку
      if (authServiceContent.includes('|| undefined')) {
        this.findings.push('✅ Null-safe обработка данных включена');
      } else {
        this.issues.push('❌ Отсутствует null-safe обработка');
      }
      
    } catch (error) {
      this.issues.push(`❌ Ошибка чтения auth/service.ts: ${error.message}`);
    }
  }

  /**
   * 7. Проверка UserService
   */
  checkUserService() {
    this.log('info', 'Проверка UserService...');
    
    try {
      const userServiceContent = readFileSync('modules/user/service.ts', 'utf8');
      
      // Проверяем метод findOrCreateFromTelegram
      if (userServiceContent.includes('findOrCreateFromTelegram')) {
        this.findings.push('✅ Метод findOrCreateFromTelegram существует');
      } else {
        this.issues.push('❌ Отсутствует метод findOrCreateFromTelegram');
      }
      
      // Проверяем метод findUserByTelegramId
      if (userServiceContent.includes('findUserByTelegramId')) {
        this.findings.push('✅ Метод findUserByTelegramId существует');
      } else {
        this.issues.push('❌ Отсутствует метод findUserByTelegramId');
      }
      
      // Проверяем метод createFromTelegram
      if (userServiceContent.includes('createFromTelegram')) {
        this.findings.push('✅ Метод createFromTelegram существует');
      } else {
        this.issues.push('❌ Отсутствует метод createFromTelegram');
      }
      
      // Проверяем генерацию ref_code
      if (userServiceContent.includes('REF') && userServiceContent.includes('Date.now')) {
        this.findings.push('✅ Генерация ref_code включена');
      } else {
        this.issues.push('❌ Отсутствует генерация ref_code');
      }
      
      // Проверяем подключение к базе данных
      if (userServiceContent.includes('from \'../../core/db\'')) {
        this.findings.push('✅ Корректное подключение к базе данных');
      } else {
        this.issues.push('❌ Некорректное подключение к базе данных');
      }
      
    } catch (error) {
      this.issues.push(`❌ Ошибка чтения user/service.ts: ${error.message}`);
    }
  }

  /**
   * 8. Проверка Telegram middleware
   */
  checkTelegramMiddleware() {
    this.log('info', 'Проверка Telegram middleware...');
    
    try {
      const middlewareContent = readFileSync('core/middleware/telegramMiddleware.ts', 'utf8');
      
      // Проверяем интерфейс TelegramRequest
      if (middlewareContent.includes('interface TelegramRequest')) {
        this.findings.push('✅ Интерфейс TelegramRequest определен');
      } else {
        this.issues.push('❌ Отсутствует интерфейс TelegramRequest');
      }
      
      // Проверяем функцию telegramMiddleware
      if (middlewareContent.includes('function telegramMiddleware')) {
        this.findings.push('✅ Функция telegramMiddleware существует');
      } else {
        this.issues.push('❌ Отсутствует функция telegramMiddleware');
      }
      
      // Проверяем извлечение X-Telegram-Init-Data
      if (middlewareContent.includes('x-telegram-init-data')) {
        this.findings.push('✅ Извлечение X-Telegram-Init-Data включено');
      } else {
        this.issues.push('❌ Отсутствует извлечение X-Telegram-Init-Data');
      }
      
    } catch (error) {
      this.issues.push(`❌ Ошибка чтения telegramMiddleware.ts: ${error.message}`);
    }
  }

  /**
   * 9. Проверка переменных окружения
   */
  checkEnvironmentVariables() {
    this.log('info', 'Проверка переменных окружения...');
    
    // Проверяем TELEGRAM_BOT_TOKEN
    if (process.env.TELEGRAM_BOT_TOKEN) {
      this.findings.push('✅ TELEGRAM_BOT_TOKEN присутствует');
      
      // Проверяем формат токена
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const tokenPattern = /^\d+:[A-Za-z0-9_-]{35}$/;
      if (tokenPattern.test(token)) {
        this.findings.push('✅ Формат TELEGRAM_BOT_TOKEN корректный');
      } else {
        this.issues.push('❌ Некорректный формат TELEGRAM_BOT_TOKEN');
      }
    } else {
      this.issues.push('❌ Отсутствует TELEGRAM_BOT_TOKEN');
    }
    
    // Проверяем DATABASE_URL
    if (process.env.DATABASE_URL) {
      this.findings.push('✅ DATABASE_URL присутствует');
    } else {
      this.issues.push('❌ Отсутствует DATABASE_URL');
    }
  }

  /**
   * 10. Проверка vite.config.ts для SPA fallback
   */
  checkViteConfig() {
    this.log('info', 'Проверка конфигурации Vite...');
    
    try {
      const viteConfigContent = readFileSync('vite.config.ts', 'utf8');
      
      // Проверяем настройку historyApiFallback или аналог
      if (viteConfigContent.includes('historyApiFallback') || viteConfigContent.includes('fallback')) {
        this.findings.push('✅ SPA fallback настроен');
      } else {
        this.issues.push('❌ Отсутствует настройка SPA fallback');
      }
      
    } catch (error) {
      this.issues.push(`❌ Ошибка чтения vite.config.ts: ${error.message}`);
    }
  }

  /**
   * 11. Анализ потенциальных причин "Not Found"
   */
  analyzeNotFoundCauses() {
    this.log('info', 'Анализ потенциальных причин "Not Found"...');
    
    // Проверяем настройки маршрутизации
    try {
      const appContent = readFileSync('client/src/App.tsx', 'utf8');
      
      if (appContent.includes('TelegramWebAppCheck')) {
        this.findings.push('✅ TelegramWebAppCheck компонент присутствует');
      } else {
        this.issues.push('❌ Отсутствует TelegramWebAppCheck компонент');
      }
      
      // Проверяем обработку маршрутов
      if (appContent.includes('Route') || appContent.includes('router')) {
        this.findings.push('✅ Маршрутизация настроена');
      } else {
        this.issues.push('❌ Отсутствует настройка маршрутизации');
      }
      
    } catch (error) {
      this.issues.push(`❌ Ошибка анализа App.tsx: ${error.message}`);
    }
  }

  /**
   * Генерация рекомендаций
   */
  generateRecommendations() {
    this.log('info', 'Генерация рекомендаций...');
    
    // Основные рекомендации на основе найденных проблем
    if (this.issues.some(issue => issue.includes('initData'))) {
      this.recommendations.push('🔧 Добавить дополнительное логирование initData в main.tsx для отладки');
    }
    
    if (this.issues.some(issue => issue.includes('SDK'))) {
      this.recommendations.push('🔧 Проверить подключение Telegram WebApp SDK');
    }
    
    if (this.issues.some(issue => issue.includes('TELEGRAM_BOT_TOKEN'))) {
      this.recommendations.push('🔧 Установить корректный TELEGRAM_BOT_TOKEN в переменных окружения');
    }
    
    if (this.issues.some(issue => issue.includes('database'))) {
      this.recommendations.push('🔧 Проверить подключение к базе данных Neon');
    }
    
    if (this.issues.some(issue => issue.includes('Not Found'))) {
      this.recommendations.push('🔧 Настроить SPA fallback для корректной работы маршрутизации');
    }
    
    // Общие рекомендации
    this.recommendations.push('🧪 Протестировать приложение напрямую в Telegram через @UniFarming_Bot');
    this.recommendations.push('📱 Проверить работу в мобильном браузере для эмуляции Telegram среды');
    this.recommendations.push('🔍 Включить console.log в production для отладки initData');
  }

  /**
   * Основной метод диагностики
   */
  async runDiagnostic() {
    this.log('info', 'Запуск полной диагностики Telegram Mini App...');
    
    // Выполняем все проверки
    this.checkTelegramSDKIntegration();
    this.checkUseTelegramHook();
    this.checkUserContextRegistration();
    this.checkServerRoutes();
    this.checkAuthController();
    this.checkAuthService();
    this.checkUserService();
    this.checkTelegramMiddleware();
    this.checkEnvironmentVariables();
    this.checkViteConfig();
    this.analyzeNotFoundCauses();
    
    // Генерируем рекомендации
    this.generateRecommendations();
    
    // Создаем итоговый отчет
    const report = {
      timestamp: new Date().toISOString(),
      task: 'T21_TELEGRAM_MINI_APP_DIAGNOSTIC',
      total_checks: 11,
      issues_found: this.issues.length,
      findings_confirmed: this.findings.length,
      recommendations_generated: this.recommendations.length,
      status: this.issues.length === 0 ? 'HEALTHY' : this.issues.length <= 3 ? 'MINOR_ISSUES' : 'MAJOR_ISSUES',
      
      findings: this.findings,
      issues: this.issues,
      recommendations: this.recommendations,
      
      summary: {
        telegram_sdk_integration: this.findings.filter(f => f.includes('SDK')).length > 0,
        user_registration_flow: this.findings.filter(f => f.includes('register')).length > 0,
        api_endpoints: this.findings.filter(f => f.includes('маршрут')).length > 0,
        environment_config: this.findings.filter(f => f.includes('TOKEN')).length > 0
      }
    };
    
    console.log('\n' + '='.repeat(80));
    console.log('ОТЧЕТ T21: ДИАГНОСТИКА TELEGRAM MINI APP');
    console.log('='.repeat(80));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(80));
    
    return report;
  }
}

async function main() {
  try {
    const diagnostic = new TelegramMiniAppDiagnostic();
    await diagnostic.runDiagnostic();
  } catch (error) {
    console.error('Критическая ошибка диагностики:', error);
    process.exit(1);
  }
}

main();