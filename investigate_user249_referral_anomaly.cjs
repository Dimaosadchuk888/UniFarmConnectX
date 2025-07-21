const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function investigateUser249() {
  console.log('=== РАССЛЕДОВАНИЕ ПОДОЗРИТЕЛЬНОЙ РЕФЕРАЛЬНОЙ АКТИВНОСТИ USER 249 ===\n');
  
  try {
    // 1. Информация о User 249
    console.log('🔍 1. Анализ профиля User 249...');
    const { data: user249, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 249)
      .single();
      
    if (userError) {
      console.error('❌ Ошибка получения данных User 249:', userError);
    } else {
      console.log(`👤 User 249 Profile:`);
      console.log(`   ID: ${user249.id}, Telegram ID: ${user249.telegram_id}`);
      console.log(`   Username: ${user249.username}`);
      console.log(`   UNI Balance: ${user249.balance_uni}, TON Balance: ${user249.balance_ton}`);
      console.log(`   Created: ${user249.created_at}`);
      console.log(`   Referred by: ${user249.referred_by}\n`);
    }
    
    // 2. Анализ реферальных наград от User 249
    console.log('🔍 2. Анализ всех реферальных наград от User 249...');
    const { data: referralRewards, error: rewardsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'REFERRAL_REWARD')
      .contains('metadata', { source_user_id: 249 })
      .order('created_at', { ascending: false });
      
    if (rewardsError) {
      console.error('❌ Ошибка поиска реферальных наград:', rewardsError);
    } else {
      console.log(`📊 Всего реферальных транзакций от User 249: ${referralRewards?.length || 0}`);
      
      let totalRewards = 0;
      const rewardsByLevel = {};
      const rewardsByTime = {};
      
      if (referralRewards?.length > 0) {
        referralRewards.forEach(tx => {
          totalRewards += parseFloat(tx.amount);
          const level = tx.metadata?.level || 'unknown';
          const timeKey = tx.created_at.substring(0, 16); // Группировка по минутам
          
          if (!rewardsByLevel[level]) rewardsByLevel[level] = { count: 0, total: 0 };
          if (!rewardsByTime[timeKey]) rewardsByTime[timeKey] = { count: 0, total: 0 };
          
          rewardsByLevel[level].count++;
          rewardsByLevel[level].total += parseFloat(tx.amount);
          rewardsByTime[timeKey].count++;
          rewardsByTime[timeKey].total += parseFloat(tx.amount);
        });
        
        console.log(`💰 Общая сумма реферальных наград: ${totalRewards.toFixed(2)} UNI`);
        console.log(`📈 Распределение по уровням:`);
        Object.keys(rewardsByLevel).forEach(level => {
          const data = rewardsByLevel[level];
          console.log(`   Level ${level}: ${data.count} транзакций, ${data.total.toFixed(2)} UNI`);
        });
        
        console.log(`⏰ Временные паттерны (топ-10):`);
        const topTimes = Object.entries(rewardsByTime)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 10);
        topTimes.forEach(([time, data]) => {
          console.log(`   ${time}: ${data.count} транзакций, ${data.total.toFixed(2)} UNI`);
        });
      }
    }
    
    // 3. Анализ farming деятельности User 249
    console.log('\n🔍 3. Анализ farming активности User 249...');
    const { data: farmingTx, error: farmingError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 249)
      .in('type', ['FARMING_REWARD', 'FARMING_DEPOSIT'])
      .order('created_at', { ascending: false });
      
    if (farmingError) {
      console.error('❌ Ошибка поиска farming транзакций:', farmingError);
    } else {
      console.log(`🌾 Farming транзакций User 249: ${farmingTx?.length || 0}`);
      
      let farmingIncome = 0;
      let farmingDeposits = 0;
      
      if (farmingTx?.length > 0) {
        farmingTx.forEach(tx => {
          if (tx.type === 'FARMING_REWARD') {
            farmingIncome += parseFloat(tx.amount);
          } else if (tx.type === 'FARMING_DEPOSIT') {
            farmingDeposits += parseFloat(tx.amount);
          }
        });
        
        console.log(`📈 Общий доход farming: ${farmingIncome.toFixed(2)} UNI`);
        console.log(`📉 Общие депозиты: ${farmingDeposits.toFixed(2)} UNI`);
        console.log(`⚖️ Соотношение доход/депозит: ${(farmingIncome / farmingDeposits || 0).toFixed(4)}`);
        
        // Показать последние 5 транзакций
        console.log(`📋 Последние 5 farming транзакций:`);
        farmingTx.slice(0, 5).forEach(tx => {
          console.log(`   ${tx.created_at}: ${tx.type} ${tx.amount} ${tx.currency}`);
        });
      }
    }
    
    // 4. Проверка реферальной цепочки User 249
    console.log('\n🔍 4. Анализ реферальной цепочки User 249...');
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referring_user_id', 249);
      
    if (referralsError) {
      console.error('❌ Ошибка поиска рефералов:', referralsError);
    } else {
      console.log(`👥 Прямых рефералов User 249: ${referrals?.length || 0}`);
      if (referrals?.length > 0) {
        console.log(`📋 Список рефералов:`);
        referrals.forEach(ref => {
          console.log(`   User ${ref.referred_user_id} referred at ${ref.created_at}`);
        });
      }
    }
    
    // 5. Статистика по времени активности
    console.log('\n🔍 5. Временной анализ активности User 249...');
    const { data: allTx, error: allTxError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 249)
      .order('created_at', { ascending: false });
      
    if (allTxError) {
      console.error('❌ Ошибка поиска всех транзакций:', allTxError);
    } else {
      console.log(`📊 Всего транзакций User 249: ${allTx?.length || 0}`);
      
      if (allTx?.length > 0) {
        const firstTx = allTx[allTx.length - 1];
        const lastTx = allTx[0];
        console.log(`📅 Первая транзакция: ${firstTx.created_at}`);
        console.log(`📅 Последняя транзакция: ${lastTx.created_at}`);
        
        // Группировка по дням
        const txByDay = {};
        allTx.forEach(tx => {
          const day = tx.created_at.substring(0, 10);
          if (!txByDay[day]) txByDay[day] = 0;
          txByDay[day]++;
        });
        
        console.log(`📈 Активность по дням:`);
        Object.entries(txByDay)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([day, count]) => {
            console.log(`   ${day}: ${count} транзакций`);
          });
      }
    }
    
    console.log('\n=== РАССЛЕДОВАНИЕ USER 249 ЗАВЕРШЕНО ===');
    
  } catch (error) {
    console.error('💥 Критическая ошибка расследования User 249:', error);
  }
}

investigateUser249();