/**
 * ЭТАП 6: Финальный тест деплоя Telegram Mini App
 * Проверка всех компонентов готовности к production
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

class TelegramDeployTest {
  constructor() {
    this.results = [];
    this.currentUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    // Инициализация Supabase для проверки подключения
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
    
    console.log('🚀 Запуск финального теста деплоя Telegram Mini App...\n');
  }

  log(category, test, status, details = null) {
    const entry = { category, test, status, details, timestamp: new Date().toISOString() };
    this.results.push(entry);
    
    const statusIcon = status === 'SUCCESS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${statusIcon} [${category}] ${test}${details ? ': ' + JSON.stringify(details) : ''}`);
  }

  /**
   * 1. Проверка запуска продакшн-сервера
   */
  async testProductionServer() {
    console.log('\n🖥️ 1. ПРОВЕРКА ПРОДАКШН-СЕРВЕРА\n');
    
    try {
      // Проверка health endpoint
      const healthResponse = await fetch(`${this.currentUrl}/health`);
      const healthData = await healthResponse.json();
      
      if (healthResponse.status === 200 && healthData.status === 'ok') {
        this.log('SERVER', 'Health endpoint /health', 'SUCCESS', {
          status: healthData.status,
          version: healthData.version,
          environment: healthData.environment
        });
      } else {
        this.log('SERVER', 'Health endpoint /health', 'ERROR', 'Неверный статус ответа');
      }
      
      // Проверка API health endpoint
      const apiHealthResponse = await fetch(`${this.currentUrl}/api/v2/health`);
      const apiHealthData = await apiHealthResponse.json();
      
      if (apiHealthResponse.status === 200 && apiHealthData.status === 'ok') {
        this.log('SERVER', 'API health endpoint /api/v2/health', 'SUCCESS');
      } else {
        this.log('SERVER', 'API health endpoint /api/v2/health', 'ERROR');
      }
      
    } catch (error) {
      this.log('SERVER', 'Подключение к серверу', 'ERROR', error.message);
    }
  }

  /**
   * 2. Проверка webhook Telegram
   */
  async testTelegramWebhook() {
    console.log('\n🤖 2. ПРОВЕРКА TELEGRAM WEBHOOK\n');
    
    try {
      // Получение информации о webhook
      const webhookResponse = await fetch(`https://api.telegram.org/bot${this.botToken}/getWebhookInfo`);
      const webhookData = await webhookResponse.json();
      
      if (webhookData.ok) {
        const webhookUrl = webhookData.result.url;
        const expectedUrl = `${this.currentUrl}/webhook`;
        
        if (webhookUrl === expectedUrl) {
          this.log('WEBHOOK', 'URL корректный', 'SUCCESS', webhookUrl);
        } else if (webhookUrl === '') {
          this.log('WEBHOOK', 'Webhook не установлен (polling режим)', 'WARNING', 'Требуется установка webhook');
        } else {
          this.log('WEBHOOK', 'URL неправильный', 'ERROR', { 
            current: webhookUrl, 
            expected: expectedUrl 
          });
        }
        
        this.log('WEBHOOK', 'Pending updates', 'SUCCESS', webhookData.result.pending_update_count);
      } else {
        this.log('WEBHOOK', 'Получение информации', 'ERROR', webhookData.description);
      }
      
    } catch (error) {
      this.log('WEBHOOK', 'Проверка webhook', 'ERROR', error.message);
    }
  }

  /**
   * 3. Проверка переменных окружения
   */
  testEnvironmentVariables() {
    console.log('\n🔧 3. ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ\n');
    
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_KEY', 
      'TELEGRAM_BOT_TOKEN',
      'JWT_SECRET',
      'NODE_ENV',
      'PORT'
    ];
    
    const obsoleteVars = [
      'DATABASE_URL',
      'PGHOST',
      'PGUSER',
      'PGPASSWORD',
      'PGDATABASE',
      'PGPORT',
      'NEON_URL'
    ];
    
    // Проверка обязательных переменных
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (value) {
        this.log('ENV', `${varName} установлен`, 'SUCCESS', value.substring(0, 20) + '...');
      } else {
        this.log('ENV', `${varName} отсутствует`, 'ERROR');
      }
    }
    
    // Проверка отсутствия устаревших переменных
    for (const varName of obsoleteVars) {
      const value = process.env[varName];
      if (value) {
        this.log('ENV', `${varName} найден (устаревший)`, 'WARNING', 'Требуется удаление');
      } else {
        this.log('ENV', `${varName} отсутствует`, 'SUCCESS', 'Корректно удален');
      }
    }
  }

  /**
   * 4. Проверка WebApp в Telegram
   */
  async testTelegramWebApp() {
    console.log('\n📱 4. ПРОВЕРКА TELEGRAM WEBAPP\n');
    
    try {
      // Проверка главной страницы
      const mainPageResponse = await fetch(this.currentUrl);
      const htmlContent = await mainPageResponse.text();
      
      // Проверка наличия Telegram WebApp скрипта
      if (htmlContent.includes('https://telegram.org/js/telegram-web-app.js')) {
        this.log('WEBAPP', 'Telegram WebApp скрипт найден', 'SUCCESS');
      } else {
        this.log('WEBAPP', 'Telegram WebApp скрипт отсутствует', 'ERROR');
      }
      
      // Проверка meta тегов для Telegram
      if (htmlContent.includes('meta name="telegram-web-app-ready"')) {
        this.log('WEBAPP', 'Meta тег telegram-web-app-ready', 'SUCCESS');
      } else {
        this.log('WEBAPP', 'Meta тег telegram-web-app-ready отсутствует', 'WARNING');
      }
      
      // Проверка viewport для мобильного
      if (htmlContent.includes('user-scalable=no')) {
        this.log('WEBAPP', 'Viewport настроен для мобильного', 'SUCCESS');
      } else {
        this.log('WEBAPP', 'Viewport не настроен', 'WARNING');
      }
      
      // Проверка manifest.json
      if (htmlContent.includes('rel="manifest"')) {
        this.log('WEBAPP', 'Manifest.json подключен', 'SUCCESS');
      } else {
        this.log('WEBAPP', 'Manifest.json не найден', 'WARNING');
      }
      
    } catch (error) {
      this.log('WEBAPP', 'Проверка WebApp', 'ERROR', error.message);
    }
  }

  /**
   * 5. Проверка подключения к базе данных
   */
  async testDatabaseConnection() {
    console.log('\n🗄️ 5. ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ\n');
    
    try {
      // Тестовый запрос к Supabase
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .limit(1);
        
      if (!error) {
        this.log('DATABASE', 'Подключение к Supabase', 'SUCCESS', `Получено ${data?.length || 0} записей`);
      } else {
        this.log('DATABASE', 'Подключение к Supabase', 'ERROR', error.message);
      }
      
      // Проверка таблиц
      const tables = ['users', 'transactions', 'referrals', 'farming_sessions'];
      for (const table of tables) {
        try {
          const { data: tableData, error: tableError } = await this.supabase
            .from(table)
            .select('*')
            .limit(1);
            
          if (!tableError) {
            this.log('DATABASE', `Таблица ${table}`, 'SUCCESS', `${tableData?.length || 0} записей`);
          } else {
            this.log('DATABASE', `Таблица ${table}`, 'ERROR', tableError.message);
          }
        } catch (err) {
          this.log('DATABASE', `Таблица ${table}`, 'ERROR', err.message);
        }
      }
      
    } catch (error) {
      this.log('DATABASE', 'Подключение к базе данных', 'ERROR', error.message);
    }
  }

  /**
   * 6. Тест регистрации пользователя
   */
  async testUserRegistration() {
    console.log('\n👤 6. ТЕСТ РЕГИСТРАЦИИ ПОЛЬЗОВАТЕЛЯ\n');
    
    try {
      // Попытка регистрации через API
      const registrationData = {
        telegram_id: `test_${Date.now()}`,
        username: 'deploy_test_user',
        first_name: 'Deploy Test'
      };
      
      const registrationResponse = await fetch(`${this.currentUrl}/api/v2/register/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });
      
      if (registrationResponse.status === 200) {
        const userData = await registrationResponse.json();
        this.log('REGISTRATION', 'API endpoint доступен', 'SUCCESS', {
          user_id: userData.user?.id,
          ref_code: userData.user?.ref_code
        });
        
        // Удаляем тестового пользователя
        if (userData.user?.id) {
          await this.supabase
            .from('users')
            .delete()
            .eq('id', userData.user.id);
          this.log('REGISTRATION', 'Тестовый пользователь удален', 'SUCCESS');
        }
      } else {
        this.log('REGISTRATION', 'API endpoint', 'ERROR', `HTTP ${registrationResponse.status}`);
      }
      
    } catch (error) {
      this.log('REGISTRATION', 'Тест регистрации', 'ERROR', error.message);
    }
  }

  /**
   * Генерация финального отчета
   */
  generateDeployReport() {
    console.log('\n📊 ФИНАЛЬНЫЙ ОТЧЕТ ДЕПЛОЯ\n');
    
    const totalTests = this.results.length;
    const successful = this.results.filter(r => r.status === 'SUCCESS').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    
    const deployStatus = {
      server_running: this.results.some(r => r.category === 'SERVER' && r.status === 'SUCCESS'),
      webhook_configured: this.results.some(r => r.category === 'WEBHOOK' && r.status === 'SUCCESS'),
      webapp_ready: this.results.some(r => r.category === 'WEBAPP' && r.status === 'SUCCESS'),
      database_connected: this.results.some(r => r.category === 'DATABASE' && r.status === 'SUCCESS'),
      registration_working: this.results.some(r => r.category === 'REGISTRATION' && r.status === 'SUCCESS')
    };
    
    console.log(`✅ Успешных тестов: ${successful}/${totalTests} (${Math.round((successful / totalTests) * 100)}%)`);
    console.log(`⚠️ Предупреждений: ${warnings}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log(`🌐 Replit URL: ${this.currentUrl}`);
    
    console.log('\nСтатус компонентов:');
    Object.entries(deployStatus).forEach(([component, status]) => {
      const icon = status ? '✅' : '❌';
      console.log(`${icon} ${component}: ${status ? 'готов' : 'требует внимания'}`);
    });
    
    return {
      summary: { totalTests, successful, warnings, errors },
      deployStatus,
      currentUrl: this.currentUrl,
      results: this.results
    };
  }

  /**
   * Основной метод выполнения всех тестов
   */
  async runFullDeployTest() {
    try {
      await this.testProductionServer();
      await this.testTelegramWebhook();
      this.testEnvironmentVariables();
      await this.testTelegramWebApp();
      await this.testDatabaseConnection();
      await this.testUserRegistration();
      
      const report = this.generateDeployReport();
      
      console.log('\n🎯 ЗАКЛЮЧЕНИЕ:\n');
      
      if (report.summary.successful >= report.summary.totalTests * 0.8) {
        console.log('🟢 СИСТЕМА ГОТОВА К PRODUCTION ДЕПЛОЮ');
        console.log('📱 Telegram Mini App может быть запущен');
      } else if (report.summary.successful >= report.summary.totalTests * 0.6) {
        console.log('🟡 СИСТЕМА ЧАСТИЧНО ГОТОВА - Требуются минимальные исправления');
      } else {
        console.log('🔴 СИСТЕМА ТРЕБУЕТ ДОРАБОТКИ - Найдены критические проблемы');
      }
      
      console.log(`\n🔗 WebApp URL для Telegram Bot: ${this.currentUrl}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Критическая ошибка при тестировании деплоя:', error.message);
      throw error;
    }
  }
}

async function main() {
  try {
    const test = new TelegramDeployTest();
    const report = await test.runFullDeployTest();
    
    // Сохраняем отчет
    const fs = await import('fs');
    fs.writeFileSync('TELEGRAM_DEPLOY_REPORT.json', JSON.stringify(report, null, 2));
    
    process.exit(report.summary.successful >= report.summary.totalTests * 0.8 ? 0 : 1);
  } catch (error) {
    console.error('💥 Фатальная ошибка:', error.message);
    process.exit(1);
  }
}

main();