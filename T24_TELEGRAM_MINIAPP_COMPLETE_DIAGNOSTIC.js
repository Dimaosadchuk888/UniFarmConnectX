/**
 * T24: Полная диагностика проблем Telegram Mini App UniFarm
 * Выявляет причины отсутствия initData и проблем с авторизацией
 */

import fs from 'fs';
import path from 'path';

class TelegramMiniAppDiagnostic {
  constructor() {
    this.results = {
      issues: [],
      recommendations: [],
      criticalErrors: [],
      serverCheck: null,
      clientCheck: null,
      configCheck: null
    };
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    if (details) {
      console.log(JSON.stringify(details, null, 2));
    }
  }

  /**
   * 1. Проверка клиентской части - почему initData пустой
   */
  checkClientTelegramIntegration() {
    this.log('info', '🔍 Проверка клиентской интеграции с Telegram...');
    
    const issues = [];
    
    // Проверяем main.tsx - наличие debug логов
    try {
      const mainPath = './client/src/main.tsx';
      if (fs.existsSync(mainPath)) {
        const content = fs.readFileSync(mainPath, 'utf8');
        
        // Проверяем наличие Telegram debug кода
        if (content.includes('=== TELEGRAM WEBAPP DEBUG START ===')) {
          this.log('success', '✅ Debug логи Telegram найдены в main.tsx');
        } else {
          issues.push('Отсутствуют debug логи для Telegram WebApp в main.tsx');
        }
        
        // Проверяем правильность инициализации
        if (content.includes('window.Telegram?.WebApp')) {
          this.log('success', '✅ Правильная проверка window.Telegram.WebApp');
        } else {
          issues.push('Неправильная проверка доступности Telegram WebApp');
        }
      } else {
        issues.push('Файл main.tsx не найден');
      }
    } catch (error) {
      issues.push(`Ошибка чтения main.tsx: ${error.message}`);
    }
    
    // Проверяем useTelegram hook
    try {
      const hookPath = './client/src/hooks/useTelegram.ts';
      if (fs.existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf8');
        
        if (content.includes('tg.ready()') && content.includes('tg.expand()')) {
          this.log('success', '✅ useTelegram hook правильно инициализирует WebApp');
        } else {
          issues.push('useTelegram hook не вызывает ready() или expand()');
        }
        
        if (content.includes('console.log')) {
          this.log('success', '✅ useTelegram имеет debug логи');
        } else {
          issues.push('useTelegram hook не имеет достаточного логирования');
        }
      } else {
        issues.push('Файл useTelegram.ts не найден');
      }
    } catch (error) {
      issues.push(`Ошибка чтения useTelegram.ts: ${error.message}`);
    }
    
    this.results.clientCheck = { issues, status: issues.length === 0 ? 'ok' : 'problems' };
    return issues;
  }

  /**
   * 2. Проверка серверной части - API endpoints
   */
  checkServerAPIEndpoints() {
    this.log('info', '🔍 Проверка серверных API endpoints...');
    
    const issues = [];
    
    // Проверяем routes.ts
    try {
      const routesPath = './server/routes.ts';
      if (fs.existsSync(routesPath)) {
        const content = fs.readFileSync(routesPath, 'utf8');
        
        // Проверяем наличие маршрутов авторизации
        const requiredRoutes = [
          '/register/telegram',
          '/auth',
          '/me'
        ];
        
        for (const route of requiredRoutes) {
          if (content.includes(route)) {
            this.log('success', `✅ Маршрут ${route} найден`);
          } else {
            issues.push(`Маршрут ${route} отсутствует в server/routes.ts`);
          }
        }
      } else {
        issues.push('Файл server/routes.ts не найден');
      }
    } catch (error) {
      issues.push(`Ошибка чтения server/routes.ts: ${error.message}`);
    }
    
    // Проверяем auth/routes.ts
    try {
      const authRoutesPath = './modules/auth/routes.ts';
      if (fs.existsSync(authRoutesPath)) {
        const content = fs.readFileSync(authRoutesPath, 'utf8');
        
        if (content.includes('/telegram') && content.includes('authenticateTelegram')) {
          this.log('success', '✅ Auth routes правильно настроены');
        } else {
          issues.push('Auth routes не содержат правильных Telegram endpoints');
        }
      } else {
        issues.push('Файл modules/auth/routes.ts не найден');
      }
    } catch (error) {
      issues.push(`Ошибка чтения auth/routes.ts: ${error.message}`);
    }
    
    this.results.serverCheck = { issues, status: issues.length === 0 ? 'ok' : 'problems' };
    return issues;
  }

  /**
   * 3. Проверка конфигурации для SPA fallback
   */
  checkSPAConfiguration() {
    this.log('info', '🔍 Проверка SPA конфигурации...');
    
    const issues = [];
    
    // Проверяем vite.config.ts
    try {
      const viteConfigPath = './vite.config.ts';
      if (fs.existsSync(viteConfigPath)) {
        const content = fs.readFileSync(viteConfigPath, 'utf8');
        
        // Проверяем SPA fallback для истории браузера
        if (content.includes('historyApiFallback') || content.includes('fallback')) {
          this.log('success', '✅ SPA fallback настроен');
        } else {
          this.log('warning', '⚠️ SPA fallback может отсутствовать');
          // Это может быть причиной "Not Found" ошибок
        }
      }
    } catch (error) {
      issues.push(`Ошибка чтения vite.config.ts: ${error.message}`);
    }
    
    // Проверяем server/index.ts на Express static middleware
    try {
      const serverIndexPath = './server/index.ts';
      if (fs.existsSync(serverIndexPath)) {
        const content = fs.readFileSync(serverIndexPath, 'utf8');
        
        if (content.includes('express.static') && content.includes('fallback')) {
          this.log('success', '✅ Express SPA fallback настроен');
        } else {
          issues.push('Express server не имеет SPA fallback middleware');
        }
      }
    } catch (error) {
      issues.push(`Ошибка чтения server/index.ts: ${error.message}`);
    }
    
    this.results.configCheck = { issues, status: issues.length === 0 ? 'ok' : 'problems' };
    return issues;
  }

  /**
   * 4. Проверка причин пустого initData
   */
  analyzeInitDataProblem() {
    this.log('info', '🔍 Анализ проблемы с пустым initData...');
    
    const possibleCauses = [
      {
        cause: 'Mini App не запускается из Telegram',
        description: 'Приложение открывается в обычном браузере, а не через Telegram WebApp',
        solution: 'Убедиться, что ссылка настроена в BotFather и открывается через @UniFarming_Bot'
      },
      {
        cause: 'Неправильный URL в BotFather',
        description: 'Web App URL в BotFather не соответствует production домену',
        solution: 'Проверить, что в BotFather установлен https://uni-farm-connect-x-osadchukdmitro2.replit.app'
      },
      {
        cause: 'Telegram WebApp SDK не загружается',
        description: 'Скрипт Telegram WebApp не подключен или блокируется',
        solution: 'Добавить <script src="https://telegram.org/js/telegram-web-app.js"></script> в index.html'
      },
      {
        cause: 'Слишком ранняя инициализация',
        description: 'Попытка получить initData до полной загрузки Telegram WebApp',
        solution: 'Добавить задержку или событие ready перед получением initData'
      }
    ];
    
    this.log('warning', '⚠️ Возможные причины пустого initData:');
    possibleCauses.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.cause}`);
      console.log(`   Описание: ${item.description}`);
      console.log(`   Решение: ${item.solution}`);
    });
    
    return possibleCauses;
  }

  /**
   * 5. Проверка index.html на наличие Telegram WebApp SDK
   */
  checkTelegramSDKIntegration() {
    this.log('info', '🔍 Проверка подключения Telegram WebApp SDK...');
    
    const issues = [];
    
    try {
      const indexPath = './client/index.html';
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        
        if (content.includes('telegram-web-app.js')) {
          this.log('success', '✅ Telegram WebApp SDK подключен в index.html');
        } else {
          issues.push('КРИТИЧНО: Telegram WebApp SDK не подключен в index.html');
          this.results.criticalErrors.push('Отсутствует Telegram WebApp SDK');
        }
        
        // Проверяем viewport meta для Mobile
        if (content.includes('viewport') && content.includes('width=device-width')) {
          this.log('success', '✅ Viewport meta настроен правильно');
        } else {
          issues.push('Viewport meta может быть настроен неправильно');
        }
      } else {
        issues.push('Файл client/index.html не найден');
      }
    } catch (error) {
      issues.push(`Ошибка чтения index.html: ${error.message}`);
    }
    
    return issues;
  }

  /**
   * 6. Генерация исправлений
   */
  generateFixes() {
    this.log('info', '🔧 Генерация плана исправлений...');
    
    const fixes = [];
    
    // Критичные исправления
    if (this.results.criticalErrors.length > 0) {
      fixes.push({
        priority: 'КРИТИЧНО',
        title: 'Подключить Telegram WebApp SDK',
        action: 'Добавить <script src="https://telegram.org/js/telegram-web-app.js"></script> в client/index.html',
        file: 'client/index.html'
      });
    }
    
    // Исправления инициализации
    fixes.push({
      priority: 'ВЫСОКИЙ',
      title: 'Улучшить инициализацию Telegram WebApp',
      action: 'Добавить задержку и проверки готовности перед получением initData',
      file: 'client/src/main.tsx'
    });
    
    // SPA fallback
    fixes.push({
      priority: 'СРЕДНИЙ',
      title: 'Настроить SPA fallback',
      action: 'Добавить middleware для обработки всех маршрутов через index.html',
      file: 'server/index.ts'
    });
    
    // Улучшенное логирование
    fixes.push({
      priority: 'НИЗКИЙ',
      title: 'Улучшить диагностическое логирование',
      action: 'Добавить более подробные логи во все этапы Telegram авторизации',
      file: 'multiple'
    });
    
    this.results.recommendations = fixes;
    return fixes;
  }

  /**
   * Основной метод диагностики
   */
  async runCompleteDiagnostic() {
    console.log('='.repeat(80));
    console.log('🚀 ПОЛНАЯ ДИАГНОСТИКА TELEGRAM MINI APP - UNIFARM');
    console.log('='.repeat(80));
    
    // 1. Проверка клиентской части
    const clientIssues = this.checkClientTelegramIntegration();
    
    // 2. Проверка серверной части
    const serverIssues = this.checkServerAPIEndpoints();
    
    // 3. Проверка конфигурации
    const configIssues = this.checkSPAConfiguration();
    
    // 4. Проверка Telegram SDK
    const sdkIssues = this.checkTelegramSDKIntegration();
    
    // 5. Анализ initData проблемы
    const initDataAnalysis = this.analyzeInitDataProblem();
    
    // 6. Генерация исправлений
    const fixes = this.generateFixes();
    
    // Сбор всех проблем
    const allIssues = [...clientIssues, ...serverIssues, ...configIssues, ...sdkIssues];
    this.results.issues = allIssues;
    
    // Отчет
    this.generateDiagnosticReport();
    
    return this.results;
  }

  /**
   * Генерация финального отчета
   */
  generateDiagnosticReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 ДИАГНОСТИЧЕСКИЙ ОТЧЕТ');
    console.log('='.repeat(80));
    
    // Критичные ошибки
    if (this.results.criticalErrors.length > 0) {
      console.log('\n🚨 КРИТИЧНЫЕ ОШИБКИ:');
      this.results.criticalErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    // Найденные проблемы
    if (this.results.issues.length > 0) {
      console.log('\n⚠️ НАЙДЕННЫЕ ПРОБЛЕМЫ:');
      this.results.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ Серьезных проблем в коде не найдено');
    }
    
    // Рекомендации
    console.log('\n🔧 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:');
    this.results.recommendations.forEach((fix, index) => {
      console.log(`\n${index + 1}. [${fix.priority}] ${fix.title}`);
      console.log(`   Действие: ${fix.action}`);
      console.log(`   Файл: ${fix.file}`);
    });
    
    // Статус компонентов
    console.log('\n📊 СТАТУС КОМПОНЕНТОВ:');
    console.log(`- Клиентская часть: ${this.results.clientCheck?.status || 'не проверено'}`);
    console.log(`- Серверная часть: ${this.results.serverCheck?.status || 'не проверено'}`);
    console.log(`- Конфигурация: ${this.results.configCheck?.status || 'не проверено'}`);
    
    // Следующие шаги
    console.log('\n🎯 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. Исправить критичные ошибки (если есть)');
    console.log('2. Проверить настройки BotFather');
    console.log('3. Убедиться, что приложение открывается через Telegram');
    console.log('4. Протестировать авторизацию с реальными Telegram данными');
    
    console.log('\n' + '='.repeat(80));
  }
}

// Запуск диагностики
async function main() {
  const diagnostic = new TelegramMiniAppDiagnostic();
  await diagnostic.runCompleteDiagnostic();
}

main().catch(console.error);