const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function comprehensiveSystemAudit() {
  console.log('=== КОМПЛЕКСНЫЙ АУДИТ СИСТЕМЫ (READ-ONLY) ===\n');
  
  const auditResults = {
    tonTransactions: {},
    referralAnomalies: {},
    systemHealth: {},
    userPatterns: {},
    timelineAnalysis: {}
  };
  
  try {
    // 1. Глубокий анализ TON транзакций за последние 7 дней
    console.log('🔍 1. Анализ всех TON транзакций за последние 7 дней...');
    const { data: allTonTx, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .eq('currency', 'TON')
      .gte('created_at', '2025-07-14T00:00:00')
      .order('created_at', { ascending: false });
      
    if (tonError) {
      console.error('❌ Ошибка получения TON транзакций:', tonError);
    } else {
      console.log(`📊 Всего TON транзакций за неделю: ${allTonTx?.length || 0}`);
      
      const tonStats = {
        total: allTonTx?.length || 0,
        byType: {},
        byUser: {},
        totalVolume: 0,
        suspiciousPatterns: []
      };
      
      allTonTx?.forEach(tx => {
        tonStats.totalVolume += parseFloat(tx.amount);
        tonStats.byType[tx.type] = (tonStats.byType[tx.type] || 0) + 1;
        tonStats.byUser[tx.user_id] = (tonStats.byUser[tx.user_id] || 0) + 1;
        
        // Проверка на подозрительные паттерны
        if (parseFloat(tx.amount) > 10) {
          tonStats.suspiciousPatterns.push({
            id: tx.id,
            user_id: tx.user_id,
            amount: tx.amount,
            type: tx.type,
            created_at: tx.created_at
          });
        }
      });
      
      console.log(`💰 Общий объем TON: ${tonStats.totalVolume.toFixed(6)}`);
      console.log(`📈 По типам транзакций:`);
      Object.entries(tonStats.byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} транзакций`);
      });
      
      console.log(`👤 Топ-5 пользователей по активности:`);
      Object.entries(tonStats.byUser)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([userId, count]) => {
          console.log(`   User ${userId}: ${count} транзакций`);
        });
        
      if (tonStats.suspiciousPatterns.length > 0) {
        console.log(`⚠️ Подозрительные TON транзакции (>10 TON):`);
        tonStats.suspiciousPatterns.forEach(tx => {
          console.log(`   User ${tx.user_id}: ${tx.amount} TON, ${tx.type}, ${tx.created_at}`);
        });
      }
      
      auditResults.tonTransactions = tonStats;
    }
    
    // 2. Анализ реферальной системы - поиск других аномалий
    console.log('\n🔍 2. Поиск других реферальных аномалий...');
    const { data: referralTx, error: refError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .gte('created_at', '2025-07-20T00:00:00')
      .order('created_at', { ascending: false });
      
    if (refError) {
      console.error('❌ Ошибка получения реферальных транзакций:', refError);
    } else {
      console.log(`📊 Всего реферальных транзакций за 2 дня: ${referralTx?.length || 0}`);
      
      const refStats = {
        total: referralTx?.length || 0,
        bySourceUser: {},
        totalRewards: 0,
        anomalousUsers: []
      };
      
      referralTx?.forEach(tx => {
        refStats.totalRewards += parseFloat(tx.amount);
        const sourceUserId = tx.metadata?.source_user_id;
        if (sourceUserId) {
          if (!refStats.bySourceUser[sourceUserId]) {
            refStats.bySourceUser[sourceUserId] = { count: 0, total: 0 };
          }
          refStats.bySourceUser[sourceUserId].count++;
          refStats.bySourceUser[sourceUserId].total += parseFloat(tx.amount);
        }
      });
      
      // Найти аномальных пользователей (>100 реферальных транзакций)
      Object.entries(refStats.bySourceUser).forEach(([userId, data]) => {
        if (data.count > 100) {
          refStats.anomalousUsers.push({
            userId: parseInt(userId),
            count: data.count,
            total: data.total.toFixed(2)
          });
        }
      });
      
      console.log(`💰 Общие реферальные выплаты: ${refStats.totalRewards.toFixed(2)} UNI`);
      console.log(`🚨 Аномальные пользователи (>100 реферальных транзакций):`);
      refStats.anomalousUsers.forEach(user => {
        console.log(`   User ${user.userId}: ${user.count} транзакций, ${user.total} UNI`);
      });
      
      auditResults.referralAnomalies = refStats;
    }
    
    // 3. Анализ паттернов создания пользователей
    console.log('\n🔍 3. Анализ паттернов регистрации пользователей...');
    const { data: recentUsers, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, username, created_at, referred_by')
      .gte('created_at', '2025-07-19T00:00:00')
      .order('created_at', { ascending: false });
      
    if (usersError) {
      console.error('❌ Ошибка получения данных пользователей:', usersError);
    } else {
      console.log(`📊 Новых пользователей за 3 дня: ${recentUsers?.length || 0}`);
      
      const userStats = {
        total: recentUsers?.length || 0,
        withReferrals: 0,
        byReferrer: {},
        suspiciousPatterns: []
      };
      
      recentUsers?.forEach(user => {
        if (user.referred_by) {
          userStats.withReferrals++;
          userStats.byReferrer[user.referred_by] = (userStats.byReferrer[user.referred_by] || 0) + 1;
        }
        
        // Проверка на подозрительные паттерны в именах
        if (user.username && user.username.includes('test_user_')) {
          userStats.suspiciousPatterns.push({
            id: user.id,
            telegram_id: user.telegram_id,
            username: user.username,
            created_at: user.created_at
          });
        }
      });
      
      console.log(`👥 Пользователей с рефералами: ${userStats.withReferrals}/${userStats.total}`);
      console.log(`📈 Топ-5 рефереров:`);
      Object.entries(userStats.byReferrer)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([referrerId, count]) => {
          console.log(`   User ${referrerId}: ${count} рефералов`);
        });
        
      if (userStats.suspiciousPatterns.length > 0) {
        console.log(`⚠️ Подозрительные аккаунты (test_user_*):`);
        userStats.suspiciousPatterns.forEach(user => {
          console.log(`   User ${user.id}: ${user.username}, ${user.created_at}`);
        });
      }
      
      auditResults.userPatterns = userStats;
    }
    
    // 4. Анализ farming активности
    console.log('\n🔍 4. Анализ farming активности...');
    const { data: farmingTx, error: farmingError } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['FARMING_REWARD', 'FARMING_DEPOSIT'])
      .gte('created_at', '2025-07-20T00:00:00')
      .order('created_at', { ascending: false });
      
    if (farmingError) {
      console.error('❌ Ошибка получения farming транзакций:', farmingError);
    } else {
      console.log(`📊 Farming транзакций за 2 дня: ${farmingTx?.length || 0}`);
      
      const farmingStats = {
        total: farmingTx?.length || 0,
        rewards: 0,
        deposits: 0,
        byUser: {},
        anomalousRewards: []
      };
      
      farmingTx?.forEach(tx => {
        if (tx.type === 'FARMING_REWARD') {
          farmingStats.rewards += parseFloat(tx.amount);
          
          // Поиск аномально высоких наград
          if (parseFloat(tx.amount) > 100) {
            farmingStats.anomalousRewards.push({
              user_id: tx.user_id,
              amount: tx.amount,
              created_at: tx.created_at
            });
          }
        } else if (tx.type === 'FARMING_DEPOSIT') {
          farmingStats.deposits += parseFloat(tx.amount);
        }
        
        if (!farmingStats.byUser[tx.user_id]) {
          farmingStats.byUser[tx.user_id] = { rewards: 0, deposits: 0, count: 0 };
        }
        farmingStats.byUser[tx.user_id].count++;
        if (tx.type === 'FARMING_REWARD') {
          farmingStats.byUser[tx.user_id].rewards += parseFloat(tx.amount);
        } else {
          farmingStats.byUser[tx.user_id].deposits += parseFloat(tx.amount);
        }
      });
      
      console.log(`🌾 Общие награды farming: ${farmingStats.rewards.toFixed(2)} UNI`);
      console.log(`💰 Общие депозиты: ${farmingStats.deposits.toFixed(2)} UNI`);
      
      if (farmingStats.anomalousRewards.length > 0) {
        console.log(`⚠️ Аномально высокие farming награды (>100 UNI):`);
        farmingStats.anomalousRewards.slice(0, 10).forEach(tx => {
          console.log(`   User ${tx.user_id}: ${tx.amount} UNI, ${tx.created_at}`);
        });
      }
      
      auditResults.systemHealth = farmingStats;
    }
    
    // 5. Временной анализ активности
    console.log('\n🔍 5. Временной анализ активности системы...');
    const { data: allRecentTx, error: timeError } = await supabase
      .from('transactions')
      .select('created_at, type, user_id')
      .gte('created_at', '2025-07-20T00:00:00')
      .order('created_at', { ascending: false });
      
    if (timeError) {
      console.error('❌ Ошибка временного анализа:', timeError);
    } else {
      const timeStats = {
        total: allRecentTx?.length || 0,
        byHour: {},
        peakActivity: [],
        anomalousHours: []
      };
      
      allRecentTx?.forEach(tx => {
        const hour = tx.created_at.substring(0, 13); // YYYY-MM-DDTHH
        timeStats.byHour[hour] = (timeStats.byHour[hour] || 0) + 1;
      });
      
      // Найти часы с аномально высокой активностью
      Object.entries(timeStats.byHour).forEach(([hour, count]) => {
        if (count > 200) {
          timeStats.anomalousHours.push({ hour, count });
        }
      });
      
      console.log(`📊 Всего транзакций за 2 дня: ${timeStats.total}`);
      console.log(`⚠️ Часы с аномальной активностью (>200 транзакций):`);
      timeStats.anomalousHours
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .forEach(({ hour, count }) => {
          console.log(`   ${hour}: ${count} транзакций`);
        });
      
      auditResults.timelineAnalysis = timeStats;
    }
    
    // 6. Генерация итогового отчета
    console.log('\n=== ИТОГОВЫЙ АНАЛИЗ ===');
    console.log(`📋 Общая статистика:`);
    console.log(`   TON транзакций: ${auditResults.tonTransactions.total || 0}`);
    console.log(`   Реферальных транзакций: ${auditResults.referralAnomalies.total || 0}`);
    console.log(`   Новых пользователей: ${auditResults.userPatterns.total || 0}`);
    console.log(`   Farming транзакций: ${auditResults.systemHealth.total || 0}`);
    
    console.log(`\n🚨 Критические находки:`);
    console.log(`   Аномальных реферальных пользователей: ${auditResults.referralAnomalies.anomalousUsers?.length || 0}`);
    console.log(`   Подозрительных аккаунтов: ${auditResults.userPatterns.suspiciousPatterns?.length || 0}`);
    console.log(`   Часов с аномальной активностью: ${auditResults.timelineAnalysis.anomalousHours?.length || 0}`);
    
    console.log('\n=== АУДИТ ЗАВЕРШЕН ===');
    
    return auditResults;
    
  } catch (error) {
    console.error('💥 Критическая ошибка аудита:', error);
    return null;
  }
}

comprehensiveSystemAudit();