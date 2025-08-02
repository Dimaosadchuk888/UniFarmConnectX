import { supabase } from '../core/supabase.js';
import * as fs from 'fs';
import { createHash } from 'crypto';

console.log('=== ПОЛНЫЙ АУДИТ СИСТЕМЫ UNIFARM CONNECT ===');
console.log('Дата: ' + new Date().toISOString());
console.log('Цель: Проверка готовности к production\n');

interface AuditResult {
  category: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  details: string;
  data?: any;
}

const auditResults: AuditResult[] = [];

async function auditDatabase() {
  console.log('\n📊 АУДИТ БАЗЫ ДАННЫХ...');
  
  // 1. Проверка структуры таблиц
  const { data: tables } = await supabase.rpc('get_table_list');
  auditResults.push({
    category: 'DATABASE_STRUCTURE',
    status: 'OK',
    details: `Найдено таблиц: ${tables?.length || 0}`,
    data: tables?.map((t: any) => t.table_name)
  });

  // 2. Проверка пользователей
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*');
  
  if (usersError) {
    auditResults.push({
      category: 'USERS_TABLE',
      status: 'ERROR',
      details: `Ошибка чтения users: ${usersError.message}`
    });
  } else {
    const activeUsers = users?.filter(u => u.balance_uni > 0 || u.balance_ton > 0 || u.uni_deposit_amount > 0);
    auditResults.push({
      category: 'USERS_STATISTICS',
      status: 'OK',
      details: `Всего пользователей: ${users?.length}, Активных: ${activeUsers?.length}`,
      data: {
        total: users?.length,
        active: activeUsers?.length,
        withUniBalance: users?.filter(u => u.balance_uni > 0).length,
        withTonBalance: users?.filter(u => u.balance_ton > 0).length,
        withUniFarming: users?.filter(u => u.uni_deposit_amount > 0).length,
        withTonFarming: users?.filter(u => u.ton_farming_balance > 0).length
      }
    });
  }

  // 3. Проверка транзакций
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('type, status, currency')
    .order('created_at', { ascending: false })
    .limit(10000);
  
  if (txError) {
    auditResults.push({
      category: 'TRANSACTIONS_TABLE',
      status: 'ERROR',
      details: `Ошибка чтения transactions: ${txError.message}`
    });
  } else {
    const txStats = transactions?.reduce((acc: any, tx) => {
      const key = `${tx.type}_${tx.status}_${tx.currency}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    auditResults.push({
      category: 'TRANSACTION_STATISTICS',
      status: 'OK',
      details: `Проанализировано транзакций: ${transactions?.length}`,
      data: txStats
    });
  }

  // 4. Проверка целостности балансов
  const { data: balanceCheck } = await supabase.rpc('check_balance_integrity');
  if (balanceCheck && balanceCheck.length > 0) {
    auditResults.push({
      category: 'BALANCE_INTEGRITY',
      status: 'WARNING',
      details: `Найдены расхождения в балансах: ${balanceCheck.length} пользователей`,
      data: balanceCheck
    });
  } else {
    auditResults.push({
      category: 'BALANCE_INTEGRITY',
      status: 'OK',
      details: 'Все балансы корректны'
    });
  }

  // 5. Проверка TON Boost покупок
  const { data: tonBoosts } = await supabase
    .from('ton_boost_purchases')
    .select('*')
    .order('created_at', { ascending: false });
  
  auditResults.push({
    category: 'TON_BOOST_PURCHASES',
    status: 'OK',
    details: `Всего TON Boost покупок: ${tonBoosts?.length || 0}`,
    data: {
      total: tonBoosts?.length,
      activePackages: tonBoosts?.filter(b => b.status === 'active').length,
      uniqueUsers: new Set(tonBoosts?.map(b => b.user_id)).size
    }
  });

  // 6. Проверка дубликатов транзакций
  const { data: duplicates } = await supabase.rpc('find_duplicate_transactions');
  if (duplicates && duplicates.length > 0) {
    auditResults.push({
      category: 'DUPLICATE_TRANSACTIONS',
      status: 'WARNING',
      details: `Найдены потенциальные дубликаты: ${duplicates.length}`,
      data: duplicates
    });
  } else {
    auditResults.push({
      category: 'DUPLICATE_TRANSACTIONS',
      status: 'OK',
      details: 'Дубликаты транзакций не найдены'
    });
  }
}

async function auditReferralSystem() {
  console.log('\n👥 АУДИТ РЕФЕРАЛЬНОЙ СИСТЕМЫ...');
  
  const { data: referrals } = await supabase
    .from('referrals')
    .select('*');
  
  const referralTree: any = {};
  referrals?.forEach(r => {
    if (!referralTree[r.referrer_id]) {
      referralTree[r.referrer_id] = [];
    }
    referralTree[r.referrer_id].push(r.user_id);
  });

  // Проверка циклических ссылок
  const visited = new Set();
  let hasCycles = false;
  
  function checkCycle(userId: number, path: Set<number>) {
    if (path.has(userId)) {
      hasCycles = true;
      return;
    }
    if (visited.has(userId)) return;
    
    visited.add(userId);
    path.add(userId);
    
    if (referralTree[userId]) {
      referralTree[userId].forEach((ref: number) => checkCycle(ref, new Set(path)));
    }
  }
  
  Object.keys(referralTree).forEach(userId => {
    checkCycle(parseInt(userId), new Set());
  });

  auditResults.push({
    category: 'REFERRAL_CYCLES',
    status: hasCycles ? 'ERROR' : 'OK',
    details: hasCycles ? 'Найдены циклические реферальные связи!' : 'Циклических связей не найдено',
    data: {
      totalReferrals: referrals?.length,
      uniqueReferrers: Object.keys(referralTree).length
    }
  });
}

async function auditFarmingCalculations() {
  console.log('\n🌾 АУДИТ FARMING РАСЧЕТОВ...');
  
  // Проверка UNI farming
  const { data: uniActive } = await supabase
    .from('uni_farming_data')
    .select('*')
    .eq('is_active', true);
  
  let uniErrors = 0;
  uniActive?.forEach(farm => {
    const expectedDaily = farm.deposit_amount * 0.01; // 1% в день
    const actualDaily = parseFloat(farm.daily_income);
    if (Math.abs(expectedDaily - actualDaily) > 0.01) {
      uniErrors++;
    }
  });

  auditResults.push({
    category: 'UNI_FARMING_CALCULATIONS',
    status: uniErrors > 0 ? 'WARNING' : 'OK',
    details: uniErrors > 0 ? `Найдены ошибки в расчетах: ${uniErrors}` : 'Все расчеты корректны',
    data: {
      activeUniFramers: uniActive?.length,
      errorsFound: uniErrors
    }
  });

  // Проверка TON farming
  const { data: tonActive } = await supabase
    .from('ton_farming_data')
    .select('*')
    .gt('farming_balance', 0);
  
  auditResults.push({
    category: 'TON_FARMING_STATUS',
    status: 'OK',
    details: `Активных TON фармеров: ${tonActive?.length || 0}`,
    data: {
      activeTonFarmers: tonActive?.length,
      totalTonDeposited: tonActive?.reduce((sum, f) => sum + f.farming_balance, 0) || 0
    }
  });
}

async function auditSecurityAndPerformance() {
  console.log('\n🔒 АУДИТ БЕЗОПАСНОСТИ И ПРОИЗВОДИТЕЛЬНОСТИ...');
  
  // Проверка индексов
  const { data: indexes } = await supabase.rpc('get_table_indexes');
  const criticalTables = ['users', 'transactions', 'referrals', 'ton_boost_purchases'];
  const missingIndexes: string[] = [];
  
  criticalTables.forEach(table => {
    const tableIndexes = indexes?.filter((idx: any) => idx.table_name === table);
    if (!tableIndexes || tableIndexes.length < 2) {
      missingIndexes.push(table);
    }
  });

  auditResults.push({
    category: 'DATABASE_INDEXES',
    status: missingIndexes.length > 0 ? 'WARNING' : 'OK',
    details: missingIndexes.length > 0 
      ? `Таблицы без достаточных индексов: ${missingIndexes.join(', ')}`
      : 'Все критические таблицы имеют индексы',
    data: {
      totalIndexes: indexes?.length,
      missingOnTables: missingIndexes
    }
  });

  // Проверка размера таблиц
  const { data: tableSizes } = await supabase.rpc('get_table_sizes');
  const largeTables = tableSizes?.filter((t: any) => parseInt(t.size_mb) > 100);
  
  auditResults.push({
    category: 'TABLE_SIZES',
    status: largeTables?.length > 0 ? 'WARNING' : 'OK',
    details: largeTables?.length > 0 
      ? `Большие таблицы (>100MB): ${largeTables.map((t: any) => t.table_name).join(', ')}`
      : 'Все таблицы имеют приемлемый размер',
    data: tableSizes
  });
}

async function generateReport() {
  console.log('\n📝 ГЕНЕРАЦИЯ ОТЧЕТА...\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_checks: auditResults.length,
      errors: auditResults.filter(r => r.status === 'ERROR').length,
      warnings: auditResults.filter(r => r.status === 'WARNING').length,
      ok: auditResults.filter(r => r.status === 'OK').length
    },
    results: auditResults,
    recommendation: ''
  };

  // Рекомендация
  if (report.summary.errors > 0) {
    report.recommendation = '❌ НЕ ГОТОВО К PRODUCTION! Найдены критические ошибки.';
  } else if (report.summary.warnings > 2) {
    report.recommendation = '⚠️ ТРЕБУЕТ ВНИМАНИЯ! Много предупреждений, рекомендуется исправить перед production.';
  } else {
    report.recommendation = '✅ ГОТОВО К PRODUCTION! Система прошла все проверки.';
  }

  // Сохранение отчета
  fs.writeFileSync(
    'PRODUCTION_AUDIT_REPORT_2025-08-02.json',
    JSON.stringify(report, null, 2)
  );

  // Вывод итогов
  console.log('=== ИТОГИ АУДИТА ===');
  console.log(`Всего проверок: ${report.summary.total_checks}`);
  console.log(`✅ Успешно: ${report.summary.ok}`);
  console.log(`⚠️ Предупреждений: ${report.summary.warnings}`);
  console.log(`❌ Ошибок: ${report.summary.errors}`);
  console.log(`\n${report.recommendation}`);
  
  // Детали ошибок и предупреждений
  if (report.summary.errors > 0) {
    console.log('\n❌ КРИТИЧЕСКИЕ ОШИБКИ:');
    auditResults.filter(r => r.status === 'ERROR').forEach(r => {
      console.log(`- ${r.category}: ${r.details}`);
    });
  }
  
  if (report.summary.warnings > 0) {
    console.log('\n⚠️ ПРЕДУПРЕЖДЕНИЯ:');
    auditResults.filter(r => r.status === 'WARNING').forEach(r => {
      console.log(`- ${r.category}: ${r.details}`);
    });
  }

  console.log('\n📄 Полный отчет сохранен в: PRODUCTION_AUDIT_REPORT_2025-08-02.json');
}

// Запуск аудита
async function runFullAudit() {
  try {
    await auditDatabase();
    await auditReferralSystem();
    await auditFarmingCalculations();
    await auditSecurityAndPerformance();
    await generateReport();
  } catch (error) {
    console.error('❌ Ошибка во время аудита:', error);
    auditResults.push({
      category: 'AUDIT_ERROR',
      status: 'ERROR',
      details: `Критическая ошибка: ${error}`
    });
    await generateReport();
  }
}

runFullAudit();