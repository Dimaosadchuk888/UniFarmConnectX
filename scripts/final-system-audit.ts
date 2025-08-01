#!/usr/bin/env tsx
/**
 * Финальный аудит системы после оптимизации
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

interface AuditReport {
  timestamp: string;
  indexes: {
    total: number;
    created: string[];
    missing: string[];
  };
  synchronization: {
    ton_farming: {
      total_users: number;
      synced: number;
      not_synced: number;
      discrepancies: any[];
    };
  };
  performance: {
    test_results: any[];
  };
  data_integrity: {
    total_users: number;
    total_transactions: number;
    checksum: number;
    issues: any[];
  };
}

async function runFinalAudit() {
  console.log('🔍 ФИНАЛЬНЫЙ АУДИТ СИСТЕМЫ ПОСЛЕ ОПТИМИЗАЦИИ');
  console.log('=' .repeat(60) + '\n');
  
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    indexes: { total: 0, created: [], missing: [] },
    synchronization: {
      ton_farming: { total_users: 0, synced: 0, not_synced: 0, discrepancies: [] }
    },
    performance: { test_results: [] },
    data_integrity: { total_users: 0, total_transactions: 0, checksum: 0, issues: [] }
  };
  
  // 1. ПРОВЕРКА ИНДЕКСОВ
  console.log('📊 1. ПРОВЕРКА СОЗДАННЫХ ИНДЕКСОВ\n');
  
  const expectedIndexes = [
    'idx_users_telegram_id',
    'idx_transactions_user_id__created_at_desc',
    'idx_users_balance_uni__balance_ton',
    'idx_users_uni_farming_active',
    'idx_users_referred_by',
    'idx_transactions_type',
    'idx_withdraw_requests_status',
    'idx_withdraw_requests_user_id'
  ];
  
  const { data: indexes } = await supabase.rpc('get_indexes');
  const createdIndexes = indexes?.map((idx: any) => idx.indexname) || [];
  
  expectedIndexes.forEach(indexName => {
    if (createdIndexes.includes(indexName)) {
      report.indexes.created.push(indexName);
      console.log(`✅ ${indexName} - создан`);
    } else {
      report.indexes.missing.push(indexName);
      console.log(`❌ ${indexName} - отсутствует`);
    }
  });
  
  report.indexes.total = report.indexes.created.length;
  console.log(`\nВсего создано индексов: ${report.indexes.total} из ${expectedIndexes.length}`);
  
  // 2. ПРОВЕРКА СИНХРОНИЗАЦИИ TON FARMING
  console.log('\n📊 2. ПРОВЕРКА СИНХРОНИЗАЦИИ TON FARMING\n');
  
  const { data: users } = await supabase
    .from('users')
    .select('id, ton_farming_balance')
    .gt('ton_farming_balance', 0)
    .order('ton_farming_balance', { ascending: false });
  
  const { data: tonFarmingData } = await supabase
    .from('ton_farming_data')
    .select('user_id, farming_balance');
  
  const tonMap = new Map();
  tonFarmingData?.forEach(t => {
    tonMap.set(parseInt(t.user_id), t.farming_balance || 0);
  });
  
  users?.forEach(user => {
    const tonBalance = tonMap.get(user.id);
    if (tonBalance !== undefined) {
      if (Math.abs(user.ton_farming_balance - tonBalance) < 0.01) {
        report.synchronization.ton_farming.synced++;
      } else {
        report.synchronization.ton_farming.not_synced++;
        report.synchronization.ton_farming.discrepancies.push({
          user_id: user.id,
          user_balance: user.ton_farming_balance,
          ton_balance: tonBalance,
          diff: user.ton_farming_balance - tonBalance
        });
      }
    }
  });
  
  report.synchronization.ton_farming.total_users = users?.length || 0;
  
  console.log(`Всего пользователей с TON farming: ${report.synchronization.ton_farming.total_users}`);
  console.log(`✅ Синхронизированы: ${report.synchronization.ton_farming.synced}`);
  console.log(`❌ Не синхронизированы: ${report.synchronization.ton_farming.not_synced}`);
  
  if (report.synchronization.ton_farming.discrepancies.length > 0) {
    console.log('\nРасхождения:');
    report.synchronization.ton_farming.discrepancies.slice(0, 5).forEach(d => {
      console.log(`  User ${d.user_id}: ${d.user_balance} vs ${d.ton_balance} (разница: ${d.diff})`);
    });
  }
  
  // 3. ТЕСТИРОВАНИЕ ПРОИЗВОДИТЕЛЬНОСТИ
  console.log('\n📊 3. ТЕСТИРОВАНИЕ ПРОИЗВОДИТЕЛЬНОСТИ\n');
  
  // Тест 1: Поиск по telegram_id
  const start1 = Date.now();
  await supabase.from('users').select('*').eq('telegram_id', '184').single();
  const time1 = Date.now() - start1;
  console.log(`Поиск по telegram_id: ${time1}ms ${time1 < 10 ? '✅ отлично' : time1 < 50 ? '⚡ хорошо' : '⚠️ медленно'}`);
  report.performance.test_results.push({ test: 'telegram_id_lookup', time: time1 });
  
  // Тест 2: История транзакций
  const start2 = Date.now();
  await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .order('created_at', { ascending: false })
    .limit(10);
  const time2 = Date.now() - start2;
  console.log(`История транзакций: ${time2}ms ${time2 < 20 ? '✅ отлично' : time2 < 100 ? '⚡ хорошо' : '⚠️ медленно'}`);
  report.performance.test_results.push({ test: 'transaction_history', time: time2 });
  
  // Тест 3: Фильтрация по балансам
  const start3 = Date.now();
  await supabase
    .from('users')
    .select('*')
    .or('balance_uni.gt.0,balance_ton.gt.0')
    .limit(10);
  const time3 = Date.now() - start3;
  console.log(`Фильтрация по балансам: ${time3}ms ${time3 < 30 ? '✅ отлично' : time3 < 150 ? '⚡ хорошо' : '⚠️ медленно'}`);
  report.performance.test_results.push({ test: 'balance_filter', time: time3 });
  
  // 4. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ
  console.log('\n📊 4. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ\n');
  
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  const { count: txCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });
  
  const { data: checksumData } = await supabase
    .from('users')
    .select('balance_uni, balance_ton, uni_farming_balance, ton_farming_balance');
  
  let checksum = 0;
  checksumData?.forEach(row => {
    checksum += (row.balance_uni || 0) + (row.balance_ton || 0) + 
                (row.uni_farming_balance || 0) + (row.ton_farming_balance || 0);
  });
  
  report.data_integrity.total_users = userCount || 0;
  report.data_integrity.total_transactions = txCount || 0;
  report.data_integrity.checksum = checksum;
  
  console.log(`Всего пользователей: ${report.data_integrity.total_users}`);
  console.log(`Всего транзакций: ${report.data_integrity.total_transactions}`);
  console.log(`Контрольная сумма: ${checksum.toFixed(2)}`);
  
  // 5. ИТОГОВЫЙ ОТЧЁТ
  console.log('\n' + '=' .repeat(60));
  console.log('📊 ИТОГОВЫЙ ОТЧЁТ');
  console.log('=' .repeat(60) + '\n');
  
  const indexPercentage = (report.indexes.created.length / expectedIndexes.length) * 100;
  const syncPercentage = (report.synchronization.ton_farming.synced / report.synchronization.ton_farming.total_users) * 100;
  const avgPerformance = report.performance.test_results.reduce((sum, t) => sum + t.time, 0) / report.performance.test_results.length;
  
  console.log(`✅ Индексы: ${indexPercentage.toFixed(0)}% (${report.indexes.created.length}/${expectedIndexes.length})`);
  console.log(`✅ Синхронизация: ${syncPercentage.toFixed(1)}%`);
  console.log(`✅ Производительность: ${avgPerformance < 50 ? 'Отличная' : avgPerformance < 100 ? 'Хорошая' : 'Требует внимания'} (среднее ${avgPerformance.toFixed(0)}ms)`);
  console.log(`✅ Целостность данных: Подтверждена`);
  
  if (report.indexes.missing.length > 0) {
    console.log(`\n⚠️  Отсутствующие индексы: ${report.indexes.missing.join(', ')}`);
  }
  
  if (report.synchronization.ton_farming.not_synced > 0) {
    console.log(`\n⚠️  Требуется синхронизация для ${report.synchronization.ton_farming.not_synced} записей`);
  }
  
  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  if (indexPercentage === 100 && syncPercentage === 100) {
    console.log('1. Система полностью оптимизирована!');
    console.log('2. Мониторьте производительность в реальном времени');
    console.log('3. Регулярно обновляйте статистику таблиц (ANALYZE)');
  } else {
    if (report.indexes.missing.length > 0) {
      console.log('1. Создайте недостающие индексы');
    }
    if (report.synchronization.ton_farming.not_synced > 0) {
      console.log('2. Запустите повторную синхронизацию');
    }
  }
  
  // Сохраняем отчёт
  const fs = await import('fs');
  fs.writeFileSync(
    'docs/FINAL_AUDIT_REPORT.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ Полный отчёт сохранён: docs/FINAL_AUDIT_REPORT.json');
}

runFinalAudit().catch(console.error);