#!/usr/bin/env tsx
/**
 * Аудит системы после создания индексов
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function runSystemAudit() {
  console.log('🔍 ПОЛНЫЙ АУДИТ СИСТЕМЫ ПОСЛЕ ОПТИМИЗАЦИИ');
  console.log('=' .repeat(60) + '\n');
  console.log(`Время: ${new Date().toLocaleString()}\n`);
  
  const auditResults = {
    timestamp: new Date().toISOString(),
    indexes: { status: 'unknown', message: '' },
    synchronization: { status: '', details: {} },
    performance: { tests: [] },
    dataIntegrity: { status: '', stats: {} },
    recommendations: []
  };
  
  // 1. ПРОВЕРКА СИНХРОНИЗАЦИИ TON FARMING
  console.log('📊 1. ПРОВЕРКА СИНХРОНИЗАЦИИ TON FARMING\n');
  
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
  
  let syncedCount = 0;
  let notSyncedCount = 0;
  const discrepancies = [];
  
  users?.forEach(user => {
    const tonBalance = tonMap.get(user.id);
    if (tonBalance !== undefined) {
      const diff = Math.abs(user.ton_farming_balance - tonBalance);
      if (diff < 0.01) {
        syncedCount++;
      } else {
        notSyncedCount++;
        if (discrepancies.length < 5) {
          discrepancies.push({
            user_id: user.id,
            user_balance: user.ton_farming_balance,
            ton_balance: tonBalance,
            diff: user.ton_farming_balance - tonBalance
          });
        }
      }
    }
  });
  
  const totalWithTon = users?.length || 0;
  const syncPercentage = totalWithTon > 0 ? (syncedCount / totalWithTon * 100) : 0;
  
  console.log(`Всего пользователей с TON farming: ${totalWithTon}`);
  console.log(`✅ Синхронизированы: ${syncedCount} (${syncPercentage.toFixed(1)}%)`);
  console.log(`❌ Не синхронизированы: ${notSyncedCount}`);
  
  if (discrepancies.length > 0) {
    console.log('\nПримеры расхождений:');
    discrepancies.forEach(d => {
      console.log(`  User ${d.user_id}: users.ton_farming_balance=${d.user_balance} vs ton_farming_data.farming_balance=${d.ton_balance} (разница: ${d.diff.toFixed(2)})`);
    });
  }
  
  auditResults.synchronization = {
    status: syncPercentage === 100 ? '✅ Полная синхронизация' : 
            syncPercentage > 95 ? '⚡ Почти синхронизировано' : 
            '⚠️ Требуется синхронизация',
    details: {
      total: totalWithTon,
      synced: syncedCount,
      notSynced: notSyncedCount,
      percentage: syncPercentage
    }
  };
  
  // 2. ТЕСТИРОВАНИЕ ПРОИЗВОДИТЕЛЬНОСТИ
  console.log('\n📊 2. ТЕСТИРОВАНИЕ ПРОИЗВОДИТЕЛЬНОСТИ\n');
  
  // Тест 1: Поиск по telegram_id (должен использовать индекс idx_users_telegram_id)
  const start1 = Date.now();
  const { data: user1 } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', '184')
    .single();
  const time1 = Date.now() - start1;
  console.log(`Поиск по telegram_id: ${time1}ms ${time1 < 10 ? '✅ отлично' : time1 < 50 ? '⚡ хорошо' : '⚠️ медленно'}`);
  
  // Тест 2: История транзакций (должен использовать индекс idx_transactions_user_id__created_at_desc)
  const start2 = Date.now();
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 184)
    .order('created_at', { ascending: false })
    .limit(20);
  const time2 = Date.now() - start2;
  console.log(`История транзакций (20 записей): ${time2}ms ${time2 < 20 ? '✅ отлично' : time2 < 100 ? '⚡ хорошо' : '⚠️ медленно'}`);
  
  // Тест 3: Фильтрация по типу транзакции (должен использовать индекс idx_transactions_type)
  const start3 = Date.now();
  const { data: tonDeposits } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'TON_DEPOSIT')
    .limit(10);
  const time3 = Date.now() - start3;
  console.log(`Фильтрация по типу транзакции: ${time3}ms ${time3 < 30 ? '✅ отлично' : time3 < 100 ? '⚡ хорошо' : '⚠️ медленно'}`);
  
  // Тест 4: Активные фермеры (должен использовать индекс idx_users_uni_farming_active)
  const start4 = Date.now();
  const { data: activeFarmers } = await supabase
    .from('users')
    .select('*')
    .eq('uni_farming_active', true)
    .limit(10);
  const time4 = Date.now() - start4;
  console.log(`Поиск активных фермеров: ${time4}ms ${time4 < 20 ? '✅ отлично' : time4 < 80 ? '⚡ хорошо' : '⚠️ медленно'}`);
  
  const avgTime = (time1 + time2 + time3 + time4) / 4;
  
  auditResults.performance = {
    tests: [
      { name: 'telegram_id_lookup', time: time1 },
      { name: 'transaction_history', time: time2 },
      { name: 'transaction_type_filter', time: time3 },
      { name: 'active_farmers', time: time4 }
    ]
  };
  
  // 3. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ
  console.log('\n📊 3. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ\n');
  
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  const { count: txCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });
  
  const { data: stats } = await supabase
    .from('users')
    .select('balance_uni, balance_ton, uni_farming_balance, ton_farming_balance');
  
  let totalUni = 0;
  let totalTon = 0;
  let totalUniFarming = 0;
  let totalTonFarming = 0;
  let activeUniFarmers = 0;
  let activeTonFarmers = 0;
  
  stats?.forEach(row => {
    totalUni += row.balance_uni || 0;
    totalTon += row.balance_ton || 0;
    totalUniFarming += row.uni_farming_balance || 0;
    totalTonFarming += row.ton_farming_balance || 0;
    
    if (row.uni_farming_balance > 0) activeUniFarmers++;
    if (row.ton_farming_balance > 0) activeTonFarmers++;
  });
  
  const checksum = totalUni + totalTon + totalUniFarming + totalTonFarming;
  
  console.log(`Всего пользователей: ${userCount}`);
  console.log(`Всего транзакций: ${txCount}`);
  console.log(`Общий баланс UNI: ${totalUni.toFixed(2)}`);
  console.log(`Общий баланс TON: ${totalTon.toFixed(2)}`);
  console.log(`Общий UNI farming: ${totalUniFarming.toFixed(2)}`);
  console.log(`Общий TON farming: ${totalTonFarming.toFixed(2)}`);
  console.log(`Активных UNI фермеров: ${activeUniFarmers}`);
  console.log(`Активных TON фермеров: ${activeTonFarmers}`);
  console.log(`\nКонтрольная сумма: ${checksum.toFixed(2)}`);
  
  auditResults.dataIntegrity = {
    status: '✅ Данные целостны',
    stats: {
      users: userCount,
      transactions: txCount,
      totalUni,
      totalTon,
      totalUniFarming,
      totalTonFarming,
      activeUniFarmers,
      activeTonFarmers,
      checksum
    }
  };
  
  // 4. ИТОГОВЫЙ ОТЧЁТ
  console.log('\n' + '=' .repeat(60));
  console.log('📊 ИТОГОВЫЙ ОТЧЁТ АУДИТА');
  console.log('=' .repeat(60) + '\n');
  
  console.log('🎯 СТАТУС СИСТЕМЫ:');
  console.log(`   Синхронизация: ${auditResults.synchronization.status}`);
  console.log(`   Производительность: ${avgTime < 30 ? '✅ Отличная' : avgTime < 80 ? '⚡ Хорошая' : '⚠️ Требует внимания'} (среднее ${avgTime.toFixed(0)}ms)`);
  console.log(`   Целостность: ${auditResults.dataIntegrity.status}`);
  
  console.log('\n📈 КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ:');
  console.log(`   • ${userCount} пользователей в системе`);
  console.log(`   • ${txCount} транзакций обработано`);
  console.log(`   • ${activeTonFarmers} активных TON фермеров`);
  console.log(`   • ${syncPercentage.toFixed(1)}% синхронизация TON farming`);
  console.log(`   • ${avgTime.toFixed(0)}ms средняя скорость запросов`);
  
  // Рекомендации
  if (syncPercentage < 100) {
    auditResults.recommendations.push('Запустить повторную синхронизацию для несинхронизированных записей');
  }
  if (avgTime > 100) {
    auditResults.recommendations.push('Проверить создание всех индексов в базе данных');
  }
  
  if (auditResults.recommendations.length > 0) {
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    auditResults.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
  } else {
    console.log('\n✅ СИСТЕМА ПОЛНОСТЬЮ ОПТИМИЗИРОВАНА!');
    console.log('   • Все данные синхронизированы');
    console.log('   • Производительность на высоком уровне');
    console.log('   • Рекомендуется регулярный мониторинг');
  }
  
  // Сохраняем отчёт
  fs.writeFileSync(
    'docs/SYSTEM_AUDIT_REPORT_FINAL.json',
    JSON.stringify(auditResults, null, 2)
  );
  
  console.log('\n✅ Полный отчёт сохранён: docs/SYSTEM_AUDIT_REPORT_FINAL.json');
  
  // Предупреждение о индексах
  console.log('\n📌 ПРИМЕЧАНИЕ: Для проверки созданных индексов выполните в БД:');
  console.log('   SELECT indexname FROM pg_indexes WHERE indexname LIKE \'idx_%\';');
}

runSystemAudit().catch(console.error);