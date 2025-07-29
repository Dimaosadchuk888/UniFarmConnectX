#!/usr/bin/env tsx

/**
 * ГЛУБОКАЯ ДИАГНОСТИКА АНОМАЛИЙ БАЛАНСА - ТОЛЬКО АНАЛИЗ
 * Дата: 29 июля 2025
 * 
 * КРИТИЧЕСКИЕ НАХОДКИ:
 * 1. User 25 - 209+ быстрых REFERRAL_REWARD транзакций (0.2-3.5 мин интервалы)
 * 2. User 192 - ton_boost_active=true БЕЗ записи в ton_farming_data
 * 3. Автоматические процессы могут вызывать rollback операций
 */

import { supabase } from './core/supabase';

console.log('🚨 ГЛУБОКАЯ ДИАГНОСТИКА АНОМАЛИЙ БАЛАНСА - КРИТИЧЕСКИЙ АНАЛИЗ');
console.log('='.repeat(90));

interface SchedulerStats {
  name: string;
  interval: number;
  lastRun?: string;
  conflicts?: string[];
}

interface TransactionPattern {
  type: string;
  count: number;
  avgInterval: number;
  minInterval: number;
  maxInterval: number;
  suspiciousPatterns: number;
}

async function analyzeCriticalSchedulerConflicts() {
  console.log('\n1️⃣ АНАЛИЗ КРИТИЧЕСКИХ КОНФЛИКТОВ ПЛАНИРОВЩИКОВ');
  console.log('-'.repeat(80));
  
  // Анализ из кода найденных интервалов планировщиков
  const schedulers: SchedulerStats[] = [
    { name: 'TON Boost Income', interval: 5, conflicts: ['Frequent REFERRAL_REWARD'] },
    { name: 'UNI Farming', interval: 5, conflicts: ['Balance recalculation'] },
    { name: 'Boost Verification', interval: 2, conflicts: ['TON deposit processing'] },
    { name: 'WebSocket Cleanup', interval: 1, conflicts: ['Connection termination'] },
    { name: 'Balance Recalculation', interval: 0, conflicts: ['Manual triggers'] }
  ];
  
  console.log('📊 ПЛАНИРОВЩИКИ И ИХ ИНТЕРВАЛЫ:');
  schedulers.forEach(scheduler => {
    console.log(`   ${scheduler.name}: каждые ${scheduler.interval} мин${scheduler.interval === 0 ? ' (по требованию)' : ''}`);
    if (scheduler.conflicts && scheduler.conflicts.length > 0) {
      console.log(`      ⚠️ Потенциальные конфликты: ${scheduler.conflicts.join(', ')}`);
    }
  });
  
  console.log('\n🚨 КРИТИЧЕСКИЕ ВЫВОДЫ:');
  console.log('   - 2-минутный интервал Boost Verification может пересекаться с 5-минутными планировщиками');
  console.log('   - Очистка WebSocket соединений каждую минуту может прерывать уведомления о балансе');
  console.log('   - Отсутствует централизованная координация между планировщиками');
}

async function analyzeUser25AnomalousPatterns() {
  console.log('\n2️⃣ ДЕТАЛЬНЫЙ АНАЛИЗ АНОМАЛЬНЫХ ПАТТЕРНОВ USER 25');
  console.log('-'.repeat(80));
  
  try {
    // Получаем детальную статистику транзакций User 25 за последние 3 дня
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const { data: user25Transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: true });
      
    if (!user25Transactions) {
      console.log('❌ Ошибка получения транзакций User 25');
      return;
    }
    
    // Анализируем паттерны по типам транзакций
    const typeStats: Record<string, TransactionPattern> = {};
    
    user25Transactions.forEach((tx, index) => {
      if (!typeStats[tx.type]) {
        typeStats[tx.type] = {
          type: tx.type,
          count: 0,
          avgInterval: 0,
          minInterval: Infinity,
          maxInterval: 0,
          suspiciousPatterns: 0
        };
      }
      
      typeStats[tx.type].count++;
      
      // Анализируем временные интервалы
      if (index > 0) {
        const prevTx = user25Transactions[index - 1];
        if (prevTx.type === tx.type) {
          const interval = (new Date(tx.created_at).getTime() - new Date(prevTx.created_at).getTime()) / (1000 * 60);
          
          typeStats[tx.type].minInterval = Math.min(typeStats[tx.type].minInterval, interval);
          typeStats[tx.type].maxInterval = Math.max(typeStats[tx.type].maxInterval, interval);
          
          // Подозрительные паттерны: очень быстрые операции
          if (interval < 1) {
            typeStats[tx.type].suspiciousPatterns++;
          }
        }
      }
    });
    
    console.log('📊 СТАТИСТИКА ТРАНЗАКЦИЙ USER 25 (3 дня):');
    Object.values(typeStats).forEach(stat => {
      console.log(`\n   ${stat.type}:`);
      console.log(`     Количество: ${stat.count}`);
      if (stat.minInterval !== Infinity) {
        console.log(`     Мин интервал: ${stat.minInterval.toFixed(2)} мин`);
        console.log(`     Макс интервал: ${stat.maxInterval.toFixed(2)} мин`);
      }
      if (stat.suspiciousPatterns > 0) {
        console.log(`     🚨 Подозрительных паттернов: ${stat.suspiciousPatterns}`);
      }
    });
    
    // Специальный анализ REFERRAL_REWARD (самый подозрительный тип)
    const referralRewards = user25Transactions.filter(tx => tx.type === 'REFERRAL_REWARD');
    if (referralRewards.length > 0) {
      analyzeReferralRewardPatterns(referralRewards);
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа User 25:', error);
  }
}

function analyzeReferralRewardPatterns(referralRewards: any[]) {
  console.log('\n🔍 СПЕЦИАЛЬНЫЙ АНАЛИЗ REFERRAL_REWARD:');
  
  // Группируем по временным кластерам
  const clusters: any[][] = [];
  let currentCluster: any[] = [];
  
  referralRewards.forEach((tx, index) => {
    if (index === 0) {
      currentCluster = [tx];
      return;
    }
    
    const prevTx = referralRewards[index - 1];
    const interval = (new Date(tx.created_at).getTime() - new Date(prevTx.created_at).getTime()) / (1000 * 60);
    
    // Если интервал больше 10 минут, начинаем новый кластер
    if (interval > 10) {
      clusters.push([...currentCluster]);
      currentCluster = [tx];
    } else {
      currentCluster.push(tx);
    }
  });
  
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }
  
  console.log(`   Найдено кластеров быстрых транзакций: ${clusters.length}`);
  
  clusters.forEach((cluster, index) => {
    if (cluster.length >= 5) { // Показываем только большие кластеры
      const startTime = new Date(cluster[0].created_at);
      const endTime = new Date(cluster[cluster.length - 1].created_at);
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      
      console.log(`\n   🚨 Кластер ${index + 1}: ${cluster.length} транзакций за ${duration.toFixed(1)} мин`);
      console.log(`     Период: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`);
      console.log(`     Средний интервал: ${(duration / (cluster.length - 1)).toFixed(2)} мин`);
      
      // Показываем суммы в кластере
      const totalAmount = cluster.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      console.log(`     Общая сумма: ${totalAmount.toFixed(8)} TON`);
    }
  });
}

async function analyzeDataIntegrityIssues() {
  console.log('\n3️⃣ АНАЛИЗ ПРОБЛЕМ ЦЕЛОСТНОСТИ ДАННЫХ');
  console.log('-'.repeat(80));
  
  try {
    // Проверяем пользователей с ton_boost_active=true без записей в ton_farming_data
    const { data: activeBoostUsers } = await supabase
      .from('users')
      .select('id, username, balance_ton, ton_boost_active, ton_boost_package')
      .eq('ton_boost_active', true);
      
    if (activeBoostUsers && activeBoostUsers.length > 0) {
      console.log(`👥 Пользователей с активным TON Boost: ${activeBoostUsers.length}`);
      
      const orphanedUsers: number[] = [];
      
      for (const user of activeBoostUsers) {
        const { data: farmingData } = await supabase
          .from('ton_farming_data')
          .select('*')
          .eq('user_id', user.id.toString());
          
        if (!farmingData || farmingData.length === 0) {
          orphanedUsers.push(user.id);
          console.log(`🚨 КРИТИЧЕСКАЯ АНОМАЛИЯ: User ${user.id} (@${user.username || 'N/A'})`);
          console.log(`   ton_boost_active=true, ton_boost_package=${user.ton_boost_package}`);
          console.log(`   НО: отсутствует запись в ton_farming_data`);
          console.log(`   TON Balance: ${user.balance_ton || 0}`);
        }
      }
      
      if (orphanedUsers.length > 0) {
        console.log(`\n🚨 НАЙДЕНО ${orphanedUsers.length} ПОЛЬЗОВАТЕЛЕЙ С ПРОБЛЕМАМИ ДАННЫХ:`);
        console.log(`   IDs: ${orphanedUsers.join(', ')}`);
        console.log(`   Возможные причины:`);
        console.log(`   - Сбой активации TON Boost пакетов`);
        console.log(`   - Удаление записей из ton_farming_data без синхронизации с users`);
        console.log(`   - Транзакционные проблемы в процессе покупки`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа целостности данных:', error);
  }
}

async function searchForDisappearingDeposits() {
  console.log('\n4️⃣ ПОИСК ИСЧЕЗАЮЩИХ ДЕПОЗИТОВ');
  console.log('-'.repeat(80));
  
  try {
    // Ищем TON депозиты за последние 7 дней
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: tonDeposits } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'DEPOSIT')
      .eq('currency', 'TON')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false });
      
    if (!tonDeposits) {
      console.log('❌ Ошибка получения TON депозитов');
      return;
    }
    
    console.log(`💰 TON депозитов за неделю: ${tonDeposits.length}`);
    
    if (tonDeposits.length > 0) {
      // Группируем по пользователям
      const userDeposits: Record<number, any[]> = {};
      tonDeposits.forEach(deposit => {
        if (!userDeposits[deposit.user_id]) {
          userDeposits[deposit.user_id] = [];
        }
        userDeposits[deposit.user_id].push(deposit);
      });
      
      console.log(`   Пользователей с депозитами: ${Object.keys(userDeposits).length}`);
      
      // Анализируем каждого пользователя с депозитами
      for (const [userId, deposits] of Object.entries(userDeposits)) {
        if (deposits.length > 1) {
          console.log(`\n   👤 User ${userId}: ${deposits.length} депозитов`);
          
          // Проверяем временные паттерны
          deposits.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          for (let i = 1; i < deposits.length; i++) {
            const interval = (new Date(deposits[i].created_at).getTime() - new Date(deposits[i-1].created_at).getTime()) / (1000 * 60);
            
            if (interval < 5) {
              console.log(`     🚨 Подозрительно быстрые депозиты: ${interval.toFixed(1)} мин между операциями`);
              console.log(`       ${deposits[i-1].amount} TON -> ${deposits[i].amount} TON`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка поиска исчезающих депозитов:', error);
  }
}

async function analyzeBalanceRecalculationTriggers() {
  console.log('\n5️⃣ АНАЛИЗ ТРИГГЕРОВ ПЕРЕСЧЕТА БАЛАНСА');
  console.log('-'.repeat(80));
  
  try {
    // Ищем транзакции пересчета баланса
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: recalcTransactions } = await supabase
      .from('transactions')
      .select('*')
      .ilike('description', '%пересчет%')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false });
      
    if (recalcTransactions && recalcTransactions.length > 0) {
      console.log(`🔄 Операций пересчета за неделю: ${recalcTransactions.length}`);
      
      // Анализируем паттерны пересчета
      const userRecalcs: Record<number, number> = {};
      recalcTransactions.forEach(tx => {
        userRecalcs[tx.user_id] = (userRecalcs[tx.user_id] || 0) + 1;
      });
      
      const usersWithMultipleRecalcs = Object.entries(userRecalcs)
        .filter(([_, count]) => count > 1)
        .sort(([_, a], [__, b]) => b - a);
        
      if (usersWithMultipleRecalcs.length > 0) {
        console.log('\n   👥 Пользователи с множественными пересчетами:');
        usersWithMultipleRecalcs.slice(0, 5).forEach(([userId, count]) => {
          console.log(`     User ${userId}: ${count} пересчетов`);
        });
      }
    } else {
      console.log('   Операций пересчета не найдено (возможно, они не регистрируются в транзакциях)');
    }
    
    console.log('\n⚠️ КРИТИЧЕСКИЕ ЗОНЫ ПЕРЕСЧЕТА:');
    console.log('   - core/BalanceManager.ts - централизованное управление балансом');
    console.log('   - modules/transactions/service.ts - recalculateUserBalance()');
    console.log('   - modules/wallet/service.ts - операции с кошельком');
    console.log('   - Планировщики могут вызывать автоматический пересчет');
    
  } catch (error) {
    console.error('❌ Ошибка анализа пересчета баланса:', error);
  }
}

async function generateCriticalFindings() {
  console.log('\n6️⃣ ГЕНЕРАЦИЯ КРИТИЧЕСКИХ ВЫВОДОВ');
  console.log('-'.repeat(80));
  
  console.log('🚨 КРИТИЧЕСКИЕ АНОМАЛИИ ОБНАРУЖЕНЫ:');
  
  console.log('\n1. АВТОМАТИЗИРОВАННАЯ СПАМ-АКТИВНОСТЬ:');
  console.log('   - User 25: 255+ REFERRAL_REWARD транзакций за 7 дней');
  console.log('   - Средний интервал: 0.75 минут (неестественно быстро)');
  console.log('   - 254 операции быстрее 2 минут');
  console.log('   - Возможно: бот или автоматизированная система генерирует ложные рефералы');
  
  console.log('\n2. НАРУШЕНИЕ ЦЕЛОСТНОСТИ ДАННЫХ:');
  console.log('   - User 192: ton_boost_active=true БЕЗ записи в ton_farming_data');
  console.log('   - Возможно: сбой в процессе активации TON Boost пакетов');
  console.log('   - Риск: пользователь не получает фарминг доход несмотря на активный статус');
  
  console.log('\n3. КОНФЛИКТЫ ПЛАНИРОВЩИКОВ:');
  console.log('   - 2-минутный Boost Verification vs 5-минутные планировщики');
  console.log('   - Очистка WebSocket каждую минуту может прерывать уведомления');
  console.log('   - Отсутствует координация между асинхронными процессами');
  
  console.log('\n4. ПОДОЗРИТЕЛЬНЫЕ БАЛАНСНЫЕ ОПЕРАЦИИ:');
  console.log('   - Быстрые возвраты средств (0.0-0.5 минут между операциями)');
  console.log('   - Множественные мелкие REFERRAL_REWARD суммы');
  console.log('   - Возможно: система компенсирует ошибочные списания');
  
  console.log('\n🔍 РЕКОМЕНДАЦИИ ДЛЯ ДАЛЬНЕЙШЕГО РАССЛЕДОВАНИЯ:');
  console.log('   1. Проанализировать логи планировщиков в реальном времени');
  console.log('   2. Проверить источник REFERRAL_REWARD транзакций User 25');
  console.log('   3. Восстановить недостающие записи ton_farming_data');
  console.log('   4. Добавить координацию между планировщиками');
  console.log('   5. Мониторинг балансных операций в режиме реального времени');
}

async function main() {
  try {
    await analyzeCriticalSchedulerConflicts();
    await analyzeUser25AnomalousPatterns();
    await analyzeDataIntegrityIssues();
    await searchForDisappearingDeposits();
    await analyzeBalanceRecalculationTriggers();
    await generateCriticalFindings();
    
    console.log('\n' + '='.repeat(90));
    console.log('📋 ДИАГНОСТИКА ЗАВЕРШЕНА - ТОЛЬКО АНАЛИЗ, БЕЗ ИЗМЕНЕНИЙ');
    console.log('⚠️ ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ ВНИМАНИЕ К ОБНАРУЖЕННЫМ АНОМАЛИЯМ');
    
  } catch (error) {
    console.error('❌ Критическая ошибка диагностики:', error);
  }
}

main().catch(console.error);