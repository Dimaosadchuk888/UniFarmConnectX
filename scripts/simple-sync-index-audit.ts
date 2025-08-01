#!/usr/bin/env tsx
/**
 * Упрощённый аудит для определения полей синхронизации и индексов
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

// Главная функция
async function runSimpleAudit() {
  console.log('🔍 ДЕТАЛЬНЫЙ АУДИТ ДЛЯ СИНХРОНИЗАЦИИ И ИНДЕКСОВ');
  console.log('=' .repeat(50) + '\n');
  
  // 1. Анализ расхождений UNI farming
  console.log('📊 1. АНАЛИЗ РАСХОЖДЕНИЙ UNI FARMING\n');
  
  const { data: users } = await supabase
    .from('users')
    .select('id, telegram_id, username, uni_deposit_amount, uni_farming_balance, uni_farming_rate, uni_farming_active')
    .gt('uni_deposit_amount', 0);
  
  const { data: uniFarmingData } = await supabase
    .from('uni_farming_data')
    .select('*');
  
  // Создаём мапу для быстрого поиска
  const farmingMap = new Map();
  uniFarmingData?.forEach(f => farmingMap.set(f.user_id, f));
  
  const uniDifferences = [];
  let totalDepositDiff = 0;
  let totalBalanceDiff = 0;
  
  users?.forEach(user => {
    const farming = farmingMap.get(user.id);
    
    if (farming) {
      const depositDiff = Math.abs(user.uni_deposit_amount - (farming.deposit_amount || 0));
      const balanceDiff = Math.abs(user.uni_farming_balance - (farming.farming_balance || 0));
      
      if (depositDiff > 0.01 || balanceDiff > 0.01) {
        uniDifferences.push({
          user_id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          deposit_diff: depositDiff,
          balance_diff: balanceDiff,
          user_deposit: user.uni_deposit_amount,
          farming_deposit: farming.deposit_amount || 0,
          user_balance: user.uni_farming_balance,
          farming_balance: farming.farming_balance || 0
        });
        
        totalDepositDiff += depositDiff;
        totalBalanceDiff += balanceDiff;
      }
    }
  });
  
  console.log(`Найдено расхождений: ${uniDifferences.length}`);
  console.log(`Общая разница deposit: ${totalDepositDiff.toFixed(2)}`);
  console.log(`Общая разница balance: ${totalBalanceDiff.toFixed(2)}`);
  
  if (uniDifferences.length > 0) {
    console.log('\nПримеры расхождений (первые 5):');
    uniDifferences.slice(0, 5).forEach(diff => {
      console.log(`  User ${diff.user_id} (@${diff.username}):`);
      console.log(`    deposit: ${diff.user_deposit} vs ${diff.farming_deposit} (разница: ${diff.deposit_diff})`);
      console.log(`    balance: ${diff.user_balance} vs ${diff.farming_balance} (разница: ${diff.balance_diff})`);
    });
  }
  
  // 2. Анализ расхождений TON farming
  console.log('\n📊 2. АНАЛИЗ РАСХОЖДЕНИЙ TON FARMING\n');
  
  const { data: tonUsers } = await supabase
    .from('users')
    .select('id, telegram_id, username, ton_farming_balance, ton_boost_active, ton_boost_rate')
    .or('ton_farming_balance.gt.0,ton_boost_active.eq.true');
  
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('*');
  
  const tonMap = new Map();
  tonFarmingData?.forEach(f => tonMap.set(parseInt(f.user_id), f));
  
  const tonDifferences = [];
  let totalTonBalanceDiff = 0;
  
  tonUsers?.forEach(user => {
    const farming = tonMap.get(user.id);
    
    if (farming) {
      const balanceDiff = Math.abs(user.ton_farming_balance - (farming.farming_balance || 0));
      
      if (balanceDiff > 0.01) {
        tonDifferences.push({
          user_id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          balance_diff: balanceDiff,
          user_balance: user.ton_farming_balance,
          farming_balance: farming.farming_balance || 0
        });
        
        totalTonBalanceDiff += balanceDiff;
      }
    }
  });
  
  console.log(`Найдено расхождений: ${tonDifferences.length}`);
  console.log(`Общая разница balance: ${totalTonBalanceDiff.toFixed(2)}`);
  
  // 3. РЕКОМЕНДАЦИИ ПО СИНХРОНИЗАЦИИ
  console.log('\n✅ РЕКОМЕНДАЦИИ ПО СИНХРОНИЗАЦИИ\n');
  
  const syncFields = [];
  
  if (uniDifferences.length > 0) {
    if (totalDepositDiff > 0) {
      syncFields.push({
        field: 'uni_deposit_amount',
        table: 'users',
        source: 'uni_farming_data.deposit_amount',
        strategy: 'GREATEST(users.uni_deposit_amount, uni_farming_data.deposit_amount)',
        priority: 'CRITICAL',
        affected_records: uniDifferences.filter(d => d.deposit_diff > 0).length
      });
    }
    
    if (totalBalanceDiff > 0) {
      syncFields.push({
        field: 'uni_farming_balance',
        table: 'users',
        source: 'uni_farming_data.farming_balance',
        strategy: 'GREATEST(users.uni_farming_balance, uni_farming_data.farming_balance)',
        priority: 'CRITICAL',
        affected_records: uniDifferences.filter(d => d.balance_diff > 0).length
      });
    }
  }
  
  if (tonDifferences.length > 0) {
    syncFields.push({
      field: 'ton_farming_balance',
      table: 'users',
      source: 'ton_farming_data.farming_balance',
      strategy: 'GREATEST(users.ton_farming_balance, ton_farming_data.farming_balance)',
      priority: 'CRITICAL',
      affected_records: tonDifferences.length
    });
  }
  
  console.log('Поля для синхронизации:');
  syncFields.forEach(field => {
    console.log(`  - ${field.field}: ${field.affected_records} записей (${field.priority})`);
  });
  
  // 4. АНАЛИЗ НЕОБХОДИМЫХ ИНДЕКСОВ
  console.log('\n📈 АНАЛИЗ НЕОБХОДИМЫХ ИНДЕКСОВ\n');
  
  const recommendedIndexes = [
    {
      table: 'users',
      columns: 'telegram_id',
      reason: 'Поиск по telegram_id очень частый',
      priority: 'CRITICAL',
      type: 'btree'
    },
    {
      table: 'transactions',
      columns: 'user_id, created_at DESC',
      reason: 'История транзакций пользователя',
      priority: 'CRITICAL',
      type: 'btree'
    },
    {
      table: 'users',
      columns: 'balance_uni, balance_ton',
      reason: 'Фильтрация по балансам',
      priority: 'HIGH',
      type: 'btree',
      where: 'balance_uni > 0 OR balance_ton > 0'
    },
    {
      table: 'users',
      columns: 'uni_farming_active',
      reason: 'Поиск активных фермеров',
      priority: 'HIGH',
      type: 'btree',
      where: 'uni_farming_active = true'
    },
    {
      table: 'users',
      columns: 'referred_by',
      reason: 'Реферальные запросы',
      priority: 'MEDIUM',
      type: 'btree',
      where: 'referred_by IS NOT NULL'
    },
    {
      table: 'transactions',
      columns: 'type',
      reason: 'Фильтрация по типу транзакции',
      priority: 'MEDIUM',
      type: 'btree'
    },
    {
      table: 'withdraw_requests',
      columns: 'status',
      reason: 'Поиск pending выводов',
      priority: 'HIGH',
      type: 'btree',
      where: "status = 'pending'"
    },
    {
      table: 'withdraw_requests',
      columns: 'user_id',
      reason: 'Выводы пользователя',
      priority: 'HIGH',
      type: 'btree'
    }
  ];
  
  console.log('Рекомендуемые индексы:');
  recommendedIndexes.forEach((idx, i) => {
    console.log(`${i + 1}. ${idx.table}.${idx.columns} (${idx.priority})`);
    console.log(`   Причина: ${idx.reason}`);
    if (idx.where) {
      console.log(`   WHERE: ${idx.where}`);
    }
  });
  
  // 5. ГЕНЕРАЦИЯ SQL СКРИПТОВ
  console.log('\n📝 ГЕНЕРАЦИЯ SQL СКРИПТОВ\n');
  
  // Скрипт синхронизации
  let syncScript = `-- Скрипт синхронизации данных
-- Сгенерирован: ${new Date().toISOString()}
-- ОБЯЗАТЕЛЬНО сделайте backup перед выполнением!

BEGIN;

-- Сохраняем контрольную сумму ДО
CREATE TEMP TABLE checksum_before AS
SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total
FROM users;

`;

  syncFields.forEach(field => {
    if (field.field === 'uni_deposit_amount') {
      syncScript += `-- Синхронизация ${field.field} (${field.affected_records} записей)
UPDATE users u
SET uni_deposit_amount = GREATEST(u.uni_deposit_amount, COALESCE(ufd.deposit_amount, 0))
FROM uni_farming_data ufd
WHERE u.id = ufd.user_id
  AND u.uni_deposit_amount < COALESCE(ufd.deposit_amount, 0);

`;
    } else if (field.field === 'uni_farming_balance') {
      syncScript += `-- Синхронизация ${field.field} (${field.affected_records} записей)
UPDATE users u
SET uni_farming_balance = GREATEST(u.uni_farming_balance, COALESCE(ufd.farming_balance, 0))
FROM uni_farming_data ufd
WHERE u.id = ufd.user_id
  AND u.uni_farming_balance < COALESCE(ufd.farming_balance, 0);

`;
    } else if (field.field === 'ton_farming_balance') {
      syncScript += `-- Синхронизация ${field.field} (${field.affected_records} записей)
UPDATE users u
SET ton_farming_balance = GREATEST(u.ton_farming_balance, COALESCE(tfd.farming_balance, 0))
FROM ton_farming_data tfd
WHERE u.id = CAST(tfd.user_id AS INTEGER)
  AND u.ton_farming_balance < COALESCE(tfd.farming_balance, 0);

`;
    }
  });

  syncScript += `-- Проверяем контрольную сумму ПОСЛЕ
CREATE TEMP TABLE checksum_after AS
SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total
FROM users;

-- Сравниваем
SELECT 
  'ДО' as period, total 
FROM checksum_before
UNION ALL
SELECT 
  'ПОСЛЕ' as period, total 
FROM checksum_after;

-- Если суммы совпадают - коммитим
-- COMMIT;
-- Если нет - откатываем
-- ROLLBACK;
`;

  // Скрипт индексов
  let indexScript = `-- Скрипт создания индексов
-- Сгенерирован: ${new Date().toISOString()}
-- Используем CONCURRENTLY для создания без блокировки таблиц

`;

  recommendedIndexes.forEach((idx, i) => {
    const indexName = `idx_${idx.table}_${idx.columns.replace(/[, ]/g, '_').replace(/DESC/g, 'desc').toLowerCase()}`;
    
    indexScript += `-- ${i + 1}. ${idx.reason}
CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}
ON ${idx.table} (${idx.columns})`;
    
    if (idx.where) {
      indexScript += `
WHERE ${idx.where}`;
    }
    
    indexScript += `;

`;
  });

  indexScript += `-- Обновляем статистику после создания индексов
ANALYZE users;
ANALYZE transactions;
ANALYZE withdraw_requests;
`;

  // Сохраняем скрипты
  const scriptsDir = path.join(process.cwd(), 'scripts');
  
  await fs.writeFile(
    path.join(scriptsDir, 'generated_sync_script.sql'),
    syncScript
  );
  
  await fs.writeFile(
    path.join(scriptsDir, 'generated_index_script.sql'),
    indexScript
  );
  
  console.log('✅ SQL скрипты сохранены:');
  console.log('   - scripts/generated_sync_script.sql');
  console.log('   - scripts/generated_index_script.sql');
  
  // 6. ИТОГОВЫЙ ОТЧЁТ
  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГОВЫЙ ОТЧЁТ');
  console.log('='.repeat(50));
  console.log(`\n✅ Поля для синхронизации: ${syncFields.length}`);
  syncFields.forEach(field => {
    console.log(`   - ${field.field}: ${field.affected_records} записей`);
  });
  
  console.log(`\n✅ Индексы для создания: ${recommendedIndexes.length}`);
  console.log(`   - Критических: ${recommendedIndexes.filter(i => i.priority === 'CRITICAL').length}`);
  console.log(`   - Высокий приоритет: ${recommendedIndexes.filter(i => i.priority === 'HIGH').length}`);
  console.log(`   - Средний приоритет: ${recommendedIndexes.filter(i => i.priority === 'MEDIUM').length}`);
  
  console.log('\n📌 Следующие шаги:');
  console.log('   1. Создайте backup: pg_dump > backup.sql');
  console.log('   2. Выполните scripts/generated_sync_script.sql');
  console.log('   3. Выполните scripts/generated_index_script.sql');
  console.log('   4. Проверьте производительность');
  
  // Сохраняем детальный отчёт
  const report = {
    timestamp: new Date().toISOString(),
    uni_differences: uniDifferences,
    ton_differences: tonDifferences,
    sync_fields: syncFields,
    recommended_indexes: recommendedIndexes,
    total_deposit_diff: totalDepositDiff,
    total_balance_diff: totalBalanceDiff,
    total_ton_balance_diff: totalTonBalanceDiff
  };
  
  await fs.writeFile(
    path.join(process.cwd(), 'docs', 'SYNC_INDEX_AUDIT_REPORT.json'),
    JSON.stringify(report, null, 2)
  );
}

runSimpleAudit().catch(console.error);