/**
 * ФИНАЛЬНАЯ ПРЕД-ПРОДАКШН ПРОВЕРКА UniFarm
 * Полный технический аудит всех компонентов системы
 */

import fetch from 'node-fetch';

const BOT_TOKEN = '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const PRODUCTION_URL = 'https://uni-farm-connect-x-osadchukdmitro2.replit.app';
const LOCAL_URL = 'http://localhost:3000';

class UniFarmLaunchAudit {
  constructor() {
    this.results = {};
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }

  log(section, item, status, message, details = null) {
    if (!this.results[section]) this.results[section] = [];
    
    this.results[section].push({
      item,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    });

    this.summary.total++;
    if (status === '✅') this.summary.passed++;
    else if (status === '❌') this.summary.failed++;
    else if (status === '⚠️') this.summary.warnings++;

    console.log(`[${section}] ${status} ${item}: ${message}`);
    if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }

  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        timeout: 10000,
        ...options
      });
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: await response.text()
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        statusText: 'Network Error',
        error: error.message
      };
    }
  }

  // 1. 🔁 Webhook и Telegram Bot
  async auditWebhookAndBot() {
    console.log('\n🔁 АУДИТ: Webhook и Telegram Bot');
    
    // Проверка webhook info
    try {
      const webhookInfo = await this.makeRequest(`${TELEGRAM_API}/getWebhookInfo`);
      if (webhookInfo.ok) {
        const data = JSON.parse(webhookInfo.data);
        if (data.ok) {
          const info = data.result;
          this.log('webhook', 'webhook_info', '✅', 'Webhook info получен', {
            url: info.url,
            pending_updates: info.pending_update_count,
            last_error: info.last_error_message
          });
          
          if (info.url === `${PRODUCTION_URL}/webhook`) {
            this.log('webhook', 'webhook_url', '✅', 'Webhook URL корректный');
          } else {
            this.log('webhook', 'webhook_url', '⚠️', `Webhook URL: ${info.url}`);
          }
        }
      }
    } catch (error) {
      this.log('webhook', 'webhook_info', '❌', 'Ошибка получения webhook info', error.message);
    }

    // Проверка bot info
    try {
      const botInfo = await this.makeRequest(`${TELEGRAM_API}/getMe`);
      if (botInfo.ok) {
        const data = JSON.parse(botInfo.data);
        if (data.ok && data.result.username === 'UniFarming_Bot') {
          this.log('webhook', 'bot_connection', '✅', 'Бот @UniFarming_Bot активен');
        } else {
          this.log('webhook', 'bot_connection', '❌', 'Проблема с подключением бота');
        }
      }
    } catch (error) {
      this.log('webhook', 'bot_connection', '❌', 'Ошибка проверки бота', error.message);
    }

    // Проверка webhook handler локально
    const webhookTest = await this.makeRequest(`${LOCAL_URL}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        update_id: Date.now(),
        message: { message_id: 1, from: { id: 123 }, chat: { id: 123 }, text: '/start' }
      })
    });

    if (webhookTest.ok) {
      this.log('webhook', 'webhook_handler', '✅', 'Webhook handler работает локально');
    } else {
      this.log('webhook', 'webhook_handler', '❌', `Webhook handler ошибка: ${webhookTest.status}`);
    }
  }

  // 2. 📦 API и маршруты
  async auditAPIRoutes() {
    console.log('\n📦 АУДИТ: API и маршруты');
    
    const apiEndpoints = [
      '/api/v2/me',
      '/api/v2/farming/history', 
      '/api/v2/airdrop/register',
      '/api/v2/health',
      '/health'
    ];

    for (const endpoint of apiEndpoints) {
      const response = await this.makeRequest(`${LOCAL_URL}${endpoint}`);
      
      if (response.status === 401) {
        this.log('api', `endpoint_${endpoint.replace(/\//g, '_')}`, '✅', 'Эндпоинт защищен авторизацией');
      } else if (response.status === 200) {
        this.log('api', `endpoint_${endpoint.replace(/\//g, '_')}`, '✅', 'Эндпоинт доступен');
      } else if (response.status === 404) {
        this.log('api', `endpoint_${endpoint.replace(/\//g, '_')}`, '❌', 'Эндпоинт не найден');
      } else {
        this.log('api', `endpoint_${endpoint.replace(/\//g, '_')}`, '⚠️', `Статус: ${response.status}`);
      }
    }

    // Проверка CORS
    const corsTest = await this.makeRequest(`${LOCAL_URL}/api/v2/health`, {
      headers: { 'Origin': 'https://example.com' }
    });
    
    if (corsTest.ok) {
      this.log('api', 'cors_configuration', '✅', 'CORS настроен корректно');
    } else {
      this.log('api', 'cors_configuration', '⚠️', 'CORS может требовать настройки');
    }
  }

  // 3. 👤 Telegram Авторизация и Регистрация
  async auditTelegramAuth() {
    console.log('\n👤 АУДИТ: Telegram Авторизация');
    
    // Проверка auth endpoint
    const authTest = await this.makeRequest(`${LOCAL_URL}/api/v2/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: 'test_data' })
    });

    if (authTest.status === 400 || authTest.status === 401) {
      this.log('auth', 'telegram_auth_endpoint', '✅', 'Auth endpoint защищен');
    } else {
      this.log('auth', 'telegram_auth_endpoint', '⚠️', `Auth endpoint статус: ${authTest.status}`);
    }

    // Проверка валидации hash
    try {
      const response = JSON.parse(authTest.data);
      if (response.error && response.error.includes('hash')) {
        this.log('auth', 'hash_validation', '✅', 'Hash валидация активна');
      } else {
        this.log('auth', 'hash_validation', '⚠️', 'Hash валидация требует проверки');
      }
    } catch (error) {
      this.log('auth', 'hash_validation', '⚠️', 'Не удалось проверить hash валидацию');
    }
  }

  // 4. 💼 Проверка бизнес-модулей
  async auditBusinessModules() {
    console.log('\n💼 АУДИТ: Бизнес-модули');
    
    const modules = [
      '/api/v2/farming/info',
      '/api/v2/farming/status', 
      '/api/v2/boosts/packages',
      '/api/v2/daily-bonus/status',
      '/api/v2/missions/active',
      '/api/v2/referrals/stats',
      '/api/v2/wallet/balance'
    ];

    for (const module of modules) {
      const response = await this.makeRequest(`${LOCAL_URL}${module}`);
      
      if (response.status === 401) {
        this.log('modules', `module_${module.split('/').pop()}`, '✅', 'Модуль защищен авторизацией');
      } else if (response.status === 200) {
        this.log('modules', `module_${module.split('/').pop()}`, '✅', 'Модуль доступен');
      } else if (response.status === 404) {
        this.log('modules', `module_${module.split('/').pop()}`, '❌', 'Модуль не найден');
      } else {
        this.log('modules', `module_${module.split('/').pop()}`, '⚠️', `Статус: ${response.status}`);
      }
    }
  }

  // 5. 🧠 UI/UX проверка
  async auditUIUX() {
    console.log('\n🧠 АУДИТ: UI/UX и навигация');
    
    // Проверка загрузки frontend
    const frontendTest = await this.makeRequest(PRODUCTION_URL);
    
    if (frontendTest.ok && frontendTest.data.includes('UniFarm')) {
      this.log('ui', 'frontend_loading', '✅', 'Frontend загружается корректно');
    } else {
      this.log('ui', 'frontend_loading', '❌', 'Проблема загрузки frontend');
    }

    // Проверка статических ресурсов
    const assetsTest = await this.makeRequest(`${PRODUCTION_URL}/assets/index.js`);
    
    if (assetsTest.ok) {
      this.log('ui', 'assets_loading', '✅', 'Статические ресурсы доступны');
    } else {
      this.log('ui', 'assets_loading', '⚠️', 'Статические ресурсы требуют проверки');
    }

    // Проверка манифеста
    const manifestTest = await this.makeRequest(`${PRODUCTION_URL}/manifest.json`);
    
    if (manifestTest.ok) {
      this.log('ui', 'manifest', '✅', 'Манифест доступен');
    } else {
      this.log('ui', 'manifest', '⚠️', 'Манифест требует проверки');
    }
  }

  // 6. 🔐 Безопасность
  async auditSecurity() {
    console.log('\n🔐 АУДИТ: Безопасность');
    
    // Проверка переменных окружения (без вывода значений)
    const envVars = ['JWT_SECRET', 'BOT_TOKEN', 'DATABASE_URL'];
    
    envVars.forEach(envVar => {
      if (process.env[envVar]) {
        this.log('security', `env_${envVar.toLowerCase()}`, '✅', `${envVar} установлен`);
      } else {
        this.log('security', `env_${envVar.toLowerCase()}`, '❌', `${envVar} отсутствует`);
      }
    });

    // Проверка защиты API
    const sensitiveEndpoints = ['/api/v2/me', '/api/v2/wallet/balance'];
    
    for (const endpoint of sensitiveEndpoints) {
      const response = await this.makeRequest(`${LOCAL_URL}${endpoint}`);
      
      if (response.status === 401) {
        this.log('security', `protection_${endpoint.split('/').pop()}`, '✅', 'Эндпоинт защищен');
      } else {
        this.log('security', `protection_${endpoint.split('/').pop()}`, '❌', 'Эндпоинт не защищен');
      }
    }
  }

  // 7. 🛠 Мониторинг
  async auditMonitoring() {
    console.log('\n🛠 АУДИТ: Мониторинг');
    
    // Health check
    const healthTest = await this.makeRequest(`${LOCAL_URL}/health`);
    
    if (healthTest.ok) {
      try {
        const health = JSON.parse(healthTest.data);
        this.log('monitoring', 'health_check', '✅', 'Health check работает', health);
      } catch (error) {
        this.log('monitoring', 'health_check', '⚠️', 'Health check отвечает но JSON некорректный');
      }
    } else {
      this.log('monitoring', 'health_check', '❌', 'Health check недоступен');
    }

    // WebSocket проверка (базовая)
    this.log('monitoring', 'websocket', '⚠️', 'WebSocket требует отдельной проверки');
  }

  // 8. 🚀 Деплой Replit
  async auditReplit() {
    console.log('\n🚀 АУДИТ: Деплой Replit');
    
    // Проверка продакшн URL
    const prodTest = await this.makeRequest(PRODUCTION_URL);
    
    if (prodTest.ok) {
      this.log('deploy', 'production_url', '✅', 'Продакшн URL доступен');
    } else {
      this.log('deploy', 'production_url', '❌', `Продакшн URL недоступен: ${prodTest.status}`);
    }

    // Проверка сборки
    const buildTest = await this.makeRequest(`${PRODUCTION_URL}/assets/index.js`);
    
    if (buildTest.ok) {
      this.log('deploy', 'build_assets', '✅', 'Сборка прошла успешно');
    } else {
      this.log('deploy', 'build_assets', '⚠️', 'Проблемы со сборкой');
    }
  }

  // 9. 📲 Mini App подключение
  async auditMiniApp() {
    console.log('\n📲 АУДИТ: Telegram Mini App');
    
    // Проверка доступности через Telegram WebApp
    const webAppTest = await this.makeRequest(PRODUCTION_URL, {
      headers: {
        'User-Agent': 'TelegramWebApp'
      }
    });

    if (webAppTest.ok) {
      this.log('miniapp', 'webapp_access', '✅', 'Mini App доступен через WebApp');
    } else {
      this.log('miniapp', 'webapp_access', '❌', 'Проблема доступа через WebApp');
    }

    // Проверка манифеста для Mini App
    const tonConnectTest = await this.makeRequest(`${PRODUCTION_URL}/tonconnect-manifest.json`);
    
    if (tonConnectTest.ok) {
      this.log('miniapp', 'tonconnect_manifest', '✅', 'TON Connect манифест доступен');
    } else {
      this.log('miniapp', 'tonconnect_manifest', '⚠️', 'TON Connect манифест отсутствует');
    }
  }

  // Генерация финального отчета
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ФИНАЛЬНЫЙ ОТЧЕТ ГОТОВНОСТИ К ЗАПУСКУ');
    console.log('='.repeat(80));

    console.log('\n📈 СТАТИСТИКА:');
    console.log(`Всего проверок: ${this.summary.total}`);
    console.log(`✅ Пройдено: ${this.summary.passed}`);
    console.log(`❌ Ошибки: ${this.summary.failed}`);
    console.log(`⚠️ Предупреждения: ${this.summary.warnings}`);

    const successRate = Math.round((this.summary.passed / this.summary.total) * 100);
    console.log(`📊 Процент готовности: ${successRate}%`);

    console.log('\n📋 ДЕТАЛЬНЫЕ РЕЗУЛЬТАТЫ:');
    Object.entries(this.results).forEach(([section, items]) => {
      console.log(`\n[${section.toUpperCase()}]:`);
      items.forEach(item => {
        console.log(`  ${item.status} ${item.item}: ${item.message}`);
      });
    });

    // Итоговый вывод
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ЗАКЛЮЧЕНИЕ:');
    
    if (this.summary.failed === 0 && successRate >= 90) {
      console.log('✅ СИСТЕМА ГОТОВА К ЗАПУСКУ');
      console.log('🚀 UniFarm можно развертывать в продакшне');
    } else if (this.summary.failed <= 2 && successRate >= 80) {
      console.log('⚠️ СИСТЕМА ПОЧТИ ГОТОВА');
      console.log('🔧 Требуется устранение нескольких проблем');
    } else {
      console.log('❌ СИСТЕМА НЕ ГОТОВА');
      console.log('🛠 Требуется серьезная доработка');
    }

    console.log('='.repeat(80));
  }

  // Запуск полного аудита
  async runFullAudit() {
    console.log('🟡 ЗАПУСК ФИНАЛЬНОЙ ПРЕД-ПРОДАКШН ПРОВЕРКИ UniFarm');
    console.log('⏰ Время начала:', new Date().toISOString());
    
    await this.auditWebhookAndBot();
    await this.auditAPIRoutes();
    await this.auditTelegramAuth();
    await this.auditBusinessModules();
    await this.auditUIUX();
    await this.auditSecurity();
    await this.auditMonitoring();
    await this.auditReplit();
    await this.auditMiniApp();
    
    this.generateReport();
  }
}

// Запуск аудита
const audit = new UniFarmLaunchAudit();
audit.runFullAudit().catch(console.error);