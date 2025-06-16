/**
 * Финальный аудит начислений и базы данных UniFarm
 * Проверка UNI farming, TON Boost, партнерских начислений и схемы БД
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * ЭТАП 1 - Проверка начислений депозитов
 */
async function auditDepositEarnings() {
  console.log('=== ЭТАП 1: АУДИТ НАЧИСЛЕНИЙ ДЕПОЗИТОВ ===');
  
  const results = {
    uniFarming: { active: 0, earning: false, transactions: 0 },
    tonBoost: { active: 0, earning: false, transactions: 0 },
    issues: []
  };
  
  // Проверяем UNI farming депозиты
  console.log('\n1.1 UNI Farming депозиты:');
  const { data: uniFarmers, error: uniError } = await supabase
    .from('users')
    .select('id, username, uni_farming_rate, uni_deposit_amount, uni_farming_start_timestamp, balance_uni')
    .gt('uni_farming_rate', 0);
    
  if (uniError) {
    results.issues.push('UNI farming: ошибка получения фармеров - ' + uniError.message);
  } else {
    results.uniFarming.active = uniFarmers.length;
    console.log(`  Активных UNI фармеров: ${uniFarmers.length}`);
    
    uniFarmers.forEach(farmer => {
      const rate = parseFloat(farmer.uni_farming_rate || '0');
      const deposit = parseFloat(farmer.uni_deposit_amount || '0');
      console.log(`    ${farmer.username} (ID ${farmer.id}): rate ${rate}/час, депозит ${deposit} UNI, баланс ${farmer.balance_uni} UNI`);
    });
  }
  
  // Проверяем TON Boost депозиты
  console.log('\n1.2 TON Boost депозиты:');
  const { data: tonBoosts, error: tonError } = await supabase
    .from('boost_purchases')
    .select('user_id, boost_id, amount, daily_rate, status, is_active, total_earned, start_date, end_date')
    .eq('status', 'confirmed')
    .eq('is_active', true);
    
  if (tonError) {
    results.issues.push('TON Boost: ошибка получения boost пакетов - ' + tonError.message);
  } else {
    results.tonBoost.active = tonBoosts.length;
    console.log(`  Активных TON Boost пакетов: ${tonBoosts.length}`);
    
    tonBoosts.forEach(boost => {
      console.log(`    User ID ${boost.user_id}: ${boost.boost_id}, ${boost.amount} TON, daily rate ${boost.daily_rate}, earned ${boost.total_earned}`);
    });
  }
  
  // Проверяем транзакции начислений
  console.log('\n1.3 Транзакции начислений:');
  const farmingTypes = ['FARMING_REWARD', 'UNI_FARMING_REWARD', 'farming_income', 'ton_boost_income', 'TON_BOOST_INCOME'];
  
  for (const txType of farmingTypes) {
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('user_id, type, status, description, created_at')
      .eq('type', txType)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (!txError && transactions.length > 0) {
      console.log(`    ${txType}: ${transactions.length} последних транзакций`);
      transactions.forEach(tx => {
        console.log(`      User ID ${tx.user_id}: ${tx.status} - ${tx.description}`);
      });
      
      if (txType.includes('FARMING') || txType.includes('farming')) {
        results.uniFarming.transactions += transactions.length;
        results.uniFarming.earning = true;
      }
      if (txType.includes('TON') || txType.includes('boost')) {
        results.tonBoost.transactions += transactions.length;
        results.tonBoost.earning = true;
      }
    } else {
      console.log(`    ${txType}: транзакций не найдено`);
    }
  }
  
  return results;
}

/**
 * ЭТАП 2 - Проверка партнерских начислений
 */
async function auditReferralEarnings() {
  console.log('\n=== ЭТАП 2: АУДИТ ПАРТНЕРСКИХ НАЧИСЛЕНИЙ ===');
  
  const results = {
    referralChains: 0,
    referralTransactions: 0,
    referralEarnings: 0,
    maxLevel: 0,
    issues: []
  };
  
  // Проверяем реферальные цепочки
  console.log('\n2.1 Реферальные цепочки:');
  const { data: usersWithReferrers, error: refError } = await supabase
    .from('users')
    .select('id, username, referred_by, ref_code')
    .not('referred_by', 'is', null);
    
  if (refError) {
    results.issues.push('Реферальные цепочки: ошибка получения - ' + refError.message);
  } else {
    results.referralChains = usersWithReferrers.length;
    console.log(`  Пользователей с рефререрами: ${usersWithReferrers.length}`);
    
    // Анализируем глубину цепочек
    for (const user of usersWithReferrers.slice(0, 5)) {
      const chainDepth = await calculateChainDepth(user.id, usersWithReferrers);
      results.maxLevel = Math.max(results.maxLevel, chainDepth);
      console.log(`    ${user.username} (ID ${user.id}): цепочка ${chainDepth} уровней, ref_code: ${user.ref_code}`);
    }
  }
  
  // Проверяем реферальные транзакции
  console.log('\n2.2 Реферальные транзакции:');
  const referralTypes = ['REFERRAL_REWARD', 'referral_bonus', 'REFERRAL_BONUS'];
  
  for (const txType of referralTypes) {
    const { data: refTx, error: refTxError } = await supabase
      .from('transactions')
      .select('user_id, type, status, description, created_at')
      .eq('type', txType)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!refTxError && refTx.length > 0) {
      console.log(`    ${txType}: ${refTx.length} транзакций`);
      results.referralTransactions += refTx.length;
      
      refTx.slice(0, 3).forEach(tx => {
        console.log(`      User ID ${tx.user_id}: ${tx.description}`);
      });
    } else {
      console.log(`    ${txType}: транзакций не найдено`);
    }
  }
  
  // Проверяем таблицы referrals и referral_earnings
  console.log('\n2.3 Специализированные таблицы:');
  
  const { data: referralsTable, error: refTableError } = await supabase
    .from('referrals')
    .select('*')
    .limit(5);
    
  if (!refTableError && referralsTable.length > 0) {
    console.log(`    referrals таблица: ${referralsTable.length} записей`);
    referralsTable.forEach(ref => {
      console.log(`      ID ${ref.id}: referrer ${ref.referrer_user_id} → referred ${ref.referred_user_id}`);
    });
  } else {
    console.log('    referrals таблица: пустая или недоступна');
  }
  
  // Проверяем referral_earnings
  const { data: earningsTable } = await supabase
    .from('referral_earnings')
    .select('*')
    .limit(5);
    
  if (earningsTable && earningsTable.length > 0) {
    console.log(`    referral_earnings таблица: ${earningsTable.length} записей`);
    results.referralEarnings = earningsTable.length;
  } else {
    console.log('    referral_earnings таблица: пустая или недоступна');
  }
  
  return results;
}

/**
 * Рассчитывает глубину реферальной цепочки
 */
async function calculateChainDepth(userId, usersData) {
  let depth = 0;
  let currentUserId = userId;
  
  while (depth < 20) {
    const user = usersData.find(u => u.id === currentUserId);
    if (!user || !user.referred_by) break;
    
    depth++;
    currentUserId = user.referred_by;
  }
  
  return depth;
}

/**
 * ЭТАП 3 - Аудит таблиц Supabase
 */
async function auditSupabaseTables() {
  console.log('\n=== ЭТАП 3: АУДИТ ТАБЛИЦ SUPABASE ===');
  
  const results = {
    tables: {},
    issues: []
  };
  
  const tablesToCheck = [
    'users',
    'transactions', 
    'referrals',
    'referral_earnings',
    'boost_purchases',
    'farming_sessions',
    'missions',
    'mission_progress',
    'airdrop_claims',
    'wallet_logs',
    'daily_bonus_history'
  ];
  
  for (const tableName of tablesToCheck) {
    console.log(`\n3.${tablesToCheck.indexOf(tableName) + 1} Таблица: ${tableName}`);
    
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
        
      if (error) {
        console.log(`    ❌ Недоступна: ${error.message}`);
        results.issues.push(`${tableName}: ${error.message}`);
        results.tables[tableName] = { exists: false, count: 0, sample: null };
      } else {
        console.log(`    ✅ Доступна: ${count} записей`);
        results.tables[tableName] = { exists: true, count: count, sample: data[0] || null };
        
        if (data[0]) {
          const fields = Object.keys(data[0]);
          console.log(`    Поля: ${fields.slice(0, 8).join(', ')}${fields.length > 8 ? '...' : ''}`);
        }
      }
    } catch (err) {
      console.log(`    ❌ Ошибка доступа: ${err.message}`);
      results.issues.push(`${tableName}: критическая ошибка - ${err.message}`);
      results.tables[tableName] = { exists: false, count: 0, sample: null };
    }
  }
  
  // Специальная проверка ключевых полей в users
  console.log('\n3.12 Проверка ключевых полей users:');
  const { data: userSample } = await supabase
    .from('users')
    .select('id, referred_by, ref_code, balance_uni, balance_ton, uni_farming_rate')
    .limit(3);
    
  if (userSample && userSample.length > 0) {
    userSample.forEach(user => {
      console.log(`    User ID ${user.id}: referred_by=${user.referred_by}, ref_code=${user.ref_code}, UNI=${user.balance_uni}, TON=${user.balance_ton}, rate=${user.uni_farming_rate}`);
    });
  }
  
  return results;
}

/**
 * Генерирует финальный отчет
 */
function generateFinalReport(depositResults, referralResults, tableResults) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 ФИНАЛЬНЫЙ ОТЧЕТ АУДИТА UNIFARM');
  console.log('='.repeat(80));
  
  console.log('\n🔧 ЭТАП 1 - ДЕПОЗИТЫ И НАЧИСЛЕНИЯ:');
  console.log(`✅ UNI Farming: ${depositResults.uniFarming.active} активных, начисления: ${depositResults.uniFarming.earning ? 'работают' : 'НЕ РАБОТАЮТ'}`);
  console.log(`✅ TON Boost: ${depositResults.tonBoost.active} активных, начисления: ${depositResults.tonBoost.earning ? 'работают' : 'НЕ РАБОТАЮТ'}`);
  console.log(`📊 Транзакции начислений: UNI ${depositResults.uniFarming.transactions}, TON ${depositResults.tonBoost.transactions}`);
  
  console.log('\n🔗 ЭТАП 2 - ПАРТНЕРСКАЯ ПРОГРАММА:');
  console.log(`✅ Реферальные цепочки: ${referralResults.referralChains} пользователей, max уровень: ${referralResults.maxLevel}`);
  console.log(`✅ Реферальные транзакции: ${referralResults.referralTransactions} записей`);
  console.log(`📊 Специализированные таблицы: referral_earnings ${referralResults.referralEarnings} записей`);
  
  console.log('\n🗄️ ЭТАП 3 - БАЗА ДАННЫХ:');
  const existingTables = Object.entries(tableResults.tables).filter(([name, data]) => data.exists);
  const missingTables = Object.entries(tableResults.tables).filter(([name, data]) => !data.exists);
  
  console.log(`✅ Доступные таблицы (${existingTables.length}):`)
  existingTables.forEach(([name, data]) => {
    console.log(`    ${name}: ${data.count} записей`);
  });
  
  if (missingTables.length > 0) {
    console.log(`❌ Недоступные таблицы (${missingTables.length}):`)
    missingTables.forEach(([name, data]) => {
      console.log(`    ${name}: недоступна`);
    });
  }
  
  console.log('\n🔍 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
  const allIssues = [...depositResults.issues, ...referralResults.issues, ...tableResults.issues];
  
  if (allIssues.length === 0) {
    console.log('✅ Критических проблем не обнаружено');
  } else {
    allIssues.forEach((issue, index) => {
      console.log(`    ${index + 1}. ${issue}`);
    });
  }
  
  console.log('\n📈 ОБЩАЯ ОЦЕНКА ГОТОВНОСТИ:');
  const depositScore = depositResults.uniFarming.earning && depositResults.tonBoost.earning ? 100 : 50;
  const referralScore = referralResults.referralTransactions > 0 ? 100 : 50;
  const dbScore = Math.round((existingTables.length / Object.keys(tableResults.tables).length) * 100);
  const overallScore = Math.round((depositScore + referralScore + dbScore) / 3);
  
  console.log(`Начисления депозитов: ${depositScore}%`);
  console.log(`Партнерская программа: ${referralScore}%`);
  console.log(`База данных: ${dbScore}%`);
  console.log(`Общая готовность: ${overallScore}%`);
  
  if (overallScore >= 90) {
    console.log('🟢 СИСТЕМА ГОТОВА К PRODUCTION');
  } else if (overallScore >= 70) {
    console.log('🟡 СИСТЕМА ТРЕБУЕТ МИНОРНЫХ ДОРАБОТОК');
  } else {
    console.log('🔴 СИСТЕМА ТРЕБУЕТ СЕРЬЕЗНЫХ ИСПРАВЛЕНИЙ');
  }
  
  console.log('='.repeat(80));
}

/**
 * Основная функция аудита
 */
async function runFinalAudit() {
  try {
    console.log('ФИНАЛЬНЫЙ АУДИТ UNIFARM - НАЧИСЛЕНИЯ И БАЗА ДАННЫХ');
    console.log('Дата: ' + new Date().toLocaleString('ru-RU'));
    console.log('='.repeat(80));
    
    // Выполняем все этапы аудита
    const depositResults = await auditDepositEarnings();
    const referralResults = await auditReferralEarnings();
    const tableResults = await auditSupabaseTables();
    
    // Генерируем финальный отчет
    generateFinalReport(depositResults, referralResults, tableResults);
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА АУДИТА:', error.message);
    console.error(error.stack);
  }
}

// Запуск финального аудита
runFinalAudit();