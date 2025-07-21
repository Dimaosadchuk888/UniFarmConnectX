const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function schedulerTimingAnalysis() {
  console.log('=== АНАЛИЗ ВРЕМЕНИ ПЛАНИРОВЩИКОВ И ТРАНЗАКЦИЙ ===\n');
  
  try {
    // 1. Анализ точного времени транзакций User 249
    console.log('🔍 1. Детальный анализ времени транзакций User 249...');
    
    const { data: user249Transactions, error: tx249Error } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, created_at, metadata')
      .eq('user_id', 249)
      .order('created_at', { ascending: true })
      .limit(100);
      
    if (tx249Error) {
      console.error('❌ Ошибка получения транзакций User 249:', tx249Error);
    } else {
      console.log(`📊 Первые 100 транзакций User 249: ${user249Transactions?.length || 0}`);
      
      const timingAnalysis = {
        intervals: [],
        patterns: {},
        averageInterval: 0,
        totalTimeSpan: 0
      };
      
      if (user249Transactions?.length > 1) {
        for (let i = 1; i < user249Transactions.length; i++) {
          const prev = new Date(user249Transactions[i-1].created_at);
          const curr = new Date(user249Transactions[i].created_at);
          const intervalMinutes = (curr - prev) / (1000 * 60);
          
          timingAnalysis.intervals.push({
            txId: user249Transactions[i].id,
            intervalMinutes: intervalMinutes.toFixed(2),
            timestamp: user249Transactions[i].created_at
          });
          
          // Группировка по интервалам
          const roundedInterval = Math.round(intervalMinutes);
          timingAnalysis.patterns[roundedInterval] = (timingAnalysis.patterns[roundedInterval] || 0) + 1;
        }
        
        // Расчет среднего интервала
        const totalIntervals = timingAnalysis.intervals.reduce((sum, item) => sum + parseFloat(item.intervalMinutes), 0);
        timingAnalysis.averageInterval = (totalIntervals / timingAnalysis.intervals.length).toFixed(2);
        
        // Общий временной диапазон
        const firstTx = new Date(user249Transactions[0].created_at);
        const lastTx = new Date(user249Transactions[user249Transactions.length - 1].created_at);
        timingAnalysis.totalTimeSpan = ((lastTx - firstTx) / (1000 * 60)).toFixed(2);
        
        console.log(`⏱️ Средний интервал между транзакциями: ${timingAnalysis.averageInterval} минут`);
        console.log(`📅 Общий временной диапазон: ${timingAnalysis.totalTimeSpan} минут`);
        console.log(`📈 Распределение интервалов:`);
        Object.entries(timingAnalysis.patterns)
          .sort((a, b) => parseInt(b[1]) - parseInt(a[1]))
          .slice(0, 10)
          .forEach(([interval, count]) => {
            console.log(`   ${interval} минут: ${count} случаев`);
          });
          
        console.log(`🔍 Первые 20 интервалов:`);
        timingAnalysis.intervals.slice(0, 20).forEach(item => {
          console.log(`   TX ${item.txId}: +${item.intervalMinutes} мин (${item.timestamp})`);
        });
      }
    }
    
    // 2. Анализ всех FARMING_REWARD транзакций за последние 24 часа
    console.log('\n🔍 2. Анализ времени всех FARMING_REWARD транзакций...');
    
    const { data: allFarmingRewards, error: farmingError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, created_at, currency')
      .eq('type', 'FARMING_REWARD')
      .gte('created_at', '2025-07-20T00:00:00')
      .order('created_at', { ascending: true });
      
    if (farmingError) {
      console.error('❌ Ошибка получения FARMING_REWARD транзакций:', farmingError);
    } else {
      console.log(`📊 Всего FARMING_REWARD транзакций за сутки: ${allFarmingRewards?.length || 0}`);
      
      // Группировка по пользователям и анализ времени
      const userFarmingPatterns = {};
      
      allFarmingRewards?.forEach(tx => {
        if (!userFarmingPatterns[tx.user_id]) {
          userFarmingPatterns[tx.user_id] = {
            count: 0,
            timestamps: [],
            currency: tx.currency,
            intervals: []
          };
        }
        
        userFarmingPatterns[tx.user_id].count++;
        userFarmingPatterns[tx.user_id].timestamps.push(tx.created_at);
      });
      
      // Расчет интервалов для каждого пользователя
      Object.entries(userFarmingPatterns).forEach(([userId, data]) => {
        if (data.timestamps.length > 1) {
          for (let i = 1; i < data.timestamps.length; i++) {
            const prev = new Date(data.timestamps[i-1]);
            const curr = new Date(data.timestamps[i]);
            const intervalMinutes = (curr - prev) / (1000 * 60);
            data.intervals.push(intervalMinutes);
          }
        }
      });
      
      console.log(`👥 Пользователей с FARMING_REWARD: ${Object.keys(userFarmingPatterns).length}`);
      console.log(`📈 Топ-10 по количеству транзакций:`);
      
      Object.entries(userFarmingPatterns)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .forEach(([userId, data]) => {
          const avgInterval = data.intervals.length > 0 
            ? (data.intervals.reduce((sum, val) => sum + val, 0) / data.intervals.length).toFixed(2)
            : 'N/A';
          console.log(`   User ${userId}: ${data.count} транзакций, средний интервал: ${avgInterval} мин (${data.currency})`);
        });
    }
    
    // 3. Анализ REFERRAL_REWARD транзакций
    console.log('\n🔍 3. Анализ времени REFERRAL_REWARD транзакций...');
    
    const { data: referralRewards, error: refRewardError } = await supabase
      .from('transactions')
      .select('id, user_id, type, amount, created_at, metadata')
      .eq('type', 'REFERRAL_REWARD')
      .gte('created_at', '2025-07-20T00:00:00')
      .order('created_at', { ascending: true });
      
    if (refRewardError) {
      console.error('❌ Ошибка получения REFERRAL_REWARD транзакций:', refRewardError);
    } else {
      console.log(`📊 Всего REFERRAL_REWARD транзакций за сутки: ${referralRewards?.length || 0}`);
      
      // Анализ источников реферальных наград
      const referralSources = {};
      const referralTiming = {};
      
      referralRewards?.forEach(tx => {
        const sourceUserId = tx.metadata?.source_user_id;
        if (sourceUserId) {
          if (!referralSources[sourceUserId]) {
            referralSources[sourceUserId] = { count: 0, beneficiaries: new Set(), timestamps: [] };
          }
          referralSources[sourceUserId].count++;
          referralSources[sourceUserId].beneficiaries.add(tx.user_id);
          referralSources[sourceUserId].timestamps.push(tx.created_at);
        }
      });
      
      console.log(`👥 Источников реферальных наград: ${Object.keys(referralSources).length}`);
      console.log(`📈 Топ-5 источников по активности:`);
      
      Object.entries(referralSources)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .forEach(([sourceId, data]) => {
          // Расчет среднего интервала между реферальными наградами
          let avgInterval = 'N/A';
          if (data.timestamps.length > 1) {
            const intervals = [];
            for (let i = 1; i < data.timestamps.length; i++) {
              const prev = new Date(data.timestamps[i-1]);
              const curr = new Date(data.timestamps[i]);
              const intervalMinutes = (curr - prev) / (1000 * 60);
              intervals.push(intervalMinutes);
            }
            avgInterval = (intervals.reduce((sum, val) => sum + val, 0) / intervals.length).toFixed(2);
          }
          
          console.log(`   User ${sourceId}: ${data.count} наград → ${data.beneficiaries.size} получателей, интервал: ${avgInterval} мин`);
        });
    }
    
    // 4. Поиск синхронности между FARMING и REFERRAL транзакциями
    console.log('\n🔍 4. Анализ синхронности FARMING и REFERRAL транзакций...');
    
    // Группировка всех транзакций по временным окнам (1 минута)
    const timeWindows = {};
    
    [...(allFarmingRewards || []), ...(referralRewards || [])].forEach(tx => {
      const timestamp = new Date(tx.created_at);
      const timeWindow = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`;
      
      if (!timeWindows[timeWindow]) {
        timeWindows[timeWindow] = { farming: 0, referral: 0, total: 0 };
      }
      
      if (tx.type === 'FARMING_REWARD') {
        timeWindows[timeWindow].farming++;
      } else {
        timeWindows[timeWindow].referral++;
      }
      timeWindows[timeWindow].total++;
    });
    
    // Поиск окон с высокой активностью
    const highActivityWindows = Object.entries(timeWindows)
      .filter(([window, data]) => data.total > 50)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);
      
    console.log(`⚡ Временные окна с высокой активностью (>50 транзакций):`);
    highActivityWindows.forEach(([window, data]) => {
      console.log(`   ${window}: ${data.total} транзакций (Farming: ${data.farming}, Referral: ${data.referral})`);
    });
    
    // 5. Анализ metadata планировщиков
    console.log('\n🔍 5. Анализ metadata планировщиков...');
    
    const { data: schedulerMetadata, error: metaError } = await supabase
      .from('transactions')
      .select('id, user_id, type, created_at, metadata')
      .not('metadata', 'is', null)
      .gte('created_at', '2025-07-20T00:00:00')
      .limit(100);
      
    if (metaError) {
      console.error('❌ Ошибка получения metadata планировщиков:', metaError);
    } else {
      const schedulerSources = {};
      
      schedulerMetadata?.forEach(tx => {
        if (tx.metadata?.transaction_source) {
          const source = tx.metadata.transaction_source;
          if (!schedulerSources[source]) {
            schedulerSources[source] = { count: 0, users: new Set() };
          }
          schedulerSources[source].count++;
          schedulerSources[source].users.add(tx.user_id);
        }
      });
      
      console.log(`🤖 Обнаруженные источники планировщиков:`);
      Object.entries(schedulerSources).forEach(([source, data]) => {
        console.log(`   ${source}: ${data.count} транзакций, ${data.users.size} пользователей`);
      });
    }
    
    console.log('\n=== АНАЛИЗ ВРЕМЕНИ ПЛАНИРОВЩИКОВ ЗАВЕРШЕН ===');
    
  } catch (error) {
    console.error('💥 Критическая ошибка анализа времени:', error);
  }
}

schedulerTimingAnalysis();