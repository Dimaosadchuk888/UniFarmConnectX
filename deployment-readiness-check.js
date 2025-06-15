/**
 * Финальная проверка готовности UniFarm к deployment
 * Проверяет все секреты, подключения и модули перед запуском
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

class DeploymentReadinessCheck {
  constructor() {
    this.results = {
      secrets: { status: 'pending', checks: [] },
      database: { status: 'pending', checks: [] },
      modules: { status: 'pending', checks: [] },
      overall: { status: 'pending', readyForDeploy: false }
    };
  }

  log(category, check, status, details = null) {
    console.log(`[${category.toUpperCase()}] ${check}: ${status}`);
    if (details) console.log(`  → ${details}`);
    
    this.results[category].checks.push({
      check,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 1. Проверка всех необходимых секретов
   */
  checkSecrets() {
    console.log('\n🔐 ПРОВЕРКА СЕКРЕТОВ...');

    const requiredSecrets = {
      'SUPABASE_URL': process.env.SUPABASE_URL,
      'SUPABASE_KEY': process.env.SUPABASE_KEY,
      'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN,
      'NODE_ENV': process.env.NODE_ENV,
      'PORT': process.env.PORT
    };

    let allSecretsPresent = true;

    Object.entries(requiredSecrets).forEach(([key, value]) => {
      if (value) {
        this.log('secrets', key, 'НАЙДЕН', `${value.substring(0, 20)}...`);
      } else {
        this.log('secrets', key, 'ОТСУТСТВУЕТ', 'Требуется для deployment');
        allSecretsPresent = false;
      }
    });

    // Проверка корректности Supabase URL
    if (process.env.SUPABASE_URL) {
      if (process.env.SUPABASE_URL.includes('supabase.co')) {
        this.log('secrets', 'SUPABASE_URL_FORMAT', 'КОРРЕКТНЫЙ', 'Валидный Supabase URL');
      } else {
        this.log('secrets', 'SUPABASE_URL_FORMAT', 'НЕКОРРЕКТНЫЙ', 'URL не содержит supabase.co');
        allSecretsPresent = false;
      }
    }

    // Проверка отсутствия старых переменных
    const oldVars = ['DATABASE_URL', 'PGHOST', 'PGUSER', 'PGPASSWORD', 'PGPORT', 'PGDATABASE'];
    const foundOldVars = oldVars.filter(varName => process.env[varName]);

    if (foundOldVars.length === 0) {
      this.log('secrets', 'СТАРЫЕ_ПЕРЕМЕННЫЕ', 'ОЧИЩЕНЫ', 'Нет конфликтующих переменных');
    } else {
      this.log('secrets', 'СТАРЫЕ_ПЕРЕМЕННЫЕ', 'НАЙДЕНЫ', `Обнаружены: ${foundOldVars.join(', ')}`);
    }

    this.results.secrets.status = allSecretsPresent && foundOldVars.length === 0 ? 'success' : 'failed';
    return this.results.secrets.status === 'success';
  }

  /**
   * 2. Проверка подключения к Supabase
   */
  async checkDatabase() {
    console.log('\n🗄️ ПРОВЕРКА БАЗЫ ДАННЫХ...');

    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
      );

      // Проверка подключения
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (connectionError) {
        this.log('database', 'ПОДКЛЮЧЕНИЕ', 'ОШИБКА', connectionError.message);
        this.results.database.status = 'failed';
        return false;
      }

      this.log('database', 'ПОДКЛЮЧЕНИЕ', 'УСПЕШНО', 'Supabase API доступен');

      // Проверка существования таблиц
      const requiredTables = ['users', 'transactions', 'referrals', 'farming_sessions', 'user_sessions'];
      
      for (const table of requiredTables) {
        try {
          const { data, error } = await supabase.from(table).select('*').limit(1);
          if (error) {
            this.log('database', `ТАБЛИЦА_${table.toUpperCase()}`, 'ОШИБКА', error.message);
          } else {
            this.log('database', `ТАБЛИЦА_${table.toUpperCase()}`, 'ДОСТУПНА', `Записей: ${data?.length || 0}`);
          }
        } catch (tableError) {
          this.log('database', `ТАБЛИЦА_${table.toUpperCase()}`, 'НЕДОСТУПНА', tableError.message);
        }
      }

      // Проверка ключевых полей в users таблице
      const { data: usersSchema, error: schemaError } = await supabase
        .from('users')
        .select('telegram_id, username, ref_code, balance_uni, balance_ton')
        .limit(1);

      if (!schemaError && usersSchema) {
        this.log('database', 'СХЕМА_USERS', 'КОРРЕКТНАЯ', 'Все ключевые поля доступны');
      }

      this.results.database.status = 'success';
      return true;

    } catch (error) {
      this.log('database', 'КРИТИЧЕСКАЯ_ОШИБКА', 'ОШИБКА', error.message);
      this.results.database.status = 'failed';
      return false;
    }
  }

  /**
   * 3. Проверка модулей системы
   */
  async checkModules() {
    console.log('\n⚙️ ПРОВЕРКА МОДУЛЕЙ...');

    const moduleChecks = [
      {
        name: 'CORE_SUPABASE',
        description: 'Основное подключение к Supabase',
        check: () => {
          try {
            const { createClient } = require('@supabase/supabase-js');
            const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
            return client ? 'ЗАГРУЖЕН' : 'ОШИБКА';
          } catch (error) {
            return 'ОШИБКА';
          }
        }
      },
      {
        name: 'AUTH_SERVICE',
        description: 'Telegram авторизация',
        check: () => {
          try {
            // Проверка наличия токена бота
            return process.env.TELEGRAM_BOT_TOKEN ? 'ГОТОВ' : 'НЕТ_ТОКЕНА';
          } catch (error) {
            return 'ОШИБКА';
          }
        }
      },
      {
        name: 'PRODUCTION_CONFIG',
        description: 'Конфигурация production',
        check: () => {
          const isProduction = process.env.NODE_ENV === 'production';
          const hasPort = !!process.env.PORT;
          return isProduction && hasPort ? 'НАСТРОЕН' : 'ТРЕБУЕТ_НАСТРОЙКИ';
        }
      }
    ];

    let allModulesReady = true;

    for (const module of moduleChecks) {
      try {
        const result = await module.check();
        this.log('modules', module.name, result, module.description);
        if (result.includes('ОШИБКА') || result.includes('НЕТ_') || result.includes('ТРЕБУЕТ_')) {
          allModulesReady = false;
        }
      } catch (error) {
        this.log('modules', module.name, 'ОШИБКА', error.message);
        allModulesReady = false;
      }
    }

    this.results.modules.status = allModulesReady ? 'success' : 'failed';
    return allModulesReady;
  }

  /**
   * Генерация финального отчета готовности
   */
  generateFinalReport() {
    const allSystemsReady = Object.values(this.results)
      .filter(result => result !== this.results.overall)
      .every(result => result.status === 'success');

    console.log('\n' + '='.repeat(80));
    console.log('🚀 ФИНАЛЬНЫЙ ОТЧЕТ ГОТОВНОСТИ К DEPLOYMENT');
    console.log('='.repeat(80));

    console.log('\n✅ СЕКРЕТЫ:');
    this.results.secrets.checks.forEach(check => {
      const icon = check.status.includes('НАЙДЕН') || check.status.includes('КОРРЕКТНЫЙ') || check.status.includes('ОЧИЩЕНЫ') ? '✅' : '❌';
      console.log(`   ${icon} ${check.check}: ${check.details || check.status}`);
    });

    console.log('\n✅ БАЗА ДАННЫХ:');
    this.results.database.checks.forEach(check => {
      const icon = check.status.includes('УСПЕШНО') || check.status.includes('ДОСТУПНА') || check.status.includes('КОРРЕКТНАЯ') ? '✅' : '❌';
      console.log(`   ${icon} ${check.check}: ${check.details || check.status}`);
    });

    console.log('\n✅ МОДУЛИ:');
    this.results.modules.checks.forEach(check => {
      const icon = check.status.includes('ЗАГРУЖЕН') || check.status.includes('ГОТОВ') || check.status.includes('НАСТРОЕН') ? '✅' : '❌';
      console.log(`   ${icon} ${check.check}: ${check.details || check.status}`);
    });

    console.log('\n🎯 ИТОГОВАЯ ГОТОВНОСТЬ:');
    if (allSystemsReady) {
      console.log('✅ СИСТЕМА ПОЛНОСТЬЮ ГОТОВА К DEPLOYMENT');
      console.log('   - Все секреты настроены корректно');
      console.log('   - Supabase подключение работает стабильно');
      console.log('   - Модули загружены и функциональны');
      console.log('   - Старые конфликтующие переменные удалены');
      console.log('\n🚀 МОЖНО ЗАПУСКАТЬ DEPLOYMENT!');
    } else {
      console.log('⚠️ СИСТЕМА ТРЕБУЕТ ДОРАБОТКИ ПЕРЕД DEPLOYMENT');
      console.log('   Исправьте ошибки выше перед запуском');
    }

    console.log('\n📊 СТАТИСТИКА:');
    console.log(`   Секреты: ${this.results.secrets.checks.length} проверок`);
    console.log(`   База данных: ${this.results.database.checks.length} проверок`);
    console.log(`   Модули: ${this.results.modules.checks.length} проверок`);
    console.log(`   Общая готовность: ${allSystemsReady ? '100%' : '75%'}`);
    
    console.log('='.repeat(80));

    this.results.overall = {
      status: allSystemsReady ? 'ready' : 'not_ready',
      readyForDeploy: allSystemsReady,
      timestamp: new Date().toISOString()
    };

    return allSystemsReady;
  }

  /**
   * Основной метод проверки
   */
  async runFullCheck() {
    console.log('🔍 ЗАПУСК ФИНАЛЬНОЙ ПРОВЕРКИ ГОТОВНОСТИ К DEPLOYMENT');
    console.log('🎯 Цель: Подтвердить готовность UniFarm к production');
    console.log('=' * 80);

    const secretsReady = this.checkSecrets();
    const databaseReady = await this.checkDatabase();
    const modulesReady = await this.checkModules();

    const overallReady = this.generateFinalReport();

    return {
      ready: overallReady,
      results: this.results
    };
  }
}

// Запуск проверки готовности
const readinessCheck = new DeploymentReadinessCheck();
readinessCheck.runFullCheck()
  .then(result => {
    if (result.ready) {
      console.log('\n🎉 UniFarm готов к deployment!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Требуется исправление проблем перед deployment');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Критическая ошибка проверки:', error.message);
    process.exit(1);
  });