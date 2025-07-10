/**
 * Скрипт проверки состояния базы данных UniFarm
 * Проверяет существующие таблицы и недостающие поля через Supabase API
 */

import { supabase } from '../core/supabase.js';
import { logger } from '../core/logger.js';

async function checkDatabaseStatus() {
  const report = {
    timestamp: new Date().toISOString(),
    existing_tables: {},
    missing_tables: [],
    table_analysis: {},
    critical_issues: [],
    recommendations: []
  };

  console.log('🔍 Начинаем проверку состояния базы данных...');

  // Список ожидаемых таблиц
  const expectedTables = [
    'users', 'transactions', 'referrals', 'farming_sessions', 'user_sessions',
    'boost_purchases', 'missions', 'user_missions', 'airdrops', 
    'daily_bonus_logs', 'withdraw_requests'
  ];

  // Проверяем каждую таблицу
  for (const tableName of expectedTables) {
    try {
      console.log(`📋 Проверка таблицы: ${tableName}`);
      
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ Таблица ${tableName} недоступна:`, error.message);
        report.missing_tables.push({
          table: tableName,
          error: error.message,
          status: 'missing'
        });
      } else {
        console.log(`✅ Таблица ${tableName} существует (${count || 0} записей)`);
        report.existing_tables[tableName] = {
          status: 'exists',
          records_count: count || 0
        };

        // Получаем пример структуры
        if (count > 0) {
          const { data: sampleData } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (sampleData && sampleData[0]) {
            report.table_analysis[tableName] = {
              fields: Object.keys(sampleData[0]),
              sample_record: sampleData[0]
            };
          }
        }
      }
    } catch (err) {
      console.log(`🚫 Ошибка при проверке ${tableName}:`, err.message);
      report.missing_tables.push({
        table: tableName,
        error: err.message,
        status: 'error'
      });
    }

    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Специальная проверка полей в таблице users
  if (report.existing_tables.users) {
    console.log('🔬 Детальная проверка полей таблицы users...');
    
    const requiredFields = [
      'ton_boost_package', 'updated_at'
    ];

    const userFields = report.table_analysis.users?.fields || [];
    const missingFields = requiredFields.filter(field => !userFields.includes(field));
    
    if (missingFields.length > 0) {
      report.critical_issues.push({
        table: 'users',
        issue: 'missing_fields',
        missing_fields: missingFields,
        severity: 'high'
      });
    }
  }

  // Анализ критичности
  const criticalTables = ['boost_purchases', 'missions', 'user_missions'];
  const missingCritical = report.missing_tables
    .filter(mt => criticalTables.includes(mt.table))
    .map(mt => mt.table);

  if (missingCritical.length > 0) {
    report.critical_issues.push({
      issue: 'missing_critical_tables',
      tables: missingCritical,
      severity: 'critical',
      impact: 'System modules will not function properly'
    });
  }

  // Генерируем рекомендации
  report.recommendations = generateRecommendations(report);

  // Статистика
  const existingCount = Object.keys(report.existing_tables).length;
  const missingCount = report.missing_tables.length;
  const totalExpected = expectedTables.length;
  const completeness = Math.round((existingCount / totalExpected) * 100);

  console.log('\n📊 СТАТИСТИКА ПРОВЕРКИ:');
  console.log(`✅ Существующие таблицы: ${existingCount}/${totalExpected} (${completeness}%)`);
  console.log(`❌ Отсутствующие таблицы: ${missingCount}`);
  console.log(`🚨 Критические проблемы: ${report.critical_issues.length}`);

  // Сохраняем отчет
  const reportPath = `docs/database_status_${Date.now()}.json`;
  await import('fs').then(fs => {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📝 Отчет сохранен: ${reportPath}`);
  });

  return report;
}

function generateRecommendations(report) {
  const recommendations = [];

  if (report.missing_tables.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'create_missing_tables',
      description: 'Создать недостающие таблицы через Supabase Dashboard',
      tables: report.missing_tables.map(mt => mt.table),
      sql_script: 'docs/database_fix_script.sql'
    });
  }

  if (report.critical_issues.some(ci => ci.issue === 'missing_fields')) {
    recommendations.push({
      priority: 'high',
      action: 'add_missing_fields',
      description: 'Добавить недостающие поля в существующие таблицы',
      details: report.critical_issues.filter(ci => ci.issue === 'missing_fields')
    });
  }

  if (Object.keys(report.existing_tables).length < 8) {
    recommendations.push({
      priority: 'medium',
      action: 'system_functionality_affected',
      description: 'Менее 70% таблиц существует - функциональность системы ограничена',
      affected_modules: ['boost', 'missions', 'airdrop', 'withdrawal']
    });
  }

  return recommendations;
}

// Запуск проверки
checkDatabaseStatus()
  .then(report => {
    console.log('\n🎯 Проверка завершена успешно!');
    
    if (report.critical_issues.length === 0 && report.missing_tables.length === 0) {
      console.log('✅ База данных полностью синхронизирована с кодом!');
    } else {
      console.log('⚠️ Требуются исправления. См. рекомендации в отчете.');
    }
  })
  .catch(error => {
    console.error('❌ Ошибка при проверке базы данных:', error.message);
    process.exit(1);
  });