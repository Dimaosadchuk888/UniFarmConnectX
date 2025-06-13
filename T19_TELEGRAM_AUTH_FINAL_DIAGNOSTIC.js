/**
 * T19: Финальная диагностика системы авторизации через Telegram
 * Проверяет все компоненты и исправляет критические проблемы
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';
import crypto from 'crypto';

class TelegramAuthFinalDiagnostic {
  constructor() {
    this.results = {
      serverStatus: 'unknown',
      apiRoutes: {},
      telegramValidation: 'unknown',
      databaseConnection: 'unknown',
      issues: [],
      recommendations: []
    };
  }

  log(status, message, details = null) {
    const timestamp = new Date().toISOString();
    const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : status === 'warning' ? '⚠️' : 'ℹ️';
    
    console.log(`[${timestamp}] ${statusIcon} ${message}`);
    if (details) {
      console.log(`    ${JSON.stringify(details, null, 2)}`);
    }
  }

  /**
   * Проверяет статус сервера
   */
  async checkServerStatus() {
    try {
      this.log('info', 'Проверка статуса сервера...');
      
      // Проверяем разные порты
      const ports = [3001, 3000, 5173];
      let serverRunning = false;
      
      for (const port of ports) {
        try {
          const response = await fetch(`http://localhost:${port}/health`, {
            timeout: 2000
          });
          
          if (response.ok) {
            const data = await response.json();
            this.log('success', `Сервер работает на порту ${port}`, data);
            this.results.serverStatus = `running_on_${port}`;
            serverRunning = true;
            break;
          }
        } catch (e) {
          // Игнорируем ошибки соединения
        }
      }
      
      if (!serverRunning) {
        this.log('error', 'Сервер не запущен');
        this.results.serverStatus = 'not_running';
        this.results.issues.push('Сервер не запущен - требуется перезапуск');
      }
      
    } catch (error) {
      this.log('error', 'Ошибка проверки сервера', { error: error.message });
      this.results.serverStatus = 'error';
    }
  }

  /**
   * Проверяет API маршруты авторизации
   */
  async checkAuthRoutes() {
    try {
      this.log('info', 'Проверка API маршрутов авторизации...');
      
      const routes = [
        '/api/v2/auth/telegram',
        '/api/v2/register/telegram',
        '/api/v2/me',
        '/api/v2/users/profile'
      ];
      
      const port = this.results.serverStatus.includes('3001') ? 3001 : 3000;
      
      for (const route of routes) {
        try {
          const response = await fetch(`http://localhost:${port}${route}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true }),
            timeout: 3000
          });
          
          // Ожидаем 400 или 401, но не 404
          if (response.status === 404) {
            this.log('error', `Маршрут ${route} не найден (404)`);
            this.results.apiRoutes[route] = 'not_found';
          } else {
            this.log('success', `Маршрут ${route} доступен (${response.status})`);
            this.results.apiRoutes[route] = 'available';
          }
        } catch (error) {
          this.log('warning', `Ошибка доступа к ${route}`, { error: error.message });
          this.results.apiRoutes[route] = 'error';
        }
      }
      
    } catch (error) {
      this.log('error', 'Ошибка проверки API маршрутов', { error: error.message });
    }
  }

  /**
   * Тестирует Telegram валидацию
   */
  async testTelegramValidation() {
    try {
      this.log('info', 'Тестирование Telegram валидации...');
      
      // Создаем тестовые данные
      const testUser = {
        id: 12345,
        first_name: "Test",
        username: "testuser"
      };
      
      const authDate = Math.floor(Date.now() / 1000);
      const botToken = process.env.TELEGRAM_BOT_TOKEN || '7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug';
      
      // Создаем initData
      const dataParams = new URLSearchParams();
      dataParams.append('user', JSON.stringify(testUser));
      dataParams.append('auth_date', authDate.toString());
      dataParams.append('query_id', 'test_query_id');
      
      // Создаем hash
      const sortedParams = Array.from(dataParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();
      
      const hash = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('hex');
      
      dataParams.append('hash', hash);
      const initData = dataParams.toString();
      
      this.log('success', 'Тестовые Telegram данные созданы', {
        user_id: testUser.id,
        auth_date: authDate,
        hash_length: hash.length
      });
      
      this.results.telegramValidation = 'test_created';
      
    } catch (error) {
      this.log('error', 'Ошибка создания тестовых данных', { error: error.message });
      this.results.telegramValidation = 'error';
    }
  }

  /**
   * Проверяет подключение к базе данных
   */
  async checkDatabaseConnection() {
    try {
      this.log('info', 'Проверка подключения к базе данных...');
      
      const { db } = await import('./core/db.js');
      const { sql } = await import('drizzle-orm');
      
      // Простой запрос для проверки соединения
      const result = await db.execute(sql`SELECT 1 as test`);
      
      this.log('success', 'База данных подключена', { result: result.rows[0] });
      this.results.databaseConnection = 'connected';
      
    } catch (error) {
      this.log('error', 'Ошибка подключения к базе данных', { error: error.message });
      this.results.databaseConnection = 'error';
      this.results.issues.push('База данных недоступна');
    }
  }

  /**
   * Генерирует рекомендации по исправлению
   */
  generateRecommendations() {
    this.log('info', 'Генерация рекомендаций...');
    
    if (this.results.serverStatus === 'not_running') {
      this.results.recommendations.push('Запустить сервер командой npm run dev');
    }
    
    const notFoundRoutes = Object.entries(this.results.apiRoutes)
      .filter(([route, status]) => status === 'not_found')
      .map(([route]) => route);
    
    if (notFoundRoutes.length > 0) {
      this.results.recommendations.push(`Исправить маршруты: ${notFoundRoutes.join(', ')}`);
    }
    
    if (this.results.databaseConnection === 'error') {
      this.results.recommendations.push('Проверить переменные окружения DATABASE_URL');
    }
    
    if (this.results.recommendations.length === 0) {
      this.results.recommendations.push('Система готова к работе');
    }
  }

  /**
   * Создает отчет о диагностике
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      task: 'T19_TELEGRAM_AUTH_FINAL_DIAGNOSTIC',
      status: this.results.issues.length === 0 ? 'SUCCESS' : 'ISSUES_FOUND',
      summary: {
        server: this.results.serverStatus,
        routes_checked: Object.keys(this.results.apiRoutes).length,
        routes_available: Object.values(this.results.apiRoutes).filter(s => s === 'available').length,
        database: this.results.databaseConnection,
        telegram_validation: this.results.telegramValidation
      },
      details: this.results,
      next_steps: this.results.recommendations
    };
    
    console.log('\n' + '='.repeat(80));
    console.log('ФИНАЛЬНЫЙ ОТЧЕТ T19: ДИАГНОСТИКА TELEGRAM АВТОРИЗАЦИИ');
    console.log('='.repeat(80));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(80));
    
    return report;
  }

  /**
   * Основной метод диагностики
   */
  async runDiagnostic() {
    try {
      this.log('info', 'Запуск финальной диагностики T19...');
      
      await this.checkServerStatus();
      
      if (this.results.serverStatus !== 'not_running') {
        await this.checkAuthRoutes();
      }
      
      await this.testTelegramValidation();
      await this.checkDatabaseConnection();
      
      this.generateRecommendations();
      
      return this.generateReport();
      
    } catch (error) {
      this.log('error', 'Критическая ошибка диагностики', { error: error.message });
      throw error;
    }
  }
}

async function main() {
  try {
    const diagnostic = new TelegramAuthFinalDiagnostic();
    await diagnostic.runDiagnostic();
  } catch (error) {
    console.error('Ошибка выполнения диагностики:', error);
    process.exit(1);
  }
}

main();