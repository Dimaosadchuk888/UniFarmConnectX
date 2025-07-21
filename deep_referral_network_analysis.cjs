const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function deepReferralNetworkAnalysis() {
  console.log('=== ГЛУБОКИЙ АНАЛИЗ РЕФЕРАЛЬНОЙ СЕТИ ===\n');
  
  try {
    // 1. Анализ User 249 и связанных аккаунтов
    console.log('🔍 1. Детальный анализ сети User 249...');
    
    // Найти всех пользователей в цепочке User 249
    const { data: user249Chain, error: chainError } = await supabase
      .from('users')
      .select('id, telegram_id, username, created_at, referred_by, balance_uni, balance_ton')
      .or('id.eq.249,referred_by.eq.249,referred_by.eq.248')
      .order('created_at', { ascending: false });
      
    if (chainError) {
      console.error('❌ Ошибка анализа цепочки:', chainError);
    } else {
      console.log(`📊 Пользователей в сети User 249: ${user249Chain?.length || 0}`);
      
      const networkStats = {
        user249: null,
        directReferrals: [],
        uplineUsers: [],
        totalNetworkBalance: { uni: 0, ton: 0 }
      };
      
      user249Chain?.forEach(user => {
        networkStats.totalNetworkBalance.uni += parseFloat(user.balance_uni || 0);
        networkStats.totalNetworkBalance.ton += parseFloat(user.balance_ton || 0);
        
        if (user.id === 249) {
          networkStats.user249 = user;
        } else if (user.referred_by === 249) {
          networkStats.directReferrals.push(user);
        } else if (user.id === 248) {
          networkStats.uplineUsers.push(user);
        }
      });
      
      console.log(`👤 User 249 профиль:`);
      if (networkStats.user249) {
        const u = networkStats.user249;
        console.log(`   ID: ${u.id}, Telegram: ${u.telegram_id}, Username: ${u.username}`);
        console.log(`   Balance: ${u.balance_uni} UNI, ${u.balance_ton} TON`);
        console.log(`   Created: ${u.created_at}, Referred by: ${u.referred_by}`);
      }
      
      console.log(`👥 Прямые рефералы User 249: ${networkStats.directReferrals.length}`);
      networkStats.directReferrals.forEach(user => {
        console.log(`   User ${user.id}: ${user.username}, Balance: ${user.balance_uni} UNI`);
      });
      
      console.log(`🔗 Upline пользователи:`);
      networkStats.uplineUsers.forEach(user => {
        console.log(`   User ${user.id}: ${user.username}, Balance: ${user.balance_uni} UNI`);
      });
      
      console.log(`💰 Общий баланс сети: ${networkStats.totalNetworkBalance.uni.toFixed(2)} UNI, ${networkStats.totalNetworkBalance.ton.toFixed(6)} TON`);
    }
    
    // 2. Анализ User 258 (новая аномалия)
    console.log('\n🔍 2. Анализ User 258 (112 реферальных транзакций)...');
    
    const { data: user258Profile, error: user258Error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 258)
      .single();
      
    if (user258Error) {
      console.error('❌ Ошибка получения данных User 258:', user258Error);
    } else {
      console.log(`👤 User 258 профиль:`);
      console.log(`   ID: ${user258Profile.id}, Telegram: ${user258Profile.telegram_id}`);
      console.log(`   Username: ${user258Profile.username}`);
      console.log(`   Balance: ${user258Profile.balance_uni} UNI, ${user258Profile.balance_ton} TON`);
      console.log(`   Created: ${user258Profile.created_at}`);
      console.log(`   Referred by: ${user258Profile.referred_by}`);
    }
    
    // Анализ транзакций User 258
    const { data: user258Tx, error: tx258Error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 258)
      .order('created_at', { ascending: false });
      
    if (tx258Error) {
      console.error('❌ Ошибка получения транзакций User 258:', tx258Error);
    } else {
      console.log(`📊 Всего транзакций User 258: ${user258Tx?.length || 0}`);
      
      const tx258Stats = {
        total: user258Tx?.length || 0,
        byType: {},
        totalIncome: 0,
        firstTx: null,
        lastTx: null
      };
      
      if (user258Tx?.length > 0) {
        tx258Stats.firstTx = user258Tx[user258Tx.length - 1];
        tx258Stats.lastTx = user258Tx[0];
        
        user258Tx.forEach(tx => {
          tx258Stats.byType[tx.type] = (tx258Stats.byType[tx.type] || 0) + 1;
          if (tx.type !== 'FARMING_DEPOSIT') {
            tx258Stats.totalIncome += parseFloat(tx.amount);
          }
        });
        
        console.log(`💰 Общий доход: ${tx258Stats.totalIncome.toFixed(2)} UNI`);
        console.log(`📈 По типам:`);
        Object.entries(tx258Stats.byType).forEach(([type, count]) => {
          console.log(`   ${type}: ${count} транзакций`);
        });
        console.log(`📅 Период активности: ${tx258Stats.firstTx.created_at} - ${tx258Stats.lastTx.created_at}`);
      }
    }
    
    // 3. Поиск других подозрительных паттернов
    console.log('\n🔍 3. Поиск связанных подозрительных аккаунтов...');
    
    // Поиск пользователей с аномально высокими балансами UNI
    const { data: highBalanceUsers, error: balanceError } = await supabase
      .from('users')
      .select('id, telegram_id, username, balance_uni, balance_ton, created_at, referred_by')
      .gt('balance_uni', 1000)
      .order('balance_uni', { ascending: false });
      
    if (balanceError) {
      console.error('❌ Ошибка поиска пользователей с высокими балансами:', balanceError);
    } else {
      console.log(`💰 Пользователей с балансом >1000 UNI: ${highBalanceUsers?.length || 0}`);
      
      if (highBalanceUsers?.length > 0) {
        console.log(`📋 Топ-10 по балансу UNI:`);
        highBalanceUsers.slice(0, 10).forEach(user => {
          console.log(`   User ${user.id}: ${parseFloat(user.balance_uni).toFixed(2)} UNI, ${user.username}, Created: ${user.created_at}`);
        });
      }
    }
    
    // 4. Анализ farming депозитов vs наград
    console.log('\n🔍 4. Анализ соотношения депозитов и наград...');
    
    const { data: farmingAnalysis, error: farmingAnalysisError } = await supabase
      .from('transactions')
      .select('user_id, type, amount')
      .in('type', ['FARMING_DEPOSIT', 'FARMING_REWARD'])
      .gte('created_at', '2025-07-20T00:00:00');
      
    if (farmingAnalysisError) {
      console.error('❌ Ошибка анализа farming:', farmingAnalysisError);
    } else {
      const farmingRatios = {};
      
      farmingAnalysis?.forEach(tx => {
        if (!farmingRatios[tx.user_id]) {
          farmingRatios[tx.user_id] = { deposits: 0, rewards: 0, ratio: 0 };
        }
        
        if (tx.type === 'FARMING_DEPOSIT') {
          farmingRatios[tx.user_id].deposits += parseFloat(tx.amount);
        } else {
          farmingRatios[tx.user_id].rewards += parseFloat(tx.amount);
        }
      });
      
      // Рассчитать соотношения и найти аномалии
      const anomalousRatios = [];
      Object.entries(farmingRatios).forEach(([userId, data]) => {
        if (data.deposits > 0) {
          data.ratio = data.rewards / data.deposits;
          // Аномалия: награды превышают депозиты в 2+ раза за 2 дня
          if (data.ratio > 2.0 && data.rewards > 100) {
            anomalousRatios.push({
              userId: parseInt(userId),
              ...data
            });
          }
        }
      });
      
      console.log(`⚠️ Пользователи с аномальным соотношением наград/депозитов (>2.0):`);
      anomalousRatios
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 10)
        .forEach(user => {
          console.log(`   User ${user.userId}: Ratio ${user.ratio.toFixed(2)}, Rewards: ${user.rewards.toFixed(2)}, Deposits: ${user.deposits.toFixed(2)}`);
        });
    }
    
    // 5. Анализ времени создания подозрительных аккаунтов
    console.log('\n🔍 5. Временной анализ создания подозрительных аккаунтов...');
    
    const suspiciousUserIds = [249, 258, 248]; // User 249, новый User 258, и upline User 248
    const { data: suspiciousUsers, error: suspiciousError } = await supabase
      .from('users')
      .select('id, telegram_id, username, created_at, referred_by')
      .in('id', suspiciousUserIds)
      .order('created_at', { ascending: true });
      
    if (suspiciousError) {
      console.error('❌ Ошибка анализа подозрительных пользователей:', suspiciousError);
    } else {
      console.log(`📊 Анализ времени создания подозрительных аккаунтов:`);
      suspiciousUsers?.forEach(user => {
        console.log(`   User ${user.id}: Created ${user.created_at}, Referred by: ${user.referred_by || 'none'}`);
      });
      
      // Поиск пользователей, созданных в тот же период
      if (suspiciousUsers?.length > 0) {
        const timeWindow = suspiciousUsers[0].created_at.substring(0, 10); // День
        const { data: sameTimeUsers, error: sameTimeError } = await supabase
          .from('users')
          .select('id, telegram_id, username, created_at, referred_by')
          .gte('created_at', `${timeWindow}T00:00:00`)
          .lt('created_at', `${timeWindow}T23:59:59`)
          .order('created_at', { ascending: true });
          
        if (!sameTimeError && sameTimeUsers?.length > 0) {
          console.log(`📅 Пользователи, созданные ${timeWindow} (всего ${sameTimeUsers.length}):`);
          sameTimeUsers.forEach(user => {
            console.log(`   User ${user.id}: ${user.username}, ${user.created_at}, Ref: ${user.referred_by || 'none'}`);
          });
        }
      }
    }
    
    console.log('\n=== АНАЛИЗ РЕФЕРАЛЬНОЙ СЕТИ ЗАВЕРШЕН ===');
    
  } catch (error) {
    console.error('💥 Критическая ошибка анализа сети:', error);
  }
}

deepReferralNetworkAnalysis();