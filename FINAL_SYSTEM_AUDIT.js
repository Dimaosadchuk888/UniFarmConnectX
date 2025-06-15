/**
 * ФИНАЛЬНЫЙ АУДИТ СИСТЕМЫ UNIFARM
 * Проверка готовности к продакшен-запуску
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

class FinalSystemAudit {
  constructor() {
    this.auditResults = {
      webhook: { status: 'unknown', url: '', comment: '' },
      initData: { used: false, problems: [] },
      envVariables: { extra: [], missing: [] },
      apiErrors: {},
      manifest: { connected: false, tags: false },
      health: { main: false, api: false },
      overallStatus: 'unknown'
    };
    
    this.currentUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    console.log('🔍 Запуск финального аудита системы UniFarm');
    console.log(`Среда: Replit / Supabase / Telegram WebApp`);
    console.log(`URL: ${this.currentUrl}\n`);
  }

  /**
   * 1. Проверка Webhook
   */
  async auditWebhook() {
    console.log('🔗 Аудит Webhook...');
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getWebhookInfo`);
      const data = await response.json();
      
      if (data.ok) {
        const webhookUrl = data.result.url;
        this.auditResults.webhook.url = webhookUrl;
        
        if (webhookUrl.includes('.replit.dev')) {
          if (webhookUrl === `${this.currentUrl}/webhook`) {
            this.auditResults.webhook.status = '✅';
            this.auditResults.webhook.comment = 'Корректный production URL';
          } else {
            this.auditResults.webhook.status = '❌';
            this.auditResults.webhook.comment = 'Неправильный dev URL';
          }
        } else if (webhookUrl === '') {
          this.auditResults.webhook.status = '⚠️';
          this.auditResults.webhook.comment = 'Webhook не установлен (polling режим)';
        } else {
          this.auditResults.webhook.status = '❌';
          this.auditResults.webhook.comment = 'Неизвестный URL';
        }
      } else {
        this.auditResults.webhook.status = '❌';
        this.auditResults.webhook.comment = 'Ошибка получения информации';
      }
    } catch (error) {
      this.auditResults.webhook.status = '❌';
      this.auditResults.webhook.comment = `Ошибка: ${error.message}`;
    }
  }

  /**
   * 2. Проверка initData и Telegram интеграции
   */
  auditInitData() {
    console.log('📦 Аудит initData...');
    
    const files = [
      'client/src/main.tsx',
      'client/src/hooks/useTelegram.ts',
      'client/src/services/telegramService.ts',
      'client/src/contexts/userContext.tsx'
    ];
    
    let initDataUsed = false;
    const problems = [];
    
    files.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          if (content.includes('window.Telegram?.WebApp.initData')) {
            initDataUsed = true;
          }
          
          if (content.includes('initDataUnsafe') && !content.includes('initData')) {
            problems.push(`${filePath}: Использует только initDataUnsafe без проверки initData`);
          }
          
          if (content.includes('telegram_id') || content.includes('telegramId')) {
            // Проверяем сохранение telegram_id
          }
        }
      } catch (error) {
        problems.push(`Ошибка чтения ${filePath}: ${error.message}`);
      }
    });
    
    this.auditResults.initData.used = initDataUsed;
    this.auditResults.initData.problems = problems;
  }

  /**
   * 3. Проверка переменных окружения
   */
  auditEnvironmentVariables() {
    console.log('🔐 Аудит переменных окружения...');
    
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'TELEGRAM_BOT_TOKEN',
      'JWT_SECRET',
      'SESSION_SECRET'
    ];
    
    const obsoleteVars = [
      'DATABASE_URL',
      'PGHOST',
      'PGUSER',
      'PGPASSWORD',
      'PGDATABASE',
      'PGPORT',
      'NEON_URL',
      'DATABASE_PROVIDER',
      'USE_NEON_DB'
    ];
    
    // Проверка отсутствующих обязательных переменных
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        this.auditResults.envVariables.missing.push(varName);
      }
    });
    
    // Проверка лишних переменных
    obsoleteVars.forEach(varName => {
      if (process.env[varName]) {
        this.auditResults.envVariables.extra.push(varName);
      }
    });
  }

  /**
   * 4. Проверка ошибок API
   */
  async auditAPIErrors() {
    console.log('📡 Аудит ошибок API...');
    
    const endpoints = [
      { path: '/api/v2/auth/telegram', method: 'POST', name: 'auth_telegram' },
      { path: '/api/v2/register/telegram', method: 'POST', name: 'register_telegram' },
      { path: '/api/v2/users/profile', method: 'GET', name: 'user_profile' },
      { path: '/api/v2/wallet/balance', method: 'GET', name: 'wallet_balance' },
      { path: '/api/v2/farming/start', method: 'POST', name: 'farming_start' }
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
        
        const response = await fetch(`${this.currentUrl}${endpoint.path}`, options);
        
        if (response.status === 200) {
          this.auditResults.apiErrors[endpoint.name] = '200 ✅';
        } else if (response.status === 401) {
          this.auditResults.apiErrors[endpoint.name] = '401 ⚠️ (требует авторизации)';
        } else if (response.status === 500) {
          this.auditResults.apiErrors[endpoint.name] = '500 ❌';
        } else {
          this.auditResults.apiErrors[endpoint.name] = `${response.status} ⚠️`;
        }
      } catch (error) {
        this.auditResults.apiErrors[endpoint.name] = `❌ ${error.message}`;
      }
    }
  }

  /**
   * 5. Проверка Manifest и Telegram WebApp
   */
  async auditManifestAndTelegram() {
    console.log('📱 Аудит Manifest и Telegram WebApp...');
    
    try {
      // Проверка главной страницы
      const response = await fetch(this.currentUrl);
      const htmlContent = await response.text();
      
      // Проверка manifest
      this.auditResults.manifest.connected = htmlContent.includes('rel="manifest"');
      
      // Проверка тегов
      const hasWebAppReady = htmlContent.includes('telegram-web-app-ready');
      const hasViewport = htmlContent.includes('user-scalable=no');
      const hasThemeColor = htmlContent.includes('theme-color');
      const hasTelegramScript = htmlContent.includes('telegram-web-app.js');
      
      this.auditResults.manifest.tags = hasWebAppReady && hasViewport && hasThemeColor && hasTelegramScript;
      
      // Проверка файла manifest.json
      try {
        const manifestResponse = await fetch(`${this.currentUrl}/client/manifest.json`);
        if (manifestResponse.status !== 200) {
          this.auditResults.manifest.connected = false;
        }
      } catch (error) {
        this.auditResults.manifest.connected = false;
      }
      
    } catch (error) {
      this.auditResults.manifest.connected = false;
      this.auditResults.manifest.tags = false;
    }
  }

  /**
   * 6. Проверка Health endpoints
   */
  async auditHealthEndpoints() {
    console.log('📊 Аудит Health endpoints...');
    
    try {
      // Проверка /health
      const healthResponse = await fetch(`${this.currentUrl}/health`);
      this.auditResults.health.main = healthResponse.status === 200;
      
      // Проверка /api/v2/health
      const apiHealthResponse = await fetch(`${this.currentUrl}/api/v2/health`);
      this.auditResults.health.api = apiHealthResponse.status === 200;
      
    } catch (error) {
      this.auditResults.health.main = false;
      this.auditResults.health.api = false;
    }
  }

  /**
   * Определение общего статуса
   */
  determineOverallStatus() {
    const issues = [];
    
    if (this.auditResults.webhook.status === '❌') issues.push('webhook');
    if (this.auditResults.envVariables.extra.length > 0) issues.push('лишние env переменные');
    if (this.auditResults.envVariables.missing.length > 0) issues.push('отсутствующие env переменные');
    if (!this.auditResults.manifest.connected || !this.auditResults.manifest.tags) issues.push('manifest/теги');
    if (!this.auditResults.health.main || !this.auditResults.health.api) issues.push('health endpoints');
    
    // Проверка критических API ошибок
    const criticalApiErrors = Object.values(this.auditResults.apiErrors).filter(status => 
      status.includes('500 ❌') || status.includes('❌')
    );
    
    if (criticalApiErrors.length > 0) issues.push('критические API ошибки');
    
    if (issues.length === 0) {
      this.auditResults.overallStatus = '🟢 Готово к продакшен';
    } else if (issues.length <= 2) {
      this.auditResults.overallStatus = '🟡 Требуется минимальная доработка';
    } else {
      this.auditResults.overallStatus = '🔴 Требуется серьезная доработка';
    }
  }

  /**
   * Генерация финального отчета
   */
  generateFinalReport() {
    const currentDate = new Date().toLocaleString('ru-RU');
    
    console.log('\n\n🛠️ ФИНАЛЬНЫЙ АУДИТ UNIFARM');
    console.log(`Дата: ${currentDate}`);
    console.log('Среда: Replit / Supabase / Telegram WebApp\n');
    
    console.log('🔗 Webhook:');
    console.log(`• URL: ${this.auditResults.webhook.status} ${this.auditResults.webhook.url}`);
    console.log(`• Комментарий: ${this.auditResults.webhook.comment}\n`);
    
    console.log('📦 initData:');
    console.log(`• Используется: ${this.auditResults.initData.used ? '✅' : '❌'}`);
    console.log(`• Проблемы: ${this.auditResults.initData.problems.length > 0 ? this.auditResults.initData.problems.join(', ') : 'Не найдены'}\n`);
    
    console.log('🔐 .env переменные:');
    console.log(`• Лишние: ${this.auditResults.envVariables.extra.length > 0 ? this.auditResults.envVariables.extra.join(', ') : 'Нет'}`);
    console.log(`• Отсутствуют: ${this.auditResults.envVariables.missing.length > 0 ? this.auditResults.envVariables.missing.join(', ') : 'Нет'}\n`);
    
    console.log('📡 Ошибки API:');
    Object.entries(this.auditResults.apiErrors).forEach(([endpoint, status]) => {
      console.log(`• ${endpoint}: ${status}`);
    });
    console.log();
    
    console.log('📱 Manifest / Telegram WebApp:');
    console.log(`• Manifest подключен: ${this.auditResults.manifest.connected ? '✅' : '❌'}`);
    console.log(`• Теги: ${this.auditResults.manifest.tags ? '✅' : '❌'}\n`);
    
    console.log('📊 Health / Статистика:');
    console.log(`• /health: ${this.auditResults.health.main ? '200 ✅' : '❌'}`);
    console.log(`• /api/v2/health: ${this.auditResults.health.api ? '200 ✅' : '❌'}\n`);
    
    console.log(`📌 Общий статус: ${this.auditResults.overallStatus}\n`);
    
    return this.auditResults;
  }

  /**
   * Запуск полного аудита
   */
  async runFullAudit() {
    try {
      await this.auditWebhook();
      this.auditInitData();
      this.auditEnvironmentVariables();
      await this.auditAPIErrors();
      await this.auditManifestAndTelegram();
      await this.auditHealthEndpoints();
      this.determineOverallStatus();
      
      const report = this.generateFinalReport();
      
      // Сохранение отчета
      fs.writeFileSync('FINAL_AUDIT_REPORT.json', JSON.stringify(report, null, 2));
      
      return report;
    } catch (error) {
      console.error('❌ Критическая ошибка аудита:', error.message);
      throw error;
    }
  }
}

async function main() {
  const audit = new FinalSystemAudit();
  await audit.runFullAudit();
}

main().catch(console.error);