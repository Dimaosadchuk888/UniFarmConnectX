/**
 * Comprehensive Database Audit для UniFarm
 * Полная проверка всех таблиц и бизнес-процессов
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * 1. Аудит таблицы farming_deposits
 */
async function auditFarmingDeposits() {
  console.log('=== 1. АУДИТ FARMING_DEPOSITS ===');
  
  const results = {
    tableExists: false,
    recordCount: 0,
    sampleData: null,
    issues: []
  };
  
  try {
    const { data: deposits, error } = await supabase
      .from('farming_deposits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) {
      results.issues.push(`farming_deposits недоступна: ${error.message}`);
      console.log(`❌ farming_deposits: ${error.message}`);
    } else {
      results.tableExists = true;
      results.recordCount = deposits?.length || 0;
      results.sampleData = deposits?.[0] || null;
      
      console.log(`✅ farming_deposits: ${results.recordCount} записей найдено`);
      
      if (results.recordCount > 0) {
        console.log('Последние записи:');
        deposits.forEach(deposit => {
          console.log(`  User ${deposit.user_id}: ${deposit.amount} UNI (${deposit.created_at})`);
        });
      } else {
        results.issues.push('farming_deposits пустая - депозиты не фиксируются');
      }
    }
  } catch (err) {
    results.issues.push(`Критическая ошибка farming_deposits: ${err.message}`);
    console.log(`❌ Критическая ошибка: ${err.message}`);
  }
  
  return results;
}

/**
 * 2. Аудит таблицы boost_purchases
 */
async function auditBoostPurchases() {
  console.log('\n=== 2. АУДИТ BOOST_PURCHASES ===');
  
  const results = {
    tableExists: false,
    totalRecords: 0,
    pendingCount: 0,
    confirmedCount: 0,
    sampleData: null,
    issues: []
  };
  
  try {
    // Проверяем общее количество
    const { data: allBoosts, error: allError } = await supabase
      .from('boost_purchases')
      .select('*');
      
    if (allError) {
      results.issues.push(`boost_purchases недоступна: ${allError.message}`);
      console.log(`❌ boost_purchases: ${allError.message}`);
    } else {
      results.tableExists = true;
      results.totalRecords = allBoosts?.length || 0;
      
      // Подсчитываем по статусам
      if (allBoosts) {
        results.pendingCount = allBoosts.filter(b => b.status === 'pending').length;
        results.confirmedCount = allBoosts.filter(b => b.status === 'confirmed').length;
        results.sampleData = allBoosts[0] || null;
      }
      
      console.log(`✅ boost_purchases: ${results.totalRecords} записей`);
      console.log(`  Pending: ${results.pendingCount}`);
      console.log(`  Confirmed: ${results.confirmedCount}`);
      
      if (results.totalRecords === 0) {
        results.issues.push('boost_purchases пустая - покупки Boost не фиксируются');
      }
      
      // Показываем примеры
      if (results.totalRecords > 0) {
        const recentBoosts = allBoosts.slice(0, 3);
        console.log('Последние boost покупки:');
        recentBoosts.forEach(boost => {
          console.log(`  User ${boost.user_id}: ${boost.boost_id} - ${boost.amount} TON (${boost.status})`);
        });
      }
    }
  } catch (err) {
    results.issues.push(`Критическая ошибка boost_purchases: ${err.message}`);
    console.log(`❌ Критическая ошибка: ${err.message}`);
  }
  
  return results;
}

/**
 * 3. Аудит таблицы transactions
 */
async function auditTransactions() {
  console.log('\n=== 3. АУДИТ TRANSACTIONS ===');
  
  const results = {
    tableExists: false,
    totalTransactions: 0,
    typeBreakdown: {},
    recentTransactions: [],
    issues: []
  };
  
  const expectedTypes = [
    'FARMING_REWARD',
    'TON_BOOST_INCOME', 
    'REFERRAL_REWARD',
    'BOOST_PURCHASE',
    'DAILY_BONUS',
    'MISSION_REWARD',
    'AIRDROP'
  ];
  
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      results.issues.push(`transactions недоступна: ${error.message}`);
      console.log(`❌ transactions: ${error.message}`);
    } else {
      results.tableExists = true;
      results.totalTransactions = transactions?.length || 0;
      results.recentTransactions = transactions?.slice(0, 5) || [];
      
      // Подсчитываем по типам
      if (transactions) {
        transactions.forEach(tx => {
          const type = tx.type;
          results.typeBreakdown[type] = (results.typeBreakdown[type] || 0) + 1;
        });
      }
      
      console.log(`✅ transactions: ${results.totalTransactions} записей`);
      
      // Проверяем наличие ожидаемых типов
      console.log('Распределение по типам:');
      expectedTypes.forEach(type => {
        const count = results.typeBreakdown[type] || 0;
        console.log(`  ${type}: ${count} транзакций ${count === 0 ? '❌' : '✅'}`);
        
        if (count === 0) {
          results.issues.push(`Отсутствуют транзакции типа ${type}`);
        }
      });
      
      // Показываем последние транзакции
      if (results.recentTransactions.length > 0) {
        console.log('\nПоследние транзакции:');
        results.recentTransactions.forEach(tx => {
          const amount = tx.amount_uni || tx.amount_ton || '0';
          const currency = tx.amount_uni ? 'UNI' : 'TON';
          console.log(`  User ${tx.user_id}: ${tx.type} - ${amount} ${currency}`);
        });
      }
    }
  } catch (err) {
    results.issues.push(`Критическая ошибка transactions: ${err.message}`);
    console.log(`❌ Критическая ошибка: ${err.message}`);
  }
  
  return results;
}

/**
 * 4. Аудит балансов пользователей
 */
async function auditUserBalances() {
  console.log('\n=== 4. АУДИТ USER_BALANCES ===');
  
  const results = {
    totalUsers: 0,
    usersWithUniBalance: 0,
    usersWithTonBalance: 0,
    totalUniInSystem: 0,
    totalTonInSystem: 0,
    balanceUpdatesConsistent: true,
    sampleBalances: [],
    issues: []
  };
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, balance_uni, balance_ton')
      .order('id');
      
    if (error) {
      results.issues.push(`users балансы недоступны: ${error.message}`);
      console.log(`❌ user balances: ${error.message}`);
    } else {
      results.totalUsers = users?.length || 0;
      
      users.forEach(user => {
        const uniBalance = parseFloat(user.balance_uni || '0');
        const tonBalance = parseFloat(user.balance_ton || '0');
        
        if (uniBalance > 0) results.usersWithUniBalance++;
        if (tonBalance > 0) results.usersWithTonBalance++;
        
        results.totalUniInSystem += uniBalance;
        results.totalTonInSystem += tonBalance;
      });
      
      results.sampleBalances = users.slice(0, 5);
      
      console.log(`✅ Пользователи: ${results.totalUsers} всего`);
      console.log(`  С UNI балансом: ${results.usersWithUniBalance} пользователей`);
      console.log(`  С TON балансом: ${results.usersWithTonBalance} пользователей`);
      console.log(`  Общий UNI в системе: ${results.totalUniInSystem.toFixed(6)}`);
      console.log(`  Общий TON в системе: ${results.totalTonInSystem.toFixed(6)}`);
      
      // Показываем примеры балансов
      console.log('\nПримеры балансов:');
      results.sampleBalances.forEach(user => {
        console.log(`  ${user.username}: ${parseFloat(user.balance_uni || 0).toFixed(3)} UNI, ${parseFloat(user.balance_ton || 0).toFixed(3)} TON`);
      });
      
      if (results.usersWithUniBalance === 0) {
        results.issues.push('Ни у одного пользователя нет UNI баланса');
      }
    }
  } catch (err) {
    results.issues.push(`Критическая ошибка user balances: ${err.message}`);
    console.log(`❌ Критическая ошибка: ${err.message}`);
  }
  
  return results;
}

/**
 * 5. Аудит реферальной системы
 */
async function auditReferralSystem() {
  console.log('\n=== 5. АУДИТ REFERRAL SYSTEM ===');
  
  const results = {
    referralsTableExists: false,
    earningsTableExists: false,
    usersInChains: 0,
    maxChainDepth: 0,
    referralEarnings: 0,
    chainAnalysis: [],
    issues: []
  };
  
  try {
    // Проверяем таблицу referrals
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('*');
      
    if (!refError) {
      results.referralsTableExists = true;
      console.log(`✅ referrals: ${referrals?.length || 0} записей`);
    } else {
      results.issues.push(`referrals недоступна: ${refError.message}`);
    }
    
    // Проверяем таблицу referral_earnings
    const { data: earnings, error: earnError } = await supabase
      .from('referral_earnings')
      .select('*');
      
    if (!earnError) {
      results.earningsTableExists = true;
      results.referralEarnings = earnings?.length || 0;
      console.log(`✅ referral_earnings: ${results.referralEarnings} записей`);
    } else {
      results.issues.push(`referral_earnings недоступна: ${earnError.message}`);
    }
    
    // Анализируем цепочки в users таблице
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, referred_by, ref_code')
      .not('referred_by', 'is', null);
      
    if (!usersError) {
      results.usersInChains = users?.length || 0;
      
      // Находим максимальную глубину цепочки
      if (users) {
        for (const user of users) {
          let depth = 0;
          let currentUserId = user.id;
          const visited = new Set();
          
          while (depth < 20 && !visited.has(currentUserId)) {
            visited.add(currentUserId);
            const referrer = users.find(u => u.id === currentUserId);
            if (!referrer || !referrer.referred_by) break;
            
            depth++;
            currentUserId = referrer.referred_by;
          }
          
          results.maxChainDepth = Math.max(results.maxChainDepth, depth);
        }
        
        results.chainAnalysis = users.slice(0, 5);
      }
      
      console.log(`✅ Пользователи в реферальных цепочках: ${results.usersInChains}`);
      console.log(`✅ Максимальная глубина цепочки: ${results.maxChainDepth} уровней`);
      
      // Показываем примеры цепочек
      if (results.chainAnalysis.length > 0) {
        console.log('\nПримеры реферальных связей:');
        results.chainAnalysis.forEach(user => {
          console.log(`  ${user.username} (ID ${user.id}) → Referrer ID ${user.referred_by}`);
        });
      }
      
      if (results.usersInChains === 0) {
        results.issues.push('Реферальные цепочки не найдены - система не работает');
      }
    } else {
      results.issues.push(`Ошибка анализа реферальных цепочек: ${usersError.message}`);
    }
    
  } catch (err) {
    results.issues.push(`Критическая ошибка referral system: ${err.message}`);
    console.log(`❌ Критическая ошибка: ${err.message}`);
  }
  
  return results;
}

/**
 * 6. Аудит missions и airdrop системы
 */
async function auditMissionsAndAirdrops() {
  console.log('\n=== 6. АУДИТ MISSIONS & AIRDROPS ===');
  
  const results = {
    missionsTableExists: false,
    missionProgressExists: false,
    airdropClaimsExists: false,
    activeMissions: 0,
    completedMissions: 0,
    airdropClaims: 0,
    issues: []
  };
  
  try {
    // Проверяем missions
    const { data: missions, error: missionsError } = await supabase
      .from('missions')
      .select('*');
      
    if (!missionsError) {
      results.missionsTableExists = true;
      results.activeMissions = missions?.filter(m => m.status === 'active').length || 0;
      console.log(`✅ missions: ${missions?.length || 0} записей (${results.activeMissions} активных)`);
    } else {
      results.issues.push(`missions недоступна: ${missionsError.message}`);
    }
    
    // Проверяем mission_progress
    const { data: progress, error: progressError } = await supabase
      .from('mission_progress')
      .select('*');
      
    if (!progressError) {
      results.missionProgressExists = true;
      results.completedMissions = progress?.filter(p => p.status === 'completed').length || 0;
      console.log(`✅ mission_progress: ${progress?.length || 0} записей (${results.completedMissions} завершенных)`);
    } else {
      results.issues.push(`mission_progress недоступна: ${progressError.message}`);
    }
    
    // Проверяем airdrop_claims
    const { data: airdrops, error: airdropError } = await supabase
      .from('airdrop_claims')
      .select('*');
      
    if (!airdropError) {
      results.airdropClaimsExists = true;
      results.airdropClaims = airdrops?.length || 0;
      console.log(`✅ airdrop_claims: ${results.airdropClaims} записей`);
    } else {
      results.issues.push(`airdrop_claims недоступна: ${airdropError.message}`);
    }
    
    if (results.activeMissions === 0) {
      results.issues.push('Активные missions не найдены');
    }
    
  } catch (err) {
    results.issues.push(`Критическая ошибка missions/airdrops: ${err.message}`);
    console.log(`❌ Критическая ошибка: ${err.message}`);
  }
  
  return results;
}

/**
 * 7. Проверка логики по уровням
 */
async function auditLevelLogic() {
  console.log('\n=== 7. АУДИТ ЛОГИКИ ПО УРОВНЯМ ===');
  
  const results = {
    correctCommissionRates: true,
    chainDepthCorrect: true,
    recentReferralRewards: [],
    commissionAnalysis: {},
    issues: []
  };
  
  try {
    // Анализируем недавние реферальные награды
    const { data: referralTx, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!error && referralTx) {
      results.recentReferralRewards = referralTx;
      
      console.log(`✅ Реферальные транзакции: ${referralTx.length} найдено`);
      
      // Анализируем описания для проверки уровней и процентов
      referralTx.forEach(tx => {
        const description = tx.description || '';
        const levelMatch = description.match(/L(\d+)/);
        const percentMatch = description.match(/\((\d+)%\)/);
        
        if (levelMatch && percentMatch) {
          const level = parseInt(levelMatch[1]);
          const percent = parseInt(percentMatch[1]);
          
          if (!results.commissionAnalysis[level]) {
            results.commissionAnalysis[level] = [];
          }
          results.commissionAnalysis[level].push(percent);
        }
      });
      
      console.log('Анализ комиссий по уровням:');
      Object.keys(results.commissionAnalysis).forEach(level => {
        const percents = results.commissionAnalysis[level];
        const avgPercent = percents.reduce((a, b) => a + b, 0) / percents.length;
        console.log(`  Level ${level}: ${avgPercent.toFixed(1)}% (${percents.length} транзакций)`);
        
        // Проверяем правильность процентов
        const expectedPercent = level === '1' ? 100 : parseInt(level);
        if (Math.abs(avgPercent - expectedPercent) > 1) {
          results.correctCommissionRates = false;
          results.issues.push(`Level ${level}: ожидаемый ${expectedPercent}%, фактический ${avgPercent.toFixed(1)}%`);
        }
      });
      
      if (referralTx.length === 0) {
        results.issues.push('Реферальные награды не начисляются');
      }
    } else {
      results.issues.push(`Ошибка анализа реферальных наград: ${error.message}`);
    }
    
  } catch (err) {
    results.issues.push(`Критическая ошибка level logic: ${err.message}`);
    console.log(`❌ Критическая ошибка: ${err.message}`);
  }
  
  return results;
}

/**
 * Генерация финального отчета аудита
 */
function generateFinalAuditReport(auditResults) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 ФИНАЛЬНЫЙ ОТЧЕТ АУДИТА BASE ДАННЫХ UNIFARM');
  console.log('='.repeat(80));
  
  const allIssues = [];
  let totalScore = 0;
  let maxScore = 0;
  
  // Подсчитываем общий балл
  Object.keys(auditResults).forEach(key => {
    const result = auditResults[key];
    allIssues.push(...result.issues);
    
    // Простая оценка каждой области
    maxScore += 10;
    if (result.issues.length === 0) {
      totalScore += 10;
    } else if (result.issues.length <= 2) {
      totalScore += 7;
    } else {
      totalScore += 3;
    }
  });
  
  const percentage = Math.round((totalScore / maxScore) * 100);
  
  console.log(`\n🎯 ОБЩАЯ ОЦЕНКА: ${percentage}% (${totalScore}/${maxScore} баллов)`);
  
  console.log('\n📊 ДЕТАЛЬНЫЕ РЕЗУЛЬТАТЫ:');
  
  console.log('\n1. FARMING_DEPOSITS:');
  const farming = auditResults.farmingDeposits;
  console.log(`   ${farming.tableExists ? '✅' : '❌'} Таблица доступна: ${farming.recordCount} записей`);
  
  console.log('\n2. BOOST_PURCHASES:');
  const boost = auditResults.boostPurchases;
  console.log(`   ${boost.tableExists ? '✅' : '❌'} Таблица доступна: ${boost.totalRecords} записей`);
  console.log(`   Confirmed: ${boost.confirmedCount}, Pending: ${boost.pendingCount}`);
  
  console.log('\n3. TRANSACTIONS:');
  const tx = auditResults.transactions;
  console.log(`   ${tx.tableExists ? '✅' : '❌'} Таблица доступна: ${tx.totalTransactions} записей`);
  Object.keys(tx.typeBreakdown).forEach(type => {
    console.log(`   ${type}: ${tx.typeBreakdown[type]} транзакций`);
  });
  
  console.log('\n4. USER_BALANCES:');
  const balances = auditResults.userBalances;
  console.log(`   Пользователи: ${balances.totalUsers} всего`);
  console.log(`   UNI балансы: ${balances.usersWithUniBalance} пользователей`);
  console.log(`   TON балансы: ${balances.usersWithTonBalance} пользователей`);
  
  console.log('\n5. REFERRAL_SYSTEM:');
  const referral = auditResults.referralSystem;
  console.log(`   ${referral.referralsTableExists ? '✅' : '❌'} referrals таблица`);
  console.log(`   ${referral.earningsTableExists ? '✅' : '❌'} referral_earnings таблица`);
  console.log(`   Цепочки: ${referral.usersInChains} пользователей, глубина ${referral.maxChainDepth}`);
  
  console.log('\n6. MISSIONS & AIRDROPS:');
  const missions = auditResults.missionsAndAirdrops;
  console.log(`   ${missions.missionsTableExists ? '✅' : '❌'} missions: ${missions.activeMissions} активных`);
  console.log(`   ${missions.missionProgressExists ? '✅' : '❌'} mission_progress: ${missions.completedMissions} завершенных`);
  console.log(`   ${missions.airdropClaimsExists ? '✅' : '❌'} airdrop_claims: ${missions.airdropClaims} записей`);
  
  console.log('\n7. LEVEL_LOGIC:');
  const levels = auditResults.levelLogic;
  console.log(`   ${levels.correctCommissionRates ? '✅' : '❌'} Комиссионные ставки корректны`);
  console.log(`   Реферральные награды: ${levels.recentReferralRewards.length} транзакций`);
  
  if (allIssues.length > 0) {
    console.log('\n🔍 НАЙДЕННЫЕ ПРОБЛЕМЫ:');
    allIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  } else {
    console.log('\n✅ ПРОБЛЕМ НЕ НАЙДЕНО - ВСЕ СИСТЕМЫ РАБОТАЮТ КОРРЕКТНО');
  }
  
  if (percentage >= 90) {
    console.log('\n🟢 СИСТЕМА РАБОТАЕТ ОТЛИЧНО - ГОТОВА К PRODUCTION');
  } else if (percentage >= 70) {
    console.log('\n🟡 СИСТЕМА РАБОТАЕТ ХОРОШО - ТРЕБУЮТСЯ МИНОРНЫЕ УЛУЧШЕНИЯ');
  } else {
    console.log('\n🔴 СИСТЕМА ТРЕБУЕТ СЕРЬЕЗНЫХ ИСПРАВЛЕНИЙ');
  }
  
  console.log('='.repeat(80));
}

/**
 * Основная функция аудита
 */
async function runComprehensiveDatabaseAudit() {
  try {
    console.log('COMPREHENSIVE DATABASE AUDIT - UNIFARM');
    console.log(`Дата: ${new Date().toLocaleString('ru-RU')}`);
    console.log('='.repeat(80));
    
    const auditResults = {
      farmingDeposits: await auditFarmingDeposits(),
      boostPurchases: await auditBoostPurchases(),
      transactions: await auditTransactions(),
      userBalances: await auditUserBalances(),
      referralSystem: await auditReferralSystem(),
      missionsAndAirdrops: await auditMissionsAndAirdrops(),
      levelLogic: await auditLevelLogic()
    };
    
    generateFinalAuditReport(auditResults);
    
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА АУДИТА:', error.message);
  }
}

runComprehensiveDatabaseAudit();