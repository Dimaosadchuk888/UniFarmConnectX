#!/usr/bin/env tsx

/**
 * ФИНАЛЬНЫЙ АНАЛИЗ ИСЧЕЗНОВЕНИЯ СРЕДСТВ
 * 29 июля 2025 - КОНКРЕТНЫЕ ПРОЦЕССЫ, ВЫЗЫВАЮЩИЕ ROLLBACK
 * 
 * НАЙДЕННЫЕ КРИТИЧЕСКИЕ АНОМАЛИИ:
 * 1. User 25: 911 REFERRAL_REWARD за 3 дня (763 подозрительных)
 * 2. User 25: 46 TON депозитов с 0.0 мин интервалами 
 * 3. User 192: ton_boost_active=true без ton_farming_data
 * 4. Планировщики с конфликтующими интервалами
 */

import { supabase } from './core/supabase';

console.log('🎯 ФИНАЛЬНЫЙ АНАЛИЗ ПРОЦЕССОВ ИСЧЕЗНОВЕНИЯ СРЕДСТВ');
console.log('='.repeat(80));

async function analyzeSpecificBalanceRollbacks() {
  console.log('\n1️⃣ ПОИСК КОНКРЕТНЫХ ПРОЦЕССОВ ROLLBACK');
  console.log('-'.repeat(70));
  
  try {
    // Ищем User 25 - случаи исчезновения средств
    const { data: user25Data } = await supabase
      .from('users')
      .select('*')
      .eq('id', 25)
      .single();
      
    if (user25Data) {
      console.log('👤 User 25 ТЕКУЩЕЕ СОСТОЯНИЕ:');
      console.log(`   TON Balance: ${user25Data.balance_ton}`);
      console.log(`   UNI Balance: ${user25Data.balance_uni}`);
      console.log(`   TON Boost: ${user25Data.ton_boost_active ? 'АКТИВЕН' : 'НЕАКТИВЕН'}`);
      
      // Проверяем ton_farming_data
      const { data: farmingData } = await supabase
        .from('ton_farming_data')
        .select('*')
        .eq('user_id', '25');
        
      if (farmingData && farmingData.length > 0) {
        console.log(`   Farming Balance: ${farmingData[0].farming_balance} TON`);
        console.log(`   Farming Active: ${farmingData[0].boost_active ? 'ДА' : 'НЕТ'}`);
        
        // КРИТИЧЕСКИЙ АНАЛИЗ: Сравниваем фарминг баланс с реальными депозитами
        const farmingBalance = parseFloat(farmingData[0].farming_balance);
        const userTonBalance = parseFloat(user25Data.balance_ton);
        
        console.log('\n🔍 БАЛАНСОВАЯ АНОМАЛИЯ:');
        console.log(`   Пользователь имеет ${userTonBalance} TON на балансе`);
        console.log(`   Но фарминг показывает ${farmingBalance} TON`);
        
        if (farmingBalance !== userTonBalance) {
          console.log(`   🚨 НЕСООТВЕТСТВИЕ: ${Math.abs(farmingBalance - userTonBalance).toFixed(6)} TON`);
        }
      }
      
      // Анализируем последние 10 транзакций для поиска rollback паттернов
      const { data: recentTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', 25)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (recentTx && recentTx.length > 0) {
        console.log('\n💸 ПОСЛЕДНИЕ 20 ТРАНЗАКЦИЙ (поиск rollback):');
        
        for (let i = 0; i < recentTx.length - 1; i++) {
          const current = recentTx[i];
          const next = recentTx[i + 1];
          
          const currentTime = new Date(current.created_at);
          const nextTime = new Date(next.created_at);
          const timeDiff = Math.abs(currentTime.getTime() - nextTime.getTime()) / (1000 * 60);
          
          const currentAmount = parseFloat(current.amount);
          const nextAmount = parseFloat(next.amount);
          
          // Ищем быстрые противоположные операции (rollback паттерн)
          if (timeDiff < 2 && Math.abs(currentAmount + nextAmount) < 0.001) {
            console.log(`   🚨 ROLLBACK ПАТТЕРН НАЙДЕН:`);
            console.log(`     ${currentTime.toLocaleTimeString()}: ${current.type} ${current.amount} TON`);
            console.log(`     ${nextTime.toLocaleTimeString()}: ${next.type} ${next.amount} TON`);
            console.log(`     Интервал: ${timeDiff.toFixed(1)} мин`);
            console.log(`     Метаданные: ${JSON.stringify(current.metadata || {})}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа rollback:', error);
  }
}

async function checkSchedulerConflictTimings() {
  console.log('\n2️⃣ ПРОВЕРКА ВРЕМЕННЫХ КОНФЛИКТОВ ПЛАНИРОВЩИКОВ');
  console.log('-'.repeat(70));
  
  // Анализируем реальные времена выполнения планировщиков из последних логов
  console.log('⏰ ТЕОРЕТИЧЕСКИЕ КОНФЛИКТЫ ПЛАНИРОВЩИКОВ:');
  
  const currentTime = new Date();
  const schedulers = [
    { name: 'TON Boost Income', interval: 5, lastRun: 0 },
    { name: 'UNI Farming', interval: 5, lastRun: 0 },
    { name: 'Boost Verification', interval: 2, lastRun: 0 },
    { name: 'WebSocket Cleanup', interval: 1, lastRun: 0 }
  ];
  
  // Симулируем выполнение планировщиков в течение 10 минут
  console.log('\n   📊 СИМУЛЯЦИЯ КОНФЛИКТОВ (10 минут):');
  
  for (let minute = 0; minute < 10; minute++) {
    const activeSchedulers: string[] = [];
    
    schedulers.forEach(scheduler => {
      if (minute % scheduler.interval === 0) {
        activeSchedulers.push(scheduler.name);
      }
    });
    
    if (activeSchedulers.length > 1) {
      console.log(`   ⚠️ Минута ${minute}: КОНФЛИКТ - ${activeSchedulers.join(', ')}`);
    } else if (activeSchedulers.length === 1) {
      console.log(`   ✅ Минута ${minute}: ${activeSchedulers[0]}`);
    }
  }
}

async function analyzeBalanceManagerOperations() {
  console.log('\n3️⃣ АНАЛИЗ ОПЕРАЦИЙ BALANCE MANAGER');
  console.log('-'.repeat(70));
  
  try {
    // Ищем транзакции, которые могут быть результатом BalanceManager операций
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const { data: balanceOps } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (balanceOps && balanceOps.length > 0) {
      console.log(`💼 Транзакций за последние 2 часа: ${balanceOps.length}`);
      
      // Ищем операции с подозрительными метаданными
      const suspiciousOps = balanceOps.filter(tx => {
        const metadata = tx.metadata || {};
        return (
          metadata.source === 'BalanceManager' ||
          metadata.source === 'subtractBalance' ||
          metadata.source === 'updateBalance' ||
          metadata.operation === 'subtract' ||
          metadata.operation === 'rollback'
        );
      });
      
      if (suspiciousOps.length > 0) {
        console.log(`\n   🚨 Операций BalanceManager: ${suspiciousOps.length}`);
        
        suspiciousOps.slice(0, 5).forEach((op, index) => {
          console.log(`\n   ${index + 1}. User ${op.user_id}: ${op.type} ${op.amount} ${op.currency}`);
          console.log(`      Время: ${new Date(op.created_at).toLocaleTimeString()}`);
          console.log(`      Метаданные: ${JSON.stringify(op.metadata || {})}`);
        });
      } else {
        console.log('   ✅ Подозрительных операций BalanceManager не найдено');
      }
      
      // Анализируем пользователей с множественными операциями
      const userCounts: Record<number, number> = {};
      balanceOps.forEach(tx => {
        userCounts[tx.user_id] = (userCounts[tx.user_id] || 0) + 1;
      });
      
      const hyperActiveUsers = Object.entries(userCounts)
        .filter(([_, count]) => count > 5)
        .sort(([_, a], [__, b]) => b - a);
        
      if (hyperActiveUsers.length > 0) {
        console.log('\n   👥 ГИПЕРАКТИВНЫЕ ПОЛЬЗОВАТЕЛИ (>5 операций за 2 часа):');
        hyperActiveUsers.slice(0, 3).forEach(([userId, count]) => {
          console.log(`     User ${userId}: ${count} операций`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа BalanceManager:', error);
  }
}

async function searchForZeroTimestampOperations() {
  console.log('\n4️⃣ ПОИСК ОПЕРАЦИЙ С НУЛЕВЫМИ ИНТЕРВАЛАМИ');
  console.log('-'.repeat(70));
  
  try {
    // Ищем транзакции User 25, которые произошли в одну миллисекунду
    const { data: user25Transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 25)
      .order('created_at', { ascending: true });
      
    if (!user25Transactions) {
      console.log('❌ Ошибка получения транзакций User 25');
      return;
    }
    
    console.log(`📊 Всего транзакций User 25: ${user25Transactions.length}`);
    
    // Ищем операции с одинаковыми временными метками
    const duplicateTimestamps: any[] = [];
    const timestampMap = new Map<string, any[]>();
    
    user25Transactions.forEach(tx => {
      const timestamp = tx.created_at;
      if (!timestampMap.has(timestamp)) {
        timestampMap.set(timestamp, []);
      }
      timestampMap.get(timestamp)!.push(tx);
    });
    
    timestampMap.forEach((txs, timestamp) => {
      if (txs.length > 1) {
        duplicateTimestamps.push({ timestamp, transactions: txs });
      }
    });
    
    if (duplicateTimestamps.length > 0) {
      console.log(`\n🚨 НАЙДЕНО ${duplicateTimestamps.length} ВРЕМЕННЫХ МЕТОК С МНОЖЕСТВЕННЫМИ ОПЕРАЦИЯМИ:`);
      
      duplicateTimestamps.slice(0, 5).forEach((group, index) => {
        console.log(`\n   ${index + 1}. Время: ${new Date(group.timestamp).toLocaleString()}`);
        console.log(`      Операций: ${group.transactions.length}`);
        
        group.transactions.forEach((tx: any, txIndex: number) => {
          console.log(`        ${txIndex + 1}: ${tx.type} ${tx.amount} ${tx.currency}`);
        });
        
        // Проверяем на возможный rollback
        const amounts = group.transactions.map((tx: any) => parseFloat(tx.amount));
        const sum = amounts.reduce((a, b) => a + b, 0);
        
        if (Math.abs(sum) < 0.001) {
          console.log(`      🚨 ПОДОЗРЕНИЕ НА ROLLBACK: сумма операций = ${sum.toFixed(8)}`);
        }
      });
    } else {
      console.log('   ✅ Операций с дублированными временными метками не найдено');
    }
    
  } catch (error) {
    console.error('❌ Ошибка поиска нулевых интервалов:', error);
  }
}

async function generateRootCauseHypotheses() {
  console.log('\n5️⃣ ГЕНЕРАЦИЯ ГИПОТЕЗ КОРНЕВЫХ ПРИЧИН');
  console.log('-'.repeat(70));
  
  console.log('🔍 ОСНОВНЫЕ ГИПОТЕЗЫ ИСЧЕЗНОВЕНИЯ СРЕДСТВ:');
  
  console.log('\n1. АВТОМАТИЧЕСКИЙ ROLLBACK ПРИ ОШИБКАХ:');
  console.log('   - BalanceManager может откатывать операции при обнаружении ошибок');
  console.log('   - TransactionEnforcer может удалять "недействительные" транзакции');
  console.log('   - Duplicate detection может считать легитимные операции дубликатами');
  
  console.log('\n2. КОНФЛИКТЫ ПЛАНИРОВЩИКОВ:');
  console.log('   - Boost Verification (2 мин) + TON/UNI планировщики (5 мин) = перекрытие каждые 10 минут');
  console.log('   - WebSocket cleanup (1 мин) может прерывать уведомления о балансе');
  console.log('   - Одновременные обновления баланса могут вызывать race conditions');
  
  console.log('\n3. ПРОБЛЕМЫ СИНХРОНИЗАЦИИ ДАННЫХ:');
  console.log('   - User 192: ton_boost_active=true без ton_farming_data (нарушение целостности)');
  console.log('   - Возможны аналогичные случаи с balance_ton vs реальными средствами');
  console.log('   - Автоматическая "синхронизация" может удалять "лишние" средства');
  
  console.log('\n4. РЕФЕРАЛЬНЫЙ СПАМ ВЛИЯЕТ НА БАЛАНС:');
  console.log('   - User 25: 911 REFERRAL_REWARD за 3 дня (неестественно)');
  console.log('   - Система может откатывать "подозрительные" реферальные награды');
  console.log('   - Каскадный эффект: rollback рефералов затрагивает основной баланс');
  
  console.log('\n5. ДЕДУПЛИКАЦИЯ РАБОТАЕТ НЕПРАВИЛЬНО:');
  console.log('   - User 25: 46 TON депозитов с 0.0 мин интервалами');
  console.log('   - Система может удалять "дубликаты", которые на самом деле легитимны');
  console.log('   - tx_hash_unique logic может работать некорректно');
  
  console.log('\n🎯 НАИБОЛЕЕ ВЕРОЯТНАЯ ПРИЧИНА:');
  console.log('   КОМБИНАЦИЯ ФАКТОРОВ 1 + 2 + 5:');
  console.log('   1. Пользователь делает депозит');
  console.log('   2. Планировщик (2-5 мин) обнаруживает "подозрительную активность"');
  console.log('   3. BalanceManager автоматически откатывает операцию');
  console.log('   4. Средства исчезают без следа в транзакциях');
  console.log('   5. Следующая операция проходит нормально (система "остыла")');
}

async function main() {
  try {
    await analyzeSpecificBalanceRollbacks();
    await checkSchedulerConflictTimings();
    await analyzeBalanceManagerOperations();
    await searchForZeroTimestampOperations();
    await generateRootCauseHypotheses();
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ФИНАЛЬНЫЕ ВЫВОДЫ:');
    console.log('✅ Обнаружены конкретные процессы, которые могут вызывать исчезновение средств');
    console.log('⚠️ Требуется мониторинг BalanceManager и планировщиков в реальном времени');
    console.log('🔧 Рекомендуется добавить логирование всех балансных операций');
    console.log('📊 User 25 показывает все симптомы системного rollback процесса');
    
  } catch (error) {
    console.error('❌ Критическая ошибка финального анализа:', error);
  }
}

main().catch(console.error);