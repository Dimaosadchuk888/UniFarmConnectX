#!/usr/bin/env tsx
/**
 * Детальный аудит для определения:
 * 1. Какие поля требуют синхронизации
 * 2. Где нужны индексы для оптимизации
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

interface FieldSyncAnalysis {
  fieldName: string;
  sourceTable: string;
  targetTable: string;
  recordsWithDifference: number;
  maxDifference: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  syncStrategy: string;
}

interface IndexAnalysis {
  tableName: string;
  columnName: string;
  queryPattern: string;
  estimatedImpact: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  indexType: string;
}

const auditResults = {
  timestamp: new Date().toISOString(),
  fieldsToSync: [] as FieldSyncAnalysis[],
  indexesToCreate: [] as IndexAnalysis[],
  currentIndexes: [] as any[],
  performanceMetrics: {} as any,
  recommendations: [] as string[]
};

// 1. Анализ полей для синхронизации
async function analyzeFieldsForSync() {
  console.log('📊 АНАЛИЗ ПОЛЕЙ ДЛЯ СИНХРОНИЗАЦИИ\n');
  console.log('='.repeat(50) + '\n');
  
  // Анализ UNI farming полей
  console.log('1️⃣ Анализ UNI farming полей:\n');
  
  // Получаем данные для анализа
  const { data: users } = await supabase
    .from('users')
    .select('id, uni_deposit_amount, uni_farming_balance, uni_farming_rate, uni_farming_active');
  
  const { data: uniFarmingData } = await supabase
    .from('uni_farming_data')
    .select('user_id, deposit_amount, farming_balance, farming_rate, is_active');
  
  // Создаём мапу для быстрого поиска
  const farmingMap = new Map();
  uniFarmingData?.forEach(f => farmingMap.set(f.user_id, f));
  
  // Анализируем расхождения
  let depositDiffCount = 0;
  let maxDepositDiff = 0;
  let balanceDiffCount = 0;
  let maxBalanceDiff = 0;
  let rateDiffCount = 0;
  let activeDiffCount = 0;
  
  users?.forEach(user => {
    const farming = farmingMap.get(user.id);
    
    if (farming) {
      // Проверка deposit_amount
      const depositDiff = Math.abs(user.uni_deposit_amount - (farming.deposit_amount || 0));
      if (depositDiff > 0) {
        depositDiffCount++;
        maxDepositDiff = Math.max(maxDepositDiff, depositDiff);
      }
      
      // Проверка farming_balance
      const balanceDiff = Math.abs(user.uni_farming_balance - (farming.farming_balance || 0));
      if (balanceDiff > 0) {
        balanceDiffCount++;
        maxBalanceDiff = Math.max(maxBalanceDiff, balanceDiff);
      }
      
      // Проверка rate
      if (user.uni_farming_rate !== farming.farming_rate) {
        rateDiffCount++;
      }
      
      // Проверка active
      if (user.uni_farming_active !== farming.is_active) {
        activeDiffCount++;
      }
    }
  });
  
  console.log(`uni_deposit_amount: ${depositDiff?.diff_count || 0} расхождений, макс. разница: ${depositDiff?.max_diff || 0}`);
  
  if (depositDiff?.diff_count > 0) {
    auditResults.fieldsToSync.push({
      fieldName: 'uni_deposit_amount',
      sourceTable: 'uni_farming_data',
      targetTable: 'users',
      recordsWithDifference: depositDiff.diff_count,
      maxDifference: depositDiff.max_diff,
      priority: 'CRITICAL',
      syncStrategy: 'GREATEST(users.uni_deposit_amount, uni_farming_data.deposit_amount)'
    });
  }
  
  // Проверка uni_farming_balance
  const { data: balanceDiff } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        COUNT(*) as count,
        MAX(ABS(u.uni_farming_balance - COALESCE(ufd.farming_balance, 0))) as max_diff,
        SUM(CASE WHEN u.uni_farming_balance != COALESCE(ufd.farming_balance, 0) THEN 1 ELSE 0 END) as diff_count
      FROM users u
      LEFT JOIN uni_farming_data ufd ON u.id = ufd.user_id
    `
  }).single();
  
  console.log(`uni_farming_balance: ${balanceDiff?.diff_count || 0} расхождений, макс. разница: ${balanceDiff?.max_diff || 0}`);
  
  if (balanceDiff?.diff_count > 0) {
    auditResults.fieldsToSync.push({
      fieldName: 'uni_farming_balance',
      sourceTable: 'uni_farming_data',
      targetTable: 'users',
      recordsWithDifference: balanceDiff.diff_count,
      maxDifference: balanceDiff.max_diff,
      priority: 'CRITICAL',
      syncStrategy: 'GREATEST(users.uni_farming_balance, uni_farming_data.farming_balance)'
    });
  }
  
  // Проверка uni_farming_rate
  const { data: rateDiff } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        COUNT(*) as count,
        SUM(CASE WHEN u.uni_farming_rate != COALESCE(ufd.farming_rate, 0.01) THEN 1 ELSE 0 END) as diff_count
      FROM users u
      LEFT JOIN uni_farming_data ufd ON u.id = ufd.user_id
    `
  }).single();
  
  console.log(`uni_farming_rate: ${rateDiff?.diff_count || 0} расхождений`);
  
  // Проверка uni_farming_active
  const { data: activeDiff } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        SUM(CASE WHEN u.uni_farming_active != COALESCE(ufd.is_active, false) THEN 1 ELSE 0 END) as diff_count
      FROM users u
      LEFT JOIN uni_farming_data ufd ON u.id = ufd.user_id
    `
  }).single();
  
  console.log(`uni_farming_active: ${activeDiff?.diff_count || 0} расхождений`);
  
  // Анализ TON boost полей
  console.log('\n2️⃣ Анализ TON boost полей:\n');
  
  const { data: tonBalanceDiff } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        COUNT(*) as count,
        MAX(ABS(u.ton_farming_balance - COALESCE(tfd.farming_balance, 0))) as max_diff,
        SUM(CASE WHEN u.ton_farming_balance != COALESCE(tfd.farming_balance, 0) THEN 1 ELSE 0 END) as diff_count
      FROM users u
      LEFT JOIN ton_farming_data tfd ON u.id = CAST(tfd.user_id AS INTEGER)
    `
  }).single();
  
  console.log(`ton_farming_balance: ${tonBalanceDiff?.diff_count || 0} расхождений, макс. разница: ${tonBalanceDiff?.max_diff || 0}`);
  
  if (tonBalanceDiff?.diff_count > 0) {
    auditResults.fieldsToSync.push({
      fieldName: 'ton_farming_balance',
      sourceTable: 'ton_farming_data',
      targetTable: 'users',
      recordsWithDifference: tonBalanceDiff.diff_count,
      maxDifference: tonBalanceDiff.max_diff,
      priority: 'CRITICAL',
      syncStrategy: 'GREATEST(users.ton_farming_balance, ton_farming_data.farming_balance)'
    });
  }
}

// 2. Анализ существующих индексов
async function analyzeExistingIndexes() {
  console.log('\n📈 АНАЛИЗ СУЩЕСТВУЮЩИХ ИНДЕКСОВ\n');
  console.log('='.repeat(50) + '\n');
  
  const { data: indexes } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'transactions', 'uni_farming_data', 'ton_farming_data', 'withdraw_requests')
      ORDER BY tablename, indexname
    `
  });
  
  auditResults.currentIndexes = indexes || [];
  
  // Группируем по таблицам
  const indexesByTable: Record<string, string[]> = {};
  
  indexes?.forEach((idx: any) => {
    if (!indexesByTable[idx.tablename]) {
      indexesByTable[idx.tablename] = [];
    }
    indexesByTable[idx.tablename].push(idx.indexname);
  });
  
  Object.entries(indexesByTable).forEach(([table, idxList]) => {
    console.log(`${table}: ${idxList.length} индексов`);
    idxList.forEach(idx => console.log(`  - ${idx}`));
  });
}

// 3. Анализ паттернов запросов для определения нужных индексов
async function analyzeQueryPatterns() {
  console.log('\n🔍 АНАЛИЗ ПАТТЕРНОВ ЗАПРОСОВ\n');
  console.log('='.repeat(50) + '\n');
  
  // Анализ медленных запросов (эмуляция на основе структуры)
  const queryPatterns = [
    {
      pattern: "WHERE users.telegram_id = ?",
      frequency: "VERY HIGH",
      table: "users",
      column: "telegram_id"
    },
    {
      pattern: "WHERE transactions.user_id = ? ORDER BY created_at DESC",
      frequency: "VERY HIGH",
      table: "transactions",
      column: "user_id, created_at"
    },
    {
      pattern: "WHERE users.balance_uni > 0 OR users.balance_ton > 0",
      frequency: "HIGH",
      table: "users",
      column: "balance_uni, balance_ton"
    },
    {
      pattern: "WHERE users.uni_farming_active = true",
      frequency: "HIGH",
      table: "users",
      column: "uni_farming_active"
    },
    {
      pattern: "WHERE users.referred_by = ?",
      frequency: "MEDIUM",
      table: "users",
      column: "referred_by"
    },
    {
      pattern: "WHERE transactions.type = ?",
      frequency: "MEDIUM",
      table: "transactions",
      column: "type"
    },
    {
      pattern: "WHERE withdraw_requests.status = 'pending'",
      frequency: "HIGH",
      table: "withdraw_requests",
      column: "status"
    }
  ];
  
  // Проверяем какие индексы отсутствуют
  for (const pattern of queryPatterns) {
    const indexName = `idx_${pattern.table}_${pattern.column.replace(/, /g, '_')}`;
    const exists = auditResults.currentIndexes.some(
      (idx: any) => idx.tablename === pattern.table && idx.indexname.includes(pattern.column.split(',')[0])
    );
    
    if (!exists) {
      console.log(`❌ Отсутствует индекс для: ${pattern.pattern}`);
      
      auditResults.indexesToCreate.push({
        tableName: pattern.table,
        columnName: pattern.column,
        queryPattern: pattern.pattern,
        estimatedImpact: pattern.frequency === 'VERY HIGH' ? '10x speedup' : 
                        pattern.frequency === 'HIGH' ? '5x speedup' : '2x speedup',
        priority: pattern.frequency === 'VERY HIGH' ? 'CRITICAL' : 
                 pattern.frequency === 'HIGH' ? 'HIGH' : 'MEDIUM',
        indexType: pattern.column.includes(',') ? 'COMPOSITE' : 'SINGLE'
      });
    } else {
      console.log(`✅ Индекс существует для: ${pattern.pattern}`);
    }
  }
}

// 4. Анализ размера таблиц и статистики
async function analyzeTableStatistics() {
  console.log('\n📊 СТАТИСТИКА ТАБЛИЦ\n');
  console.log('='.repeat(50) + '\n');
  
  const { data: tableStats } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        n_live_tup as row_count,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'transactions', 'uni_farming_data', 'ton_farming_data')
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `
  });
  
  auditResults.performanceMetrics.tableStats = tableStats;
  
  tableStats?.forEach((stat: any) => {
    console.log(`${stat.tablename}:`);
    console.log(`  Размер: ${stat.total_size}`);
    console.log(`  Строк: ${stat.row_count}`);
    console.log(`  Мёртвых строк: ${stat.dead_rows}`);
    console.log(`  Последний vacuum: ${stat.last_vacuum || 'никогда'}`);
    console.log('');
  });
}

// 5. Генерация рекомендаций
function generateRecommendations() {
  console.log('\n💡 РЕКОМЕНДАЦИИ\n');
  console.log('='.repeat(50) + '\n');
  
  // Рекомендации по синхронизации
  if (auditResults.fieldsToSync.length > 0) {
    auditResults.recommendations.push(
      '1. СИНХРОНИЗАЦИЯ ДАННЫХ:',
      '   Необходимо синхронизировать следующие поля:'
    );
    
    auditResults.fieldsToSync.forEach(field => {
      auditResults.recommendations.push(
        `   - ${field.fieldName}: ${field.recordsWithDifference} записей (приоритет: ${field.priority})`
      );
    });
  }
  
  // Рекомендации по индексам
  if (auditResults.indexesToCreate.length > 0) {
    auditResults.recommendations.push(
      '\n2. СОЗДАНИЕ ИНДЕКСОВ:',
      '   Рекомендуется создать следующие индексы:'
    );
    
    auditResults.indexesToCreate
      .sort((a, b) => {
        const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .forEach(idx => {
        auditResults.recommendations.push(
          `   - ${idx.tableName}.${idx.columnName} (${idx.estimatedImpact}, приоритет: ${idx.priority})`
        );
      });
  }
  
  // Общие рекомендации
  auditResults.recommendations.push(
    '\n3. ПОРЯДОК ВЫПОЛНЕНИЯ:',
    '   а) Сначала создайте backup',
    '   б) Синхронизируйте критические поля',
    '   в) Создайте индексы с CONCURRENTLY',
    '   г) Обновите статистику (ANALYZE)',
    '   д) Проверьте производительность'
  );
  
  auditResults.recommendations.forEach(rec => console.log(rec));
}

// 6. Генерация SQL скриптов
async function generateSQLScripts() {
  console.log('\n📝 ГЕНЕРАЦИЯ SQL СКРИПТОВ\n');
  console.log('='.repeat(50) + '\n');
  
  // Скрипт синхронизации
  let syncScript = `-- Скрипт синхронизации данных
-- Сгенерирован: ${new Date().toISOString()}
-- ВНИМАНИЕ: Сделайте backup перед выполнением!

BEGIN;

-- Проверка контрольной суммы ДО
SELECT 'Контрольная сумма ДО:' as info,
       SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as checksum
FROM users;

`;

  auditResults.fieldsToSync.forEach(field => {
    if (field.fieldName === 'uni_deposit_amount') {
      syncScript += `
-- Синхронизация ${field.fieldName}
UPDATE users u
SET uni_deposit_amount = GREATEST(u.uni_deposit_amount, COALESCE(ufd.deposit_amount, 0))
FROM uni_farming_data ufd
WHERE u.id = ufd.user_id
  AND u.uni_deposit_amount != COALESCE(ufd.deposit_amount, 0);
`;
    } else if (field.fieldName === 'uni_farming_balance') {
      syncScript += `
-- Синхронизация ${field.fieldName}
UPDATE users u
SET uni_farming_balance = GREATEST(u.uni_farming_balance, COALESCE(ufd.farming_balance, 0))
FROM uni_farming_data ufd
WHERE u.id = ufd.user_id
  AND u.uni_farming_balance != COALESCE(ufd.farming_balance, 0);
`;
    } else if (field.fieldName === 'ton_farming_balance') {
      syncScript += `
-- Синхронизация ${field.fieldName}
UPDATE users u
SET ton_farming_balance = GREATEST(u.ton_farming_balance, COALESCE(tfd.farming_balance, 0))
FROM ton_farming_data tfd
WHERE u.id = CAST(tfd.user_id AS INTEGER)
  AND u.ton_farming_balance != COALESCE(tfd.farming_balance, 0);
`;
    }
  });

  syncScript += `
-- Проверка контрольной суммы ПОСЛЕ
SELECT 'Контрольная сумма ПОСЛЕ:' as info,
       SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as checksum
FROM users;

-- Если всё ОК - COMMIT, если нет - ROLLBACK
-- COMMIT;
`;

  // Скрипт создания индексов
  let indexScript = `-- Скрипт создания индексов
-- Сгенерирован: ${new Date().toISOString()}
-- Используется CONCURRENTLY для создания без блокировки

`;

  auditResults.indexesToCreate.forEach(idx => {
    const columns = idx.columnName.split(',').map(c => c.trim());
    const indexName = `idx_${idx.tableName}_${columns.join('_')}`;
    
    if (idx.indexType === 'COMPOSITE') {
      indexScript += `-- ${idx.queryPattern}
CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}
ON ${idx.tableName} (${columns.join(', ')});

`;
    } else {
      // Специальные индексы для определённых паттернов
      if (idx.columnName === 'uni_farming_active' || idx.columnName === 'status') {
        indexScript += `-- ${idx.queryPattern}
CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}
ON ${idx.tableName} (${idx.columnName})
WHERE ${idx.columnName} = ${idx.columnName === 'status' ? "'pending'" : "true"};

`;
      } else {
        indexScript += `-- ${idx.queryPattern}
CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}
ON ${idx.tableName} (${idx.columnName});

`;
      }
    }
  });

  indexScript += `-- Обновление статистики
ANALYZE users;
ANALYZE transactions;
ANALYZE uni_farming_data;
ANALYZE ton_farming_data;
`;

  // Сохраняем скрипты
  await fs.writeFile(
    path.join(process.cwd(), 'scripts', 'generated_sync_script.sql'),
    syncScript
  );
  
  await fs.writeFile(
    path.join(process.cwd(), 'scripts', 'generated_index_script.sql'),
    indexScript
  );
  
  console.log('✅ SQL скрипты сохранены:');
  console.log('   - scripts/generated_sync_script.sql');
  console.log('   - scripts/generated_index_script.sql');
}

// Главная функция
async function runDetailedAudit() {
  console.log('🔍 ДЕТАЛЬНЫЙ АУДИТ ДЛЯ СИНХРОНИЗАЦИИ И ИНДЕКСОВ');
  console.log('=' .repeat(50) + '\n');
  
  try {
    await analyzeFieldsForSync();
    await analyzeExistingIndexes();
    await analyzeQueryPatterns();
    await analyzeTableStatistics();
    generateRecommendations();
    await generateSQLScripts();
    
    // Сохраняем полный отчёт
    const reportPath = path.join(
      process.cwd(),
      'docs',
      'SYNC_AND_INDEX_AUDIT_REPORT.json'
    );
    
    await fs.writeFile(reportPath, JSON.stringify(auditResults, null, 2));
    
    console.log(`\n✅ Полный отчёт сохранён: ${reportPath}`);
    
    // Выводим итоговую статистику
    console.log('\n' + '='.repeat(50));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('='.repeat(50));
    console.log(`Полей для синхронизации: ${auditResults.fieldsToSync.length}`);
    console.log(`Индексов для создания: ${auditResults.indexesToCreate.length}`);
    console.log(`Существующих индексов: ${auditResults.currentIndexes.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

runDetailedAudit().catch(console.error);