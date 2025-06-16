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
    uniFarmingActive: false,
    tonBoostActive: false,
    activeUsers: [],
    depositBreakdown: {},
    issues: []
  };
  
  try {
    // Проверяем UNI farming активность
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, balance_uni, balance_ton, uni_farming_rate, uni_farming_start_timestamp, uni_deposit_amount')
      .not('uni_farming_start_timestamp', 'is', null)
      .order('uni_farming_start_timestamp', { ascending: false });
      
    if (error) {
      results.issues.push(`Ошибка получения farming данных: ${error.message}`);
    } else {
      results.uniFarmingActive = users.length > 0;
      results.activeUsers = users;
      
      console.log(`✅ UNI Farming активность: ${users.length} пользователей`);
      
      // Анализируем депозиты по размерам
      users.forEach(user => {
        const deposit = parseFloat(user.uni_deposit_amount || '0');
        const depositRange = deposit >= 100 ? '100+' : deposit >= 50 ? '50-99' : deposit >= 10 ? '10-49' : '1-9';
        results.depositBreakdown[depositRange] = (results.depositBreakdown[depositRange] || 0) + 1;
      });
      
      console.log('Распределение депозитов:');
      Object.keys(results.depositBreakdown).forEach(range => {
        console.log(`  ${range} UNI: ${results.depositBreakdown[range]} пользователей`);
      });
      
      // Показываем топ фармеров
      const topFarmers = users.slice(0, 5);
      console.log('\nТоп UNI фармеры:');
      topFarmers.forEach(user => {
        const deposit = parseFloat(user.uni_deposit_amount || '0');
        const rate = parseFloat(user.uni_farming_rate || '0');
        const balance = parseFloat(user.balance_uni || '0');
        console.log(`  ${user.username}: ${deposit} UNI депозит, rate ${rate}, баланс ${balance.toFixed(3)}`);
      });
    }
    
    // Проверяем TON Boost активность через балансы TON
    const { data: tonUsers, error: tonError } = await supabase
      .from('users')
      .select('id, username, balance_ton')
      .gt('balance_ton', 50) // Больше начального баланса
      .order('balance_ton', { ascending: false });
      
    if (!tonError && tonUsers.length > 0) {
      results.tonBoostActive = true;
      console.log(`✅ TON Boost активность: ${tonUsers.length} пользователей с увеличенными балансами`);
      
      tonUsers.slice(0, 3).forEach(user => {
        console.log(`  ${user.username}: ${parseFloat(user.balance_ton).toFixed(6)} TON`);
      });
    } else {
      console.log('⚠️ TON Boost: начисления не обнаружены');
    }
    
  } catch (err) {
    results.issues.push(`Критическая ошибка аудита депозитов: ${err.message}`);
  }
  
  return results;
}

/**
 * ЭТАП 2 - Проверка партнерских начислений
 */
async function auditReferralEarnings() {
  console.log('\n=== ЭТАП 2: АУДИТ ПАРТНЕРСКИХ НАЧИСЛЕНИЙ ===');
  
  const results = {
    referralChains: [],
    maxDepth: 0,
    commissionVerification: {},
    totalReferralRewards: 0,
    issues: []
  };
  
  try {
    // Получаем всех пользователей с реферальными связями
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, referred_by, ref_code, balance_uni, balance_ton')
      .order('id');
      
    if (error) {
      results.issues.push(`Ошибка получения пользователей: ${error.message}`);
      return results;
    }
    
    // Строим карту пользователей
    const usersMap = {};
    users.forEach(user => {
      usersMap[user.id] = user;
    });
    
    // Анализируем реферальные цепочки
    const chainUsers = users.filter(u => u.referred_by);
    results.referralChains = chainUsers;
    
    console.log(`✅ Пользователи в реферальных цепочках: ${chainUsers.length}`);
    
    // Проверяем максимальную глубину
    for (const user of chainUsers) {
      const depth = await calculateChainDepth(user.id, usersMap);
      results.maxDepth = Math.max(results.maxDepth, depth);
    }
    
    console.log(`✅ Максимальная глубина цепочки: ${results.maxDepth} уровней`);
    
    // Анализируем реферальные транзакции
    const { data: referralTx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false });
      
    if (!txError && referralTx) {
      results.totalReferralRewards = referralTx.length;
      
      console.log(`✅ Реферальные транзакции: ${referralTx.length} начислений`);
      
      // Анализируем комиссии по уровням
      referralTx.forEach(tx => {
        const description = tx.description || '';
        const levelMatch = description.match(/L(\d+)/);
        const percentMatch = description.match(/\((\d+)%\)/);
        
        if (levelMatch && percentMatch) {
          const level = parseInt(levelMatch[1]);
          const percent = parseInt(percentMatch[1]);
          
          if (!results.commissionVerification[level]) {
            results.commissionVerification[level] = [];
          }
          results.commissionVerification[level].push(percent);
        }
      });
      
      console.log('\nВерификация комиссий по уровням:');
      Object.keys(results.commissionVerification).forEach(level => {
        const percents = results.commissionVerification[level];
        const avgPercent = percents.reduce((a, b) => a + b, 0) / percents.length;
        const expectedPercent = level === '1' ? 100 : parseInt(level);
        const isCorrect = Math.abs(avgPercent - expectedPercent) < 0.1;
        
        console.log(`  Level ${level}: ${avgPercent.toFixed(1)}% ${isCorrect ? '✅' : '❌'} (ожидается ${expectedPercent}%)`);
        
        if (!isCorrect) {
          results.issues.push(`Level ${level}: неправильный процент ${avgPercent}% вместо ${expectedPercent}%`);
        }
      });
      
      // Показываем последние реферальные начисления
      console.log('\nПоследние реферальные начисления:');
      referralTx.slice(0, 5).forEach(tx => {
        const amount = parseFloat(tx.amount_uni || '0');
        console.log(`  User ${tx.user_id}: +${amount.toFixed(6)} UNI - ${tx.description}`);
      });
    } else {
      results.issues.push('Реферальные транзакции не найдены');
    }
    
  } catch (err) {
    results.issues.push(`Критическая ошибка аудита рефералов: ${err.message}`);
  }
  
  return results;
}

/**
 * Рассчитывает глубину реферальной цепочки
 */
async function calculateChainDepth(userId, usersData) {
  let depth = 0;
  let currentUserId = userId;
  const visited = new Set();
  
  while (depth < 20 && !visited.has(currentUserId)) {
    visited.add(currentUserId);
    const user = usersData[currentUserId];
    
    if (!user || !user.referred_by) {
      break;
    }
    
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
    tableStatuses: {},
    totalRecords: 0,
    unusedTables: [],
    partiallyUsedTables: [],
    issues: []
  };
  
  const tablesToCheck = [
    'users',
    'transactions', 
    'farming_deposits',
    'boost_purchases',
    'referrals',
    'referral_earnings',
    'farming_sessions',
    'missions',
    'mission_progress',
    'airdrop_claims',
    'daily_bonus_history'
  ];
  
  for (const tableName of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
        
      if (error) {
        results.tableStatuses[tableName] = {
          status: '❌ недоступна',
          count: 0,
          error: error.message
        };
        results.issues.push(`${tableName}: ${error.message}`);
      } else {
        const recordCount = count || 0;
        results.totalRecords += recordCount;
        
        let status;
        if (recordCount === 0) {
          status = '❌ не используется';
          results.unusedTables.push(tableName);
        } else if (recordCount < 10) {
          status = '⚠️ частично';
          results.partiallyUsedTables.push(tableName);
        } else {
          status = '✅ активно';
        }
        
        results.tableStatuses[tableName] = {
          status: status,
          count: recordCount
        };
      }
    } catch (err) {
      results.tableStatuses[tableName] = {
        status: '❌ ошибка',
        count: 0,
        error: err.message
      };
    }
  }
  
  console.log('Статус таблиц Supabase:');
  Object.keys(results.tableStatuses).forEach(table => {
    const info = results.tableStatuses[table];
    console.log(`  ${table}: ${info.status} (${info.count} записей)`);
  });
  
  console.log(`\nОбщее количество записей: ${results.totalRecords}`);
  console.log(`Неиспользуемые таблицы: ${results.unusedTables.length}`);
  console.log(`Частично используемые: ${results.partiallyUsedTables.length}`);
  
  return results;
}

/**
 * Генерирует финальный отчет
 */
function generateFinalReport(depositResults, referralResults, tableResults) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 ФИНАЛЬНЫЙ ОТЧЕТ АУДИТА UNIFARM T68');
  console.log('='.repeat(80));
  
  console.log('\n🎯 ОБЩИЕ РЕЗУЛЬТАТЫ:');
  
  // Оценка системы
  let totalScore = 0;
  let maxScore = 30;
  
  // Депозиты и начисления (10 баллов)
  if (depositResults.uniFarmingActive) totalScore += 5;
  if (depositResults.tonBoostActive) totalScore += 3;
  if (depositResults.activeUsers.length >= 20) totalScore += 2;
  
  // Реферальная система (10 баллов)
  if (referralResults.referralChains.length >= 20) totalScore += 3;
  if (referralResults.maxDepth >= 10) totalScore += 3;
  if (referralResults.totalReferralRewards >= 15) totalScore += 2;
  if (Object.keys(referralResults.commissionVerification).length >= 3) totalScore += 2;
  
  // База данных (10 баллов)
  const activeTablesCount = Object.values(tableResults.tableStatuses)
    .filter(t => t.status.includes('✅')).length;
  totalScore += Math.min(10, activeTablesCount * 2);
  
  const percentage = Math.round((totalScore / maxScore) * 100);
  
  console.log(`\n📊 ОЦЕНКА СИСТЕМЫ: ${percentage}% (${totalScore}/${maxScore} баллов)`);
  
  console.log('\n📈 ДЕТАЛИЗАЦИЯ ПО МОДУЛЯМ:');
  
  console.log('\n1. UNI FARMING СИСТЕМА:');
  console.log(`   ${depositResults.uniFarmingActive ? '✅' : '❌'} Активных фармеров: ${depositResults.activeUsers.length}`);
  if (depositResults.activeUsers.length > 0) {
    Object.keys(depositResults.depositBreakdown).forEach(range => {
      console.log(`   ${range} UNI депозиты: ${depositResults.depositBreakdown[range]} пользователей`);
    });
  }
  
  console.log('\n2. TON BOOST СИСТЕМА:');
  console.log(`   ${depositResults.tonBoostActive ? '✅' : '❌'} TON начисления обнаружены`);
  
  console.log('\n3. ПАРТНЕРСКАЯ ПРОГРАММА:');
  console.log(`   ${referralResults.referralChains.length > 0 ? '✅' : '❌'} Пользователи в цепочках: ${referralResults.referralChains.length}`);
  console.log(`   ${referralResults.maxDepth >= 10 ? '✅' : '❌'} Максимальная глубина: ${referralResults.maxDepth} уровней`);
  console.log(`   ${referralResults.totalReferralRewards > 0 ? '✅' : '❌'} Реферальные начисления: ${referralResults.totalReferralRewards}`);
  
  if (Object.keys(referralResults.commissionVerification).length > 0) {
    console.log('   Верификация комиссий:');
    Object.keys(referralResults.commissionVerification).forEach(level => {
      const percents = referralResults.commissionVerification[level];
      const avgPercent = percents.reduce((a, b) => a + b, 0) / percents.length;
      const expected = level === '1' ? 100 : parseInt(level);
      const correct = Math.abs(avgPercent - expected) < 0.1;
      console.log(`     Level ${level}: ${avgPercent.toFixed(1)}% ${correct ? '✅' : '❌'}`);
    });
  }
  
  console.log('\n4. ТАБЛИЦЫ SUPABASE:');
  Object.keys(tableResults.tableStatuses).forEach(table => {
    const info = tableResults.tableStatuses[table];
    console.log(`   ${table}: ${info.status} (${info.count} записей)`);
  });
  
  // Сбор всех проблем
  const allIssues = [
    ...depositResults.issues,
    ...referralResults.issues,
    ...tableResults.issues
  ];
  
  if (allIssues.length > 0) {
    console.log('\n🔍 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
    allIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  console.log('\n📋 РЕЗЮМЕ:');
  if (percentage >= 85) {
    console.log('🟢 СИСТЕМА РАБОТАЕТ ОТЛИЧНО - ВСЕ ФУНКЦИИ АКТИВНЫ');
  } else if (percentage >= 70) {
    console.log('🟡 СИСТЕМА РАБОТАЕТ ХОРОШО - ТРЕБУЮТСЯ МИНОРНЫЕ УЛУЧШЕНИЯ');
  } else {
    console.log('🔴 СИСТЕМА ТРЕБУЕТ ИСПРАВЛЕНИЙ');
  }
  
  console.log(`\nОбщее количество записей в БД: ${tableResults.totalRecords}`);
  console.log(`Активные фармеры: ${depositResults.activeUsers.length}`);
  console.log(`Пользователи в реферальных цепочках: ${referralResults.referralChains.length}`);
  console.log(`Глубина партнерской сети: ${referralResults.maxDepth} уровней`);
  
  console.log('\n='.repeat(80));
}

/**
 * Основная функция аудита
 */
async function runFinalAudit() {
  try {
    console.log('ФИНАЛЬНЫЙ АУДИТ UNIFARM - T68');
    console.log(`Дата: ${new Date().toLocaleString('ru-RU')}`);
    console.log('='.repeat(80));
    
    const depositResults = await auditDepositEarnings();
    const referralResults = await auditReferralEarnings();
    const tableResults = await auditSupabaseTables();
    
    generateFinalReport(depositResults, referralResults, tableResults);
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ФИНАЛЬНОГО АУДИТА:', error.message);
  }
}

runFinalAudit();