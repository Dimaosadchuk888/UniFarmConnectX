/**
 * Полная валидация структуры базы данных UniFarm
 * Проверяет все таблицы на наличие необходимых полей
 */

import { supabase } from '../core/supabaseClient.js';
import { logger } from '../core/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ожидаемая структура базы данных
const EXPECTED_SCHEMA = {
  users: {
    required: [
      'id', 'telegram_id', 'username', 'first_name', 'last_name',
      'uni_balance', 'ton_balance', 'ref_code', 'referred_by',
      'created_at', 'is_premium', 'language_code', 'is_admin',
      'uni_farming_active', 'uni_farming_amount', 'uni_farming_start_timestamp',
      'ton_boost_package', 'ton_boost_active', 'ton_boost_start_timestamp',
      'ton_wallet_address', 'ton_wallet_verified', 'ton_wallet_linked_at'
    ],
    optional: ['photo_url']
  },
  transactions: {
    required: [
      'id', 'user_id', 'type', 'amount', 'amount_uni', 'amount_ton',
      'currency', 'status', 'description', 'created_at'
    ],
    optional: ['metadata', 'source', 'tx_hash', 'source_user_id', 'action']
  },
  referrals: {
    required: [
      'id', 'referrer_user_id', 'referred_user_id', 'level',
      'percentage', 'created_at'
    ],
    optional: []
  },
  farming_sessions: {
    required: [
      'id', 'user_id', 'type', 'amount', 'start_timestamp',
      'last_claim_timestamp', 'total_earned', 'is_active', 'created_at'
    ],
    optional: ['end_timestamp']
  },
  user_sessions: {
    required: [
      'id', 'user_id', 'session_token', 'created_at', 'expires_at'
    ],
    optional: ['last_activity', 'ip_address', 'user_agent']
  },
  boost_purchases: {
    required: [
      'id', 'user_id', 'package_id', 'amount_ton', 'daily_rate',
      'purchase_date', 'is_active'
    ],
    optional: ['expiry_date', 'total_earned']
  },
  missions: {
    required: [
      'id', 'title', 'description', 'mission_type', 'reward_type',
      'reward_amount', 'is_active', 'created_at'
    ],
    optional: ['requirements', 'icon']
  },
  user_missions: {
    required: [
      'id', 'user_id', 'mission_id', 'is_completed', 'completed_at',
      'reward_claimed', 'created_at'
    ],
    optional: ['progress']
  },
  airdrops: {
    required: [
      'id', 'title', 'description', 'total_amount', 'token_type',
      'start_date', 'end_date', 'is_active', 'created_at'
    ],
    optional: ['requirements', 'participants_count']
  },
  daily_bonus_logs: {
    required: [
      'id', 'user_id', 'day_number', 'bonus_amount', 'claimed_at'
    ],
    optional: ['streak_count']
  },
  withdraw_requests: {
    required: [
      'id', 'user_id', 'amount_ton', 'ton_wallet', 'status',
      'created_at'
    ],
    optional: ['processed_at', 'processed_by', 'tx_hash', 'notes']
  }
};

async function validateTableStructure(tableName, expectedFields) {
  try {
    console.log(`\n📋 Проверяем таблицу: ${tableName}`);
    
    // Получаем пример записи для анализа структуры
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        return {
          tableName,
          status: 'MISSING',
          error: 'Таблица не существует',
          missingFields: expectedFields.required,
          extraFields: []
        };
      }
      throw error;
    }

    // Если таблица пустая, пытаемся вставить и удалить тестовую запись
    let actualFields = [];
    if (!data || data.length === 0) {
      console.log(`⚠️  Таблица ${tableName} пустая, анализируем через информационную схему`);
      
      // Запрашиваем структуру через SQL
      const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
        table_name: tableName
      }).catch(() => ({ data: null, error: 'RPC not available' }));
      
      if (!columns) {
        // Fallback: пытаемся получить поля через ошибку вставки
        const testInsert = await supabase
          .from(tableName)
          .insert({})
          .select();
          
        if (testInsert.error && testInsert.error.message.includes('null value')) {
          // Парсим поля из сообщения об ошибке
          const match = testInsert.error.message.match(/column "([^"]+)"/);
          if (match) {
            console.log(`ℹ️  Обнаружено обязательное поле через ошибку: ${match[1]}`);
          }
        }
        
        // Для пустых таблиц возвращаем предупреждение
        return {
          tableName,
          status: 'EMPTY',
          warning: 'Таблица пуста, невозможно точно определить все поля',
          assumedFields: expectedFields.required,
          recordCount: 0
        };
      } else {
        actualFields = columns.map(col => col.column_name);
      }
    } else {
      actualFields = Object.keys(data[0]);
    }

    // Анализируем несоответствия
    const missingRequired = expectedFields.required.filter(field => !actualFields.includes(field));
    const missingOptional = expectedFields.optional.filter(field => !actualFields.includes(field));
    const extraFields = actualFields.filter(field => 
      !expectedFields.required.includes(field) && 
      !expectedFields.optional.includes(field)
    );

    // Получаем количество записей
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    const status = missingRequired.length > 0 ? 'ERROR' : 
                   missingOptional.length > 0 ? 'WARNING' : 'OK';

    return {
      tableName,
      status,
      recordCount: count || 0,
      actualFields,
      missingRequired,
      missingOptional,
      extraFields,
      fieldCount: {
        expected: expectedFields.required.length + expectedFields.optional.length,
        actual: actualFields.length
      }
    };

  } catch (error) {
    console.error(`❌ Ошибка при проверке ${tableName}:`, error.message);
    return {
      tableName,
      status: 'ERROR',
      error: error.message
    };
  }
}

async function checkCodeUsage() {
  console.log('\n🔍 Проверяем использование полей в коде...');
  
  const codeIssues = [];
  const modulesPath = path.join(path.dirname(__dirname), 'modules');
  
  // Список полей, которые используются в коде, но могут отсутствовать в БД
  const suspiciousFields = [
    'guest_id',
    'balance_uni', // Дубликат uni_balance
    'balance_ton', // Дубликат ton_balance
  ];
  
  // Проверяем каждый модуль
  const modules = fs.readdirSync(modulesPath);
  for (const module of modules) {
    const modulePath = path.join(modulesPath, module);
    if (!fs.statSync(modulePath).isDirectory()) continue;
    
    const files = fs.readdirSync(modulePath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    
    for (const file of files) {
      const filePath = path.join(modulePath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Проверяем подозрительные поля
      for (const field of suspiciousFields) {
        if (content.includes(field)) {
          codeIssues.push({
            file: `modules/${module}/${file}`,
            field,
            type: 'SUSPICIOUS_FIELD'
          });
        }
      }
    }
  }
  
  return codeIssues;
}

async function generateReport(results, codeIssues) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTables: Object.keys(EXPECTED_SCHEMA).length,
      checkedTables: results.length,
      okTables: results.filter(r => r.status === 'OK').length,
      warningTables: results.filter(r => r.status === 'WARNING').length,
      errorTables: results.filter(r => r.status === 'ERROR').length,
      missingTables: results.filter(r => r.status === 'MISSING').length,
      emptyTables: results.filter(r => r.status === 'EMPTY').length
    },
    criticalIssues: [],
    tableDetails: results,
    codeIssues,
    recommendations: []
  };

  // Анализируем критические проблемы
  for (const result of results) {
    if (result.status === 'ERROR' && result.missingRequired) {
      report.criticalIssues.push({
        table: result.tableName,
        issue: 'MISSING_REQUIRED_FIELDS',
        fields: result.missingRequired,
        impact: 'Система может работать некорректно'
      });
    }
    if (result.status === 'MISSING') {
      report.criticalIssues.push({
        table: result.tableName,
        issue: 'TABLE_NOT_EXISTS',
        impact: 'Модули, зависящие от этой таблицы, не будут работать'
      });
    }
  }

  // Генерируем рекомендации
  if (report.criticalIssues.length > 0) {
    report.recommendations.push({
      priority: 'CRITICAL',
      action: 'Немедленно исправить критические проблемы с базой данных',
      details: 'См. раздел criticalIssues'
    });
  }

  if (codeIssues.length > 0) {
    report.recommendations.push({
      priority: 'HIGH',
      action: 'Проверить и исправить использование несуществующих полей в коде',
      details: `Найдено ${codeIssues.length} потенциальных проблем в коде`
    });
  }

  // Статистика по записям
  const totalRecords = results.reduce((sum, r) => sum + (r.recordCount || 0), 0);
  report.summary.totalRecords = totalRecords;

  return report;
}

async function main() {
  console.log('🚀 Запускаем полную валидацию базы данных UniFarm...');
  console.log('📅 Дата проверки:', new Date().toLocaleString());
  
  const results = [];
  
  // Проверяем каждую таблицу
  for (const [tableName, fields] of Object.entries(EXPECTED_SCHEMA)) {
    const result = await validateTableStructure(tableName, fields);
    results.push(result);
    
    // Выводим краткий результат
    const icon = result.status === 'OK' ? '✅' : 
                 result.status === 'WARNING' ? '⚠️' : 
                 result.status === 'ERROR' ? '❌' : '🚫';
    console.log(`${icon} ${tableName}: ${result.status} (${result.recordCount || 0} записей)`);
    
    if (result.missingRequired?.length > 0) {
      console.log(`   ❗ Отсутствуют обязательные поля: ${result.missingRequired.join(', ')}`);
    }
  }
  
  // Проверяем использование полей в коде
  const codeIssues = await checkCodeUsage();
  if (codeIssues.length > 0) {
    console.log(`\n⚠️  Найдено ${codeIssues.length} потенциальных проблем в коде`);
  }
  
  // Генерируем отчет
  const report = await generateReport(results, codeIssues);
  
  // Выводим итоговую статистику
  console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
  console.log(`✅ Таблиц в порядке: ${report.summary.okTables}/${report.summary.totalTables}`);
  console.log(`⚠️  Таблиц с предупреждениями: ${report.summary.warningTables}`);
  console.log(`❌ Таблиц с ошибками: ${report.summary.errorTables}`);
  console.log(`🚫 Отсутствующих таблиц: ${report.summary.missingTables}`);
  console.log(`📝 Всего записей в БД: ${report.summary.totalRecords}`);
  
  if (report.criticalIssues.length > 0) {
    console.log(`\n🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ: ${report.criticalIssues.length}`);
    report.criticalIssues.forEach(issue => {
      console.log(`   - ${issue.table}: ${issue.issue}`);
    });
  }
  
  // Сохраняем детальный отчет
  const reportPath = `docs/DATABASE_VALIDATION_${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Детальный отчет сохранен: ${reportPath}`);
  
  // Возвращаем статус
  const isHealthy = report.criticalIssues.length === 0 && report.summary.errorTables === 0;
  console.log(`\n${isHealthy ? '✅ База данных готова к работе!' : '❌ Требуется исправление проблем!'}`);
  
  process.exit(isHealthy ? 0 : 1);
}

// Создаем RPC функцию если её нет (для получения структуры таблиц)
async function createRPCFunction() {
  const createFunction = `
    CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
    RETURNS TABLE(column_name text, data_type text, is_nullable text)
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT 
        column_name::text,
        data_type::text,
        is_nullable::text
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = $1
      ORDER BY ordinal_position;
    $$;
  `;
  
  try {
    await supabase.rpc('get_table_columns', { table_name: 'users' });
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('📝 Создаем вспомогательную функцию get_table_columns...');
      // Функция не существует, но мы не можем создать её через API
      console.log('ℹ️  Примечание: для полного анализа структуры пустых таблиц рекомендуется создать функцию get_table_columns');
    }
  }
}

// Запускаем валидацию
createRPCFunction().then(() => main()).catch(console.error);