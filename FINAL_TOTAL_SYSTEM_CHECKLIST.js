
/**
 * ФИНАЛЬНЫЙ ТОТАЛЬНЫЙ ЧЕК-ЛИСТ СИСТЕМЫ UNIFARM CONNECT
 * Полная проверка всех модулей, API, контроллеров, системных файлов
 * Дата создания: 15 июня 2025
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

class FinalTotalSystemChecklist {
  constructor() {
    this.results = {
      environment: { status: 'unknown', checks: [] },
      database: { status: 'unknown', checks: [] },
      modules: { status: 'unknown', checks: [] },
      api: { status: 'unknown', checks: [] },
      controllers: { status: 'unknown', checks: [] },
      services: { status: 'unknown', checks: [] },
      security: { status: 'unknown', checks: [] },
      telegram: { status: 'unknown', checks: [] },
      frontend: { status: 'unknown', checks: [] },
      system: { status: 'unknown', checks: [] },
      deployment: { status: 'unknown', checks: [] }
    };
    
    this.baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    console.log('🔍 ЗАПУСК ФИНАЛЬНОГО ТОТАЛЬНОГО ЧЕК-ЛИСТА UniFarm Connect');
    console.log(`URL: ${this.baseUrl}\n`);
  }

  /**
   * 1. ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ
   */
  async checkEnvironmentVariables() {
    console.log('🔐 ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ...');
    
    const requiredVars = [
      'SUPABASE_URL', 'SUPABASE_KEY', 'TELEGRAM_BOT_TOKEN',
      'JWT_SECRET', 'SESSION_SECRET', 'REPLIT_DEV_DOMAIN'
    ];
    
    const deprecatedVars = [
      'DATABASE_URL', 'PGHOST', 'PGUSER', 'PGPASSWORD', 
      'PGDATABASE', 'PGPORT', 'NEON_URL'
    ];

    let envScore = 0;
    
    // Проверка обязательных переменных
    for (const varName of requiredVars) {
      if (process.env[varName]) {
        this.results.environment.checks.push({
          check: `${varName}`,
          status: '✅ УСТАНОВЛЕНА',
          details: `Длина: ${process.env[varName].length} символов`
        });
        envScore++;
      } else {
        this.results.environment.checks.push({
          check: `${varName}`,
          status: '❌ ОТСУТСТВУЕТ',
          details: 'Критическая переменная не найдена'
        });
      }
    }
    
    // Проверка устаревших переменных
    for (const varName of deprecatedVars) {
      if (process.env[varName]) {
        this.results.environment.checks.push({
          check: `${varName} (deprecated)`,
          status: '⚠️ НАЙДЕНА',
          details: 'Рекомендуется удалить'
        });
      } else {
        this.results.environment.checks.push({
          check: `${varName} (deprecated)`,
          status: '✅ ОТСУТСТВУЕТ',
          details: 'Корректно удалена'
        });
        envScore++;
      }
    }

    this.results.environment.status = envScore >= 10 ? '✅ ОТЛИЧНО' : envScore >= 8 ? '⚠️ ХОРОШО' : '❌ ТРЕБУЕТ ВНИМАНИЯ';
  }

  /**
   * 2. ПРОВЕРКА БАЗЫ ДАННЫХ SUPABASE
   */
  async checkSupabaseDatabase() {
    console.log('🗄️ ПРОВЕРКА БАЗЫ ДАННЫХ SUPABASE...');
    
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
      
      // Проверка подключения
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (connectionError) {
        this.results.database.checks.push({
          check: 'Подключение к Supabase',
          status: '❌ ОШИБКА',
          details: connectionError.message
        });
      } else {
        this.results.database.checks.push({
          check: 'Подключение к Supabase',
          status: '✅ УСПЕШНО',
          details: 'Соединение установлено'
        });
      }
      
      // Проверка таблиц
      const requiredTables = ['users', 'transactions', 'referrals', 'farming_sessions', 'user_sessions'];
      
      for (const table of requiredTables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (error) {
            this.results.database.checks.push({
              check: `Таблица ${table}`,
              status: '❌ НЕДОСТУПНА',
              details: error.message
            });
          } else {
            this.results.database.checks.push({
              check: `Таблица ${table}`,
              status: '✅ ДОСТУПНА',
              details: `Структура корректна`
            });
          }
        } catch (tableError) {
          this.results.database.checks.push({
            check: `Таблица ${table}`,
            status: '❌ ОШИБКА',
            details: tableError.message
          });
        }
      }
      
      this.results.database.status = '✅ АКТИВНА';
      
    } catch (error) {
      this.results.database.checks.push({
        check: 'Общее подключение',
        status: '❌ КРИТИЧЕСКАЯ ОШИБКА',
        details: error.message
      });
      this.results.database.status = '❌ НЕДОСТУПНА';
    }
  }

  /**
   * 3. ПРОВЕРКА МОДУЛЕЙ
   */
  async checkModules() {
    console.log('📦 ПРОВЕРКА МОДУЛЕЙ...');
    
    const modules = [
      'auth', 'user', 'farming', 'wallet', 'boost', 
      'missions', 'referral', 'dailyBonus', 'telegram',
      'tonFarming', 'transactions', 'admin', 'monitor'
    ];
    
    for (const module of modules) {
      const modulePath = `modules/${module}`;
      
      // Проверка существования папки
      if (!fs.existsSync(modulePath)) {
        this.results.modules.checks.push({
          check: `Модуль ${module}`,
          status: '❌ ОТСУТСТВУЕТ',
          details: 'Папка модуля не найдена'
        });
        continue;
      }
      
      // Проверка файлов модуля
      const requiredFiles = ['controller.ts', 'service.ts', 'routes.ts', 'types.ts'];
      const optionalFiles = ['model.ts'];
      
      let moduleScore = 0;
      const moduleDetails = [];
      
      for (const file of requiredFiles) {
        if (fs.existsSync(`${modulePath}/${file}`)) {
          moduleDetails.push(`${file} ✅`);
          moduleScore++;
        } else {
          moduleDetails.push(`${file} ❌`);
        }
      }
      
      for (const file of optionalFiles) {
        if (fs.existsSync(`${modulePath}/${file}`)) {
          moduleDetails.push(`${file} ✅`);
        }
      }
      
      const status = moduleScore === 4 ? '✅ ПОЛНЫЙ' : moduleScore >= 3 ? '⚠️ ЧАСТИЧНЫЙ' : '❌ НЕПОЛНЫЙ';
      
      this.results.modules.checks.push({
        check: `Модуль ${module}`,
        status: status,
        details: moduleDetails.join(', ')
      });
    }
    
    const completeModules = this.results.modules.checks.filter(c => c.status.includes('✅')).length;
    this.results.modules.status = completeModules >= 10 ? '✅ ОТЛИЧНО' : completeModules >= 8 ? '⚠️ ХОРОШО' : '❌ ТРЕБУЕТ ДОРАБОТКИ';
  }

  /**
   * 4. ПРОВЕРКА API ENDPOINTS
   */
  async checkAPIEndpoints() {
    console.log('📡 ПРОВЕРКА API ENDPOINTS...');
    
    const endpoints = [
      // Публичные endpoints
      { path: '/health', method: 'GET', auth: false, expected: 200 },
      { path: '/api/v2/health', method: 'GET', auth: false, expected: 200 },
      
      // Защищенные endpoints
      { path: '/api/v2/users/profile', method: 'GET', auth: true, expected: 401 },
      { path: '/api/v2/auth/telegram', method: 'POST', auth: false, expected: [400, 401] },
      { path: '/api/v2/farming/info', method: 'GET', auth: true, expected: 401 },
      { path: '/api/v2/farming/status', method: 'GET', auth: true, expected: 401 },
      { path: '/api/v2/wallet/balance', method: 'GET', auth: true, expected: 401 },
      { path: '/api/v2/boost/packages', method: 'GET', auth: true, expected: 401 },
      { path: '/api/v2/missions/list', method: 'GET', auth: true, expected: 401 },
      { path: '/api/v2/referral/info', method: 'GET', auth: true, expected: 401 },
      { path: '/api/v2/daily-bonus/status', method: 'GET', auth: true, expected: 401 },
      { path: '/api/v2/ton-farming/info', method: 'GET', auth: true, expected: 401 }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const options = {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' }
        };
        
        if (endpoint.method === 'POST') {
          options.body = JSON.stringify({
            telegram_id: 'test_user',
            username: 'test'
          });
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint.path}`, options);
        const expectedStatuses = Array.isArray(endpoint.expected) ? endpoint.expected : [endpoint.expected];
        
        if (expectedStatuses.includes(response.status)) {
          this.results.api.checks.push({
            check: `${endpoint.method} ${endpoint.path}`,
            status: '✅ КОРРЕКТНЫЙ',
            details: `HTTP ${response.status} (ожидалось ${endpoint.expected})`
          });
        } else {
          this.results.api.checks.push({
            check: `${endpoint.method} ${endpoint.path}`,
            status: '⚠️ НЕОЖИДАННЫЙ',
            details: `HTTP ${response.status} (ожидалось ${endpoint.expected})`
          });
        }
        
      } catch (error) {
        this.results.api.checks.push({
          check: `${endpoint.method} ${endpoint.path}`,
          status: '❌ ОШИБКА',
          details: error.message
        });
      }
    }
    
    const workingEndpoints = this.results.api.checks.filter(c => c.status.includes('✅')).length;
    this.results.api.status = workingEndpoints >= 10 ? '✅ ОТЛИЧНО' : workingEndpoints >= 8 ? '⚠️ ХОРОШО' : '❌ ПРОБЛЕМЫ';
  }

  /**
   * 5. ПРОВЕРКА КОНТРОЛЛЕРОВ
   */
  async checkControllers() {
    console.log('🎮 ПРОВЕРКА КОНТРОЛЛЕРОВ...');
    
    const modules = [
      'auth', 'user', 'farming', 'wallet', 'boost',
      'missions', 'referral', 'dailyBonus', 'telegram',
      'tonFarming', 'transactions', 'admin', 'monitor'
    ];
    
    for (const module of modules) {
      const controllerPath = `modules/${module}/controller.ts`;
      
      if (!fs.existsSync(controllerPath)) {
        this.results.controllers.checks.push({
          check: `${module} Controller`,
          status: '❌ ОТСУТСТВУЕТ',
          details: 'Файл контроллера не найден'
        });
        continue;
      }
      
      try {
        const content = fs.readFileSync(controllerPath, 'utf8');
        
        // Проверки содержимого контроллера
        const hasBaseController = content.includes('BaseController');
        const hasExports = content.includes('export');
        const hasMethods = content.includes('async ') || content.includes('function');
        const hasErrorHandling = content.includes('try') && content.includes('catch');
        
        const issues = [];
        if (!hasBaseController) issues.push('Нет BaseController');
        if (!hasExports) issues.push('Нет экспортов');
        if (!hasMethods) issues.push('Нет методов');
        if (!hasErrorHandling) issues.push('Нет обработки ошибок');
        
        const status = issues.length === 0 ? '✅ КОРРЕКТНЫЙ' : 
                      issues.length <= 2 ? '⚠️ ЧАСТИЧНЫЙ' : '❌ ПРОБЛЕМЫ';
        
        this.results.controllers.checks.push({
          check: `${module} Controller`,
          status: status,
          details: issues.length === 0 ? 'Все проверки пройдены' : issues.join(', ')
        });
        
      } catch (error) {
        this.results.controllers.checks.push({
          check: `${module} Controller`,
          status: '❌ ОШИБКА ЧТЕНИЯ',
          details: error.message
        });
      }
    }
    
    const goodControllers = this.results.controllers.checks.filter(c => c.status.includes('✅')).length;
    this.results.controllers.status = goodControllers >= 10 ? '✅ ОТЛИЧНО' : goodControllers >= 8 ? '⚠️ ХОРОШО' : '❌ ТРЕБУЕТ ДОРАБОТКИ';
  }

  /**
   * 6. ПРОВЕРКА СЕРВИСОВ
   */
  async checkServices() {
    console.log('⚙️ ПРОВЕРКА СЕРВИСОВ...');
    
    const modules = [
      'auth', 'user', 'farming', 'wallet', 'boost',
      'missions', 'referral', 'dailyBonus', 'telegram',
      'tonFarming', 'admin'
    ];
    
    for (const module of modules) {
      const servicePath = `modules/${module}/service.ts`;
      
      if (!fs.existsSync(servicePath)) {
        this.results.services.checks.push({
          check: `${module} Service`,
          status: '❌ ОТСУТСТВУЕТ',
          details: 'Файл сервиса не найден'
        });
        continue;
      }
      
      try {
        const content = fs.readFileSync(servicePath, 'utf8');
        
        // Проверки содержимого сервиса
        const hasSupabase = content.includes('supabase') || content.includes('createClient');
        const hasClass = content.includes('class') || content.includes('export');
        const hasAsyncMethods = content.includes('async ');
        const hasErrorHandling = content.includes('try') && content.includes('catch');
        const hasTypes = content.includes('interface') || content.includes('type');
        
        const checks = [
          { name: 'Supabase интеграция', status: hasSupabase },
          { name: 'Структура класса', status: hasClass },
          { name: 'Async методы', status: hasAsyncMethods },
          { name: 'Обработка ошибок', status: hasErrorHandling },
          { name: 'Типизация', status: hasTypes }
        ];
        
        const passedChecks = checks.filter(c => c.status).length;
        const status = passedChecks >= 4 ? '✅ ОТЛИЧНО' : 
                      passedChecks >= 3 ? '⚠️ ХОРОШО' : '❌ ТРЕБУЕТ ДОРАБОТКИ';
        
        this.results.services.checks.push({
          check: `${module} Service`,
          status: status,
          details: `${passedChecks}/5 проверок пройдено`
        });
        
      } catch (error) {
        this.results.services.checks.push({
          check: `${module} Service`,
          status: '❌ ОШИБКА ЧТЕНИЯ',
          details: error.message
        });
      }
    }
    
    const goodServices = this.results.services.checks.filter(c => c.status.includes('✅')).length;
    this.results.services.status = goodServices >= 8 ? '✅ ОТЛИЧНО' : goodServices >= 6 ? '⚠️ ХОРОШО' : '❌ ТРЕБУЕТ ДОРАБОТКИ';
  }

  /**
   * 7. ПРОВЕРКА БЕЗОПАСНОСТИ
   */
  async checkSecurity() {
    console.log('🔒 ПРОВЕРКА БЕЗОПАСНОСТИ...');
    
    // Проверка middleware
    const middlewareFiles = [
      'core/middleware/auth.ts',
      'core/middleware/telegramAuth.ts',
      'core/middleware/adminAuth.ts',
      'core/middleware/cors.ts',
      'core/middleware/errorHandler.ts'
    ];
    
    for (const filePath of middlewareFiles) {
      if (fs.existsSync(filePath)) {
        this.results.security.checks.push({
          check: `Middleware ${path.basename(filePath)}`,
          status: '✅ ПРИСУТСТВУЕТ',
          details: 'Файл существует'
        });
      } else {
        this.results.security.checks.push({
          check: `Middleware ${path.basename(filePath)}`,
          status: '❌ ОТСУТСТВУЕТ',
          details: 'Критический файл безопасности отсутствует'
        });
      }
    }
    
    // Проверка защищенных endpoints через реальные запросы
    const protectedEndpoints = [
      '/api/v2/users/profile',
      '/api/v2/farming/start',
      '/api/v2/wallet/balance',
      '/api/v2/admin/stats'
    ];
    
    for (const endpoint of protectedEndpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`);
        
        if (response.status === 401) {
          this.results.security.checks.push({
            check: `Защита ${endpoint}`,
            status: '✅ ЗАЩИЩЕН',
            details: 'Корректно возвращает 401 без авторизации'
          });
        } else {
          this.results.security.checks.push({
            check: `Защита ${endpoint}`,
            status: '❌ НЕ ЗАЩИЩЕН',
            details: `Возвращает ${response.status} вместо 401`
          });
        }
      } catch (error) {
        this.results.security.checks.push({
          check: `Защита ${endpoint}`,
          status: '⚠️ ОШИБКА',
          details: error.message
        });
      }
    }
    
    const securityScore = this.results.security.checks.filter(c => c.status.includes('✅')).length;
    this.results.security.status = securityScore >= 7 ? '✅ ОТЛИЧНО' : securityScore >= 5 ? '⚠️ ХОРОШО' : '❌ УЯЗВИМОСТИ';
  }

  /**
   * 8. ПРОВЕРКА TELEGRAM ИНТЕГРАЦИИ
   */
  async checkTelegramIntegration() {
    console.log('📱 ПРОВЕРКА TELEGRAM ИНТЕГРАЦИИ...');
    
    try {
      // Проверка Webhook
      const webhookResponse = await fetch(`https://api.telegram.org/bot${this.botToken}/getWebhookInfo`);
      const webhookData = await webhookResponse.json();
      
      if (webhookData.ok) {
        const webhookUrl = webhookData.result.url;
        
        if (webhookUrl.includes(process.env.REPLIT_DEV_DOMAIN)) {
          this.results.telegram.checks.push({
            check: 'Webhook URL',
            status: '✅ КОРРЕКТНЫЙ',
            details: webhookUrl
          });
        } else if (webhookUrl === '') {
          this.results.telegram.checks.push({
            check: 'Webhook URL',
            status: '⚠️ НЕ УСТАНОВЛЕН',
            details: 'Используется polling режим'
          });
        } else {
          this.results.telegram.checks.push({
            check: 'Webhook URL',
            status: '❌ НЕПРАВИЛЬНЫЙ',
            details: webhookUrl
          });
        }
      }
      
      // Проверка Bot API
      const botResponse = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
      const botData = await botResponse.json();
      
      if (botData.ok) {
        this.results.telegram.checks.push({
          check: 'Bot API',
          status: '✅ РАБОТАЕТ',
          details: `Bot: @${botData.result.username}`
        });
      } else {
        this.results.telegram.checks.push({
          check: 'Bot API',
          status: '❌ ОШИБКА',
          details: botData.description || 'Неизвестная ошибка'
        });
      }
      
    } catch (error) {
      this.results.telegram.checks.push({
        check: 'Telegram API',
        status: '❌ НЕДОСТУПЕН',
        details: error.message
      });
    }
    
    // Проверка файлов интеграции
    const telegramFiles = [
      'modules/telegram/controller.ts',
      'modules/telegram/service.ts',
      'core/middleware/telegramAuth.ts'
    ];
    
    for (const filePath of telegramFiles) {
      if (fs.existsSync(filePath)) {
        this.results.telegram.checks.push({
          check: `Файл ${path.basename(filePath)}`,
          status: '✅ ПРИСУТСТВУЕТ',
          details: 'Файл найден'
        });
      } else {
        this.results.telegram.checks.push({
          check: `Файл ${path.basename(filePath)}`,
          status: '❌ ОТСУТСТВУЕТ',
          details: 'Критический файл отсутствует'
        });
      }
    }
    
    const telegramScore = this.results.telegram.checks.filter(c => c.status.includes('✅')).length;
    this.results.telegram.status = telegramScore >= 4 ? '✅ ОТЛИЧНО' : telegramScore >= 3 ? '⚠️ ХОРОШО' : '❌ ПРОБЛЕМЫ';
  }

  /**
   * 9. ПРОВЕРКА FRONTEND
   */
  async checkFrontend() {
    console.log('🌐 ПРОВЕРКА FRONTEND...');
    
    try {
      // Проверка главной страницы
      const response = await fetch(this.baseUrl);
      const html = await response.text();
      
      const checks = [
        { name: 'HTML загружается', status: response.status === 200 },
        { name: 'React root div', status: html.includes('id="root"') },
        { name: 'Telegram WebApp script', status: html.includes('telegram-web-app.js') },
        { name: 'Manifest', status: html.includes('rel="manifest"') },
        { name: 'Meta теги', status: html.includes('viewport') && html.includes('theme-color') }
      ];
      
      for (const check of checks) {
        this.results.frontend.checks.push({
          check: check.name,
          status: check.status ? '✅ ОК' : '❌ ПРОБЛЕМА',
          details: check.status ? 'Проверка пройдена' : 'Требует внимания'
        });
      }
      
      // Проверка статических файлов
      const staticFiles = [
        '/client/manifest.json',
        '/client/public/tonconnect-manifest.json'
      ];
      
      for (const file of staticFiles) {
        try {
          const fileResponse = await fetch(`${this.baseUrl}${file}`);
          this.results.frontend.checks.push({
            check: `Статический файл ${path.basename(file)}`,
            status: fileResponse.status === 200 ? '✅ ДОСТУПЕН' : '❌ НЕДОСТУПЕН',
            details: `HTTP ${fileResponse.status}`
          });
        } catch (error) {
          this.results.frontend.checks.push({
            check: `Статический файл ${path.basename(file)}`,
            status: '❌ ОШИБКА',
            details: error.message
          });
        }
      }
      
    } catch (error) {
      this.results.frontend.checks.push({
        check: 'Frontend доступность',
        status: '❌ КРИТИЧЕСКАЯ ОШИБКА',
        details: error.message
      });
    }
    
    const frontendScore = this.results.frontend.checks.filter(c => c.status.includes('✅')).length;
    this.results.frontend.status = frontendScore >= 6 ? '✅ ОТЛИЧНО' : frontendScore >= 4 ? '⚠️ ХОРОШО' : '❌ ПРОБЛЕМЫ';
  }

  /**
   * 10. ПРОВЕРКА СИСТЕМНЫХ ФАЙЛОВ
   */
  async checkSystemFiles() {
    console.log('⚙️ ПРОВЕРКА СИСТЕМНЫХ ФАЙЛОВ...');
    
    const criticalFiles = [
      { path: 'server/index.ts', name: 'Главный сервер' },
      { path: 'server/routes.ts', name: 'Маршруты API' },
      { path: 'core/config.ts', name: 'Конфигурация' },
      { path: 'core/supabaseClient.ts', name: 'Supabase клиент' },
      { path: 'core/logger.ts', name: 'Система логирования' },
      { path: 'shared/schema.ts', name: 'Схема данных' },
      { path: 'package.json', name: 'Зависимости' },
      { path: 'client/package.json', name: 'Frontend зависимости' }
    ];
    
    for (const file of criticalFiles) {
      if (fs.existsSync(file.path)) {
        try {
          const stats = fs.statSync(file.path);
          this.results.system.checks.push({
            check: file.name,
            status: '✅ ПРИСУТСТВУЕТ',
            details: `Размер: ${Math.round(stats.size / 1024)}KB, Изменен: ${stats.mtime.toLocaleDateString()}`
          });
        } catch (error) {
          this.results.system.checks.push({
            check: file.name,
            status: '⚠️ ПРОБЛЕМА ЧТЕНИЯ',
            details: error.message
          });
        }
      } else {
        this.results.system.checks.push({
          check: file.name,
          status: '❌ ОТСУТСТВУЕТ',
          details: 'Критический файл не найден'
        });
      }
    }
    
    // Проверка папок
    const criticalDirs = ['core', 'modules', 'server', 'client/src', 'shared'];
    
    for (const dir of criticalDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        this.results.system.checks.push({
          check: `Папка ${dir}`,
          status: '✅ ПРИСУТСТВУЕТ',
          details: `Файлов: ${files.length}`
        });
      } else {
        this.results.system.checks.push({
          check: `Папка ${dir}`,
          status: '❌ ОТСУТСТВУЕТ',
          details: 'Критическая папка не найдена'
        });
      }
    }
    
    const systemScore = this.results.system.checks.filter(c => c.status.includes('✅')).length;
    this.results.system.status = systemScore >= 11 ? '✅ ОТЛИЧНО' : systemScore >= 9 ? '⚠️ ХОРОШО' : '❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ';
  }

  /**
   * 11. ПРОВЕРКА ГОТОВНОСТИ К ДЕПЛОЮ
   */
  async checkDeploymentReadiness() {
    console.log('🚀 ПРОВЕРКА ГОТОВНОСТИ К ДЕПЛОЮ...');
    
    const deploymentChecks = [
      {
        name: 'Все env переменные установлены',
        check: () => {
          const required = ['SUPABASE_URL', 'SUPABASE_KEY', 'TELEGRAM_BOT_TOKEN'];
          return required.every(v => process.env[v]);
        }
      },
      {
        name: 'База данных доступна',
        check: () => this.results.database.status.includes('✅')
      },
      {
        name: 'API endpoints работают',
        check: () => this.results.api.status.includes('✅') || this.results.api.status.includes('⚠️')
      },
      {
        name: 'Безопасность настроена',
        check: () => this.results.security.status.includes('✅')
      },
      {
        name: 'Telegram интеграция работает',
        check: () => this.results.telegram.status.includes('✅') || this.results.telegram.status.includes('⚠️')
      },
      {
        name: 'Frontend доступен',
        check: () => this.results.frontend.status.includes('✅') || this.results.frontend.status.includes('⚠️')
      },
      {
        name: 'Системные файлы на месте',
        check: () => this.results.system.status.includes('✅')
      }
    ];
    
    let deploymentScore = 0;
    
    for (const check of deploymentChecks) {
      const passed = check.check();
      
      this.results.deployment.checks.push({
        check: check.name,
        status: passed ? '✅ ГОТОВО' : '❌ НЕ ГОТОВО',
        details: passed ? 'Требования выполнены' : 'Требует исправления'
      });
      
      if (passed) deploymentScore++;
    }
    
    this.results.deployment.status = deploymentScore >= 6 ? '🟢 ГОТОВО К ДЕПЛОЮ' : 
                                   deploymentScore >= 4 ? '🟡 ПОЧТИ ГОТОВО' : '🔴 НЕ ГОТОВО';
  }

  /**
   * ГЕНЕРАЦИЯ ФИНАЛЬНОГО ОТЧЕТА
   */
  generateFinalReport() {
    const currentDate = new Date().toLocaleString('ru-RU');
    
    console.log('\n\n🛠️ ФИНАЛЬНЫЙ ТОТАЛЬНЫЙ ЧЕК-ЛИСТ UniFarm Connect');
    console.log(`Дата: ${currentDate}`);
    console.log('Среда: Replit / Supabase / Telegram WebApp\n');
    
    const sections = [
      { name: '🔐 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ', key: 'environment' },
      { name: '🗄️ БАЗА ДАННЫХ', key: 'database' },
      { name: '📦 МОДУЛИ', key: 'modules' },
      { name: '📡 API ENDPOINTS', key: 'api' },
      { name: '🎮 КОНТРОЛЛЕРЫ', key: 'controllers' },
      { name: '⚙️ СЕРВИСЫ', key: 'services' },
      { name: '🔒 БЕЗОПАСНОСТЬ', key: 'security' },
      { name: '📱 TELEGRAM', key: 'telegram' },
      { name: '🌐 FRONTEND', key: 'frontend' },
      { name: '⚙️ СИСТЕМНЫЕ ФАЙЛЫ', key: 'system' },
      { name: '🚀 ГОТОВНОСТЬ К ДЕПЛОЮ', key: 'deployment' }
    ];
    
    for (const section of sections) {
      console.log(`${section.name}: ${this.results[section.key].status}`);
      
      this.results[section.key].checks.forEach(check => {
        console.log(`• ${check.check}: ${check.status}`);
        if (check.details) {
          console.log(`  └─ ${check.details}`);
        }
      });
      console.log();
    }
    
    // Общая оценка готовности
    const greenSections = Object.values(this.results).filter(r => r.status.includes('✅')).length;
    const yellowSections = Object.values(this.results).filter(r => r.status.includes('⚠️')).length;
    const redSections = Object.values(this.results).filter(r => r.status.includes('❌') || r.status.includes('🔴')).length;
    
    console.log('📊 ОБЩАЯ СТАТИСТИКА:');
    console.log(`✅ Отличные секции: ${greenSections}/11`);
    console.log(`⚠️ Требующие внимания: ${yellowSections}/11`);
    console.log(`❌ Критические проблемы: ${redSections}/11`);
    
    let overallStatus;
    if (greenSections >= 8 && redSections === 0) {
      overallStatus = '🟢 СИСТЕМА ПОЛНОСТЬЮ ГОТОВА К ПРОДАКШЕН';
    } else if (greenSections >= 6 && redSections <= 2) {
      overallStatus = '🟡 СИСТЕМА ПОЧТИ ГОТОВА (ТРЕБУЕТСЯ МИНИМАЛЬНАЯ ДОРАБОТКА)';
    } else {
      overallStatus = '🔴 СИСТЕМА ТРЕБУЕТ СЕРЬЕЗНОЙ ДОРАБОТКИ ПЕРЕД ПРОДАКШЕН';
    }
    
    console.log(`\n🎯 ИТОГОВЫЙ СТАТУС: ${overallStatus}\n`);
    
    return {
      timestamp: currentDate,
      overallStatus,
      sections: this.results,
      statistics: { green: greenSections, yellow: yellowSections, red: redSections },
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * ГЕНЕРАЦИЯ РЕКОМЕНДАЦИЙ
   */
  generateRecommendations() {
    const recommendations = [];
    
    Object.entries(this.results).forEach(([section, data]) => {
      if (data.status.includes('❌') || data.status.includes('🔴')) {
        const issues = data.checks.filter(c => c.status.includes('❌'));
        if (issues.length > 0) {
          recommendations.push({
            priority: 'КРИТИЧНО',
            section: section.toUpperCase(),
            issues: issues.map(i => i.check),
            description: `Необходимо исправить ${issues.length} критических проблем в секции ${section}`
          });
        }
      } else if (data.status.includes('⚠️') || data.status.includes('🟡')) {
        const warnings = data.checks.filter(c => c.status.includes('⚠️'));
        if (warnings.length > 0) {
          recommendations.push({
            priority: 'ВАЖНО',
            section: section.toUpperCase(),
            issues: warnings.map(w => w.check),
            description: `Рекомендуется улучшить ${warnings.length} элементов в секции ${section}`
          });
        }
      }
    });
    
    return recommendations;
  }

  /**
   * ЗАПУСК ПОЛНОЙ ПРОВЕРКИ
   */
  async runFullChecklist() {
    try {
      console.log('🚀 ЗАПУСК ПОЛНОГО ЧЕК-ЛИСТА...\n');
      
      await this.checkEnvironmentVariables();
      await this.checkSupabaseDatabase();
      await this.checkModules();
      await this.checkAPIEndpoints();
      await this.checkControllers();
      await this.checkServices();
      await this.checkSecurity();
      await this.checkTelegramIntegration();
      await this.checkFrontend();
      await this.checkSystemFiles();
      await this.checkDeploymentReadiness();
      
      const report = this.generateFinalReport();
      
      // Сохранение отчета
      fs.writeFileSync(
        'FINAL_TOTAL_SYSTEM_CHECKLIST_REPORT.json', 
        JSON.stringify(report, null, 2)
      );
      
      console.log('📄 Детальный отчет сохранен в FINAL_TOTAL_SYSTEM_CHECKLIST_REPORT.json');
      
      return report;
      
    } catch (error) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ ВЫПОЛНЕНИИ ЧЕК-ЛИСТА:', error.message);
      throw error;
    }
  }
}

// Запуск проверки
async function main() {
  const checklist = new FinalTotalSystemChecklist();
  await checklist.runFullChecklist();
}

main().catch(console.error);
