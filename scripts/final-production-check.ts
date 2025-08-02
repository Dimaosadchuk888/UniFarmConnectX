import { supabase } from '../core/supabase.js';
import * as fs from 'fs';

console.log('=== ФИНАЛЬНАЯ ПРОВЕРКА ГОТОВНОСТИ К PRODUCTION ===');
console.log('Дата: ' + new Date().toISOString());
console.log('Проверка после добавления индексов\n');

interface CheckResult {
  category: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  details: string;
  data?: any;
}

const results: CheckResult[] = [];

async function checkIndexes() {
  console.log('📊 ПРОВЕРКА ИНДЕКСОВ...');
  
  const { data: indexes } = await supabase.rpc('get_table_indexes');
  
  const criticalTables = ['users', 'transactions', 'referrals', 'ton_boost_purchases'];
  const tableIndexCount: any = {};
  
  criticalTables.forEach(table => {
    const tableIndexes = indexes?.filter((idx: any) => idx.table_name === table);
    tableIndexCount[table] = tableIndexes?.length || 0;
  });
  
  // Проверка минимального количества индексов
  const minIndexes = {
    users: 5, // telegram_id, farming_status, ton_farming, balances + primary key
    transactions: 7, // user_created, type_status, tx_hash, farming_rewards + 3 существующих
    referrals: 5, // inviter, user, inviter_level + 2 существующих
    ton_boost_purchases: 4 // user, active, package + primary key
  };
  
  let allGood = true;
  Object.entries(minIndexes).forEach(([table, minCount]) => {
    if (tableIndexCount[table] < minCount) {
      allGood = false;
      results.push({
        category: `INDEXES_${table.toUpperCase()}`,
        status: 'WARNING',
        details: `Таблица ${table} имеет ${tableIndexCount[table]} индексов, рекомендуется минимум ${minCount}`
      });
    } else {
      results.push({
        category: `INDEXES_${table.toUpperCase()}`,
        status: 'OK',
        details: `Таблица ${table} имеет достаточно индексов: ${tableIndexCount[table]}`
      });
    }
  });
  
  results.push({
    category: 'INDEX_OPTIMIZATION',
    status: allGood ? 'OK' : 'WARNING',
    details: allGood ? 'Все таблицы оптимизированы индексами' : 'Некоторые таблицы требуют дополнительных индексов',
    data: tableIndexCount
  });
}

async function checkSystemHealth() {
  console.log('\n🏥 ПРОВЕРКА ЗДОРОВЬЯ СИСТЕМЫ...');
  
  // Проверка активности пользователей
  const { data: activeUsers } = await supabase
    .from('users')
    .select('id')
    .or('balance_uni.gt.0,balance_ton.gt.0,uni_deposit_amount.gt.0');
  
  // Проверка последних транзакций
  const { data: recentTx } = await supabase
    .from('transactions')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  
  const lastTxTime = recentTx?.[0]?.created_at;
  const hoursSinceLastTx = lastTxTime 
    ? (Date.now() - new Date(lastTxTime).getTime()) / (1000 * 60 * 60)
    : 999;
  
  results.push({
    category: 'SYSTEM_ACTIVITY',
    status: hoursSinceLastTx < 24 ? 'OK' : 'WARNING',
    details: hoursSinceLastTx < 24 
      ? `Система активна, последняя транзакция ${hoursSinceLastTx.toFixed(1)} часов назад`
      : 'Нет активности более 24 часов',
    data: {
      activeUsers: activeUsers?.length || 0,
      lastTransaction: lastTxTime
    }
  });
  
  // Проверка TON Boost системы
  const { data: tonBoostData } = await supabase
    .from('ton_boost_purchases')
    .select('id')
    .eq('status', 'active');
  
  results.push({
    category: 'TON_BOOST_SYSTEM',
    status: 'OK',
    details: `Активных TON Boost пакетов: ${tonBoostData?.length || 0}`,
    data: {
      activePackages: tonBoostData?.length || 0
    }
  });
}

async function checkPerformance() {
  console.log('\n⚡ ПРОВЕРКА ПРОИЗВОДИТЕЛЬНОСТИ...');
  
  // Тест скорости запроса с индексами
  const startTime = Date.now();
  
  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, amount')
    .eq('user_id', 184)
    .order('created_at', { ascending: false })
    .limit(100);
  
  const queryTime = Date.now() - startTime;
  
  results.push({
    category: 'QUERY_PERFORMANCE',
    status: queryTime < 500 ? 'OK' : 'WARNING',
    details: `Тестовый запрос выполнен за ${queryTime}ms`,
    data: {
      queryTime,
      rowsReturned: data?.length || 0,
      hasError: !!error
    }
  });
}

async function generateFinalReport() {
  console.log('\n📝 ГЕНЕРАЦИЯ ФИНАЛЬНОГО ОТЧЕТА...\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_checks: results.length,
      errors: results.filter(r => r.status === 'ERROR').length,
      warnings: results.filter(r => r.status === 'WARNING').length,
      ok: results.filter(r => r.status === 'OK').length
    },
    results,
    final_verdict: ''
  };
  
  // Финальный вердикт
  if (report.summary.errors > 0) {
    report.final_verdict = '❌ ЕСТЬ КРИТИЧЕСКИЕ ПРОБЛЕМЫ!';
  } else if (report.summary.warnings > 0) {
    report.final_verdict = '⚠️ СИСТЕМА РАБОТАЕТ, НО ЕСТЬ ЗАМЕЧАНИЯ';
  } else {
    report.final_verdict = '✅ СИСТЕМА ПОЛНОСТЬЮ ГОТОВА К PRODUCTION!';
  }
  
  // Сохранение отчета
  fs.writeFileSync(
    'FINAL_PRODUCTION_CHECK_2025-08-02.json',
    JSON.stringify(report, null, 2)
  );
  
  // Вывод результатов
  console.log('=== РЕЗУЛЬТАТЫ ФИНАЛЬНОЙ ПРОВЕРКИ ===');
  console.log(`Всего проверок: ${report.summary.total_checks}`);
  console.log(`✅ Успешно: ${report.summary.ok}`);
  console.log(`⚠️ Предупреждений: ${report.summary.warnings}`);
  console.log(`❌ Ошибок: ${report.summary.errors}`);
  console.log(`\n${report.final_verdict}`);
  
  if (report.summary.warnings > 0) {
    console.log('\n⚠️ ДЕТАЛИ ПРЕДУПРЕЖДЕНИЙ:');
    results.filter(r => r.status === 'WARNING').forEach(r => {
      console.log(`- ${r.category}: ${r.details}`);
    });
  }
  
  console.log('\n📄 Полный отчет: FINAL_PRODUCTION_CHECK_2025-08-02.json');
}

async function runFinalCheck() {
  try {
    await checkIndexes();
    await checkSystemHealth();
    await checkPerformance();
    await generateFinalReport();
  } catch (error) {
    console.error('❌ Ошибка во время проверки:', error);
    results.push({
      category: 'CHECK_ERROR',
      status: 'ERROR',
      details: `Критическая ошибка: ${error}`
    });
    await generateFinalReport();
  }
}

runFinalCheck();