/**
 * КРИТИЧЕСКИЙ АНАЛИЗ ПОТОКА TON БАЛАНСОВ
 * Цель: Найти узкие места в системе без изменения кода
 * Проблемы: Непредсказуемые списания/возвраты TON при депозитах и TON Boost
 */

import { supabase } from './core/supabase';

async function analyzeTonBalanceFlow() {
  console.log('🔍 КРИТИЧЕСКИЙ АНАЛИЗ ПОТОКА TON БАЛАНСОВ');
  console.log('=' * 70);
  
  try {
    // 1. АНАЛИЗ ПОСЛЕДНИХ TON ТРАНЗАКЦИЙ С ВРЕМЕННЫМИ ИНТЕРВАЛАМИ
    console.log('\n1️⃣ АНАЛИЗ ПОСЛЕДНИХ TON ТРАНЗАКЦИЙ (72 часа):');
    console.log('-'.repeat(50));
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const { data: tonTransactions, error: tonError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', threeDaysAgo.toISOString())
      .or('currency.eq.TON,amount_ton.neq.0')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (tonError) {
      console.error('❌ Ошибка получения TON транзакций:', tonError);
      return;
    }
    
    if (!tonTransactions || tonTransactions.length === 0) {
      console.log('⚠️ TON транзакций за 72 часа не найдено');
      return;
    }
    
    console.log(`📊 Найдено TON транзакций: ${tonTransactions.length}`);
    
    // Анализируем паттерны по пользователям
    const userFlows = new Map();
    
    tonTransactions.forEach(tx => {
      const userId = tx.user_id.toString();
      if (!userFlows.has(userId)) {
        userFlows.set(userId, []);
      }
      userFlows.get(userId).push({
        id: tx.id,
        amount: parseFloat(tx.amount_ton || '0'),
        type: tx.type,
        description: tx.description,
        created_at: tx.created_at,
        metadata: tx.metadata
      });
    });
    
    console.log(`👥 Уникальных пользователей: ${userFlows.size}`);
    
    // 2. ПОИСК ПОДОЗРИТЕЛЬНЫХ ПАТТЕРНОВ СПИСАНИЕ → ВОЗВРАТ
    console.log('\n2️⃣ ПОИСК ПАТТЕРНОВ СПИСАНИЕ → ВОЗВРАТ:');
    console.log('-'.repeat(50));
    
    let suspiciousPatternsFound = 0;
    let totalReversalPatterns = 0;
    
    for (const [userId, transactions] of userFlows) {
      if (transactions.length < 2) continue;
      
      // Сортируем по времени
      transactions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      let userSuspiciousPatterns = 0;
      
      for (let i = 0; i < transactions.length - 1; i++) {
        const tx1 = transactions[i];
        const tx2 = transactions[i + 1];
        
        const amount1 = tx1.amount;
        const amount2 = tx2.amount;
        const timeDiff = (new Date(tx2.created_at).getTime() - new Date(tx1.created_at).getTime()) / 1000;
        
        // Паттерн: списание и возврат примерно одинаковой суммы
        if (amount1 < 0 && amount2 > 0 && Math.abs(Math.abs(amount1) - amount2) < 0.001 && timeDiff < 3600) {
          console.log(`\n🔴 ПОДОЗРИТЕЛЬНЫЙ ПАТТЕРН - User ${userId}:`);
          console.log(`  Списание: ${amount1} TON (${new Date(tx1.created_at).toLocaleString()})`);
          console.log(`  Возврат:  +${amount2} TON (${new Date(tx2.created_at).toLocaleString()})`);
          console.log(`  Интервал: ${Math.round(timeDiff)} секунд`);
          console.log(`  Описание 1: ${tx1.description}`);
          console.log(`  Описание 2: ${tx2.description}`);
          
          if (tx1.metadata?.tx_hash || tx2.metadata?.tx_hash) {
            console.log(`  TX Hash 1: ${tx1.metadata?.tx_hash || 'нет'}`);
            console.log(`  TX Hash 2: ${tx2.metadata?.tx_hash || 'нет'}`);
          }
          
          userSuspiciousPatterns++;
          totalReversalPatterns++;
        }
        
        // Паттерн: дублирование одинаковых транзакций
        if (Math.abs(amount1 - amount2) < 0.001 && amount1 !== 0 && timeDiff < 300) {
          console.log(`\n🟠 ВОЗМОЖНОЕ ДУБЛИРОВАНИЕ - User ${userId}:`);
          console.log(`  Транзакция 1: ${amount1} TON (${new Date(tx1.created_at).toLocaleString()})`);
          console.log(`  Транзакция 2: ${amount2} TON (${new Date(tx2.created_at).toLocaleString()})`);
          console.log(`  Интервал: ${Math.round(timeDiff)} секунд`);
          
          userSuspiciousPatterns++;
        }
      }
      
      if (userSuspiciousPatterns > 0) {
        suspiciousPatternsFound++;
      }
    }
    
    console.log(`\n📊 СТАТИСТИКА ПАТТЕРНОВ:`);
    console.log(`- Пользователей с подозрительными паттернами: ${suspiciousPatternsFound}`);
    console.log(`- Общее количество паттернов возврата: ${totalReversalPatterns}`);
    
    // 3. АНАЛИЗ TON BOOST АКТИВНОСТИ
    console.log('\n3️⃣ АНАЛИЗ TON BOOST АКТИВНОСТИ:');
    console.log('-'.repeat(50));
    
    const boostTransactions = tonTransactions.filter(tx => 
      tx.description?.toLowerCase().includes('boost') ||
      tx.metadata?.original_type?.includes('BOOST') ||
      tx.type === 'BOOST_PURCHASE'
    );
    
    console.log(`📊 TON Boost транзакций: ${boostTransactions.length}`);
    
    if (boostTransactions.length > 0) {
      const boostByUser = new Map();
      
      boostTransactions.forEach(tx => {
        const userId = tx.user_id.toString();
        if (!boostByUser.has(userId)) {
          boostByUser.set(userId, { purchases: [], deposits: [], incomes: [] });
        }
        
        const userData = boostByUser.get(userId);
        const amount = parseFloat(tx.amount_ton || '0');
        
        if (amount < 0 || tx.description?.toLowerCase().includes('покупка')) {
          userData.purchases.push(tx);
        } else if (tx.metadata?.original_type === 'TON_BOOST_DEPOSIT') {
          userData.deposits.push(tx);
        } else if (tx.metadata?.original_type === 'TON_BOOST_INCOME') {
          userData.incomes.push(tx);
        }
      });
      
      console.log(`👥 Пользователей с TON Boost активностью: ${boostByUser.size}`);
      
      for (const [userId, data] of boostByUser) {
        const { purchases, deposits, incomes } = data;
        
        if (purchases.length > 0 || deposits.length > 0) {
          console.log(`\n👤 User ${userId}:`);
          console.log(`  💰 Покупок: ${purchases.length}`);
          console.log(`  📥 Депозитов: ${deposits.length}`);
          console.log(`  📈 Доходов: ${incomes.length}`);
          
          // Анализ потенциальных проблем
          if (deposits.length > 0 && purchases.length === 0) {
            console.log(`  ⚠️ СТРАННО: Есть депозиты но нет покупок`);
          }
          
          if (deposits.length > purchases.length) {
            console.log(`  🔴 ПРОБЛЕМА: Депозитов больше чем покупок!`);
          }
          
          // Анализ временных интервалов
          if (purchases.length > 0 && deposits.length > 0) {
            purchases.forEach(purchase => {
              const purchaseTime = new Date(purchase.created_at).getTime();
              
              deposits.forEach(deposit => {
                const depositTime = new Date(deposit.created_at).getTime();
                const timeDiff = Math.abs(depositTime - purchaseTime) / 1000;
                
                if (timeDiff < 60) {
                  console.log(`  ⚡ Покупка и депозит с разницей ${Math.round(timeDiff)} секунд`);
                }
              });
            });
          }
        }
      }
    }
    
    // 4. ПРОВЕРКА ДЕДУПЛИКАЦИИ TRANSACTION ХЕШЕЙ
    console.log('\n4️⃣ ПРОВЕРКА ДЕДУПЛИКАЦИИ TX ХЕШЕЙ:');
    console.log('-'.repeat(50));
    
    const hashMap = new Map();
    const duplicatedHashes = [];
    
    tonTransactions.forEach(tx => {
      const hash = tx.metadata?.tx_hash || tx.metadata?.ton_tx_hash;
      if (hash) {
        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        hashMap.get(hash).push(tx);
      }
    });
    
    for (const [hash, transactions] of hashMap) {
      if (transactions.length > 1) {
        duplicatedHashes.push({ hash, transactions });
      }
    }
    
    if (duplicatedHashes.length > 0) {
      console.log(`🔴 НАЙДЕНО ДУБЛИРОВАННЫХ TX ХЕШЕЙ: ${duplicatedHashes.length}`);
      
      duplicatedHashes.forEach(({ hash, transactions }, index) => {
        console.log(`\n${index + 1}. Hash: ${hash}`);
        transactions.forEach(tx => {
          console.log(`   - ID ${tx.id}, User ${tx.user_id}, ${tx.amount_ton} TON, ${new Date(tx.created_at).toLocaleString()}`);
        });
      });
    } else {
      console.log('✅ Дублированных TX хешей не найдено');
    }
    
    // 5. АНАЛИЗ ТЕКУЩИХ БАЛАНСОВ ПОЛЬЗОВАТЕЛЕЙ
    console.log('\n5️⃣ АНАЛИЗ ТЕКУЩИХ БАЛАНСОВ:');
    console.log('-'.repeat(50));
    
    const activeUserIds = Array.from(userFlows.keys()).slice(0, 10); // Топ 10 активных
    
    for (const userId of activeUserIds) {
      const { data: userBalance, error: balanceError } = await supabase
        .from('users')
        .select('id, balance_ton, balance_uni')
        .eq('id', parseInt(userId))
        .single();
      
      if (!balanceError && userBalance) {
        const userTxs = userFlows.get(userId);
        const totalFlow = userTxs.reduce((sum, tx) => sum + tx.amount, 0);
        
        console.log(`User ${userId}: Баланс ${userBalance.balance_ton} TON, Поток транзакций: ${totalFlow.toFixed(6)} TON`);
        
        if (Math.abs(totalFlow) > parseFloat(userBalance.balance_ton) * 2) {
          console.log(`  ⚠️ ПОДОЗРИТЕЛЬНО: Поток транзакций превышает баланс в 2+ раза`);
        }
      }
    }
    
    // 6. ИТОГОВЫЕ РЕКОМЕНДАЦИИ
    console.log('\n6️⃣ УЗКИЕ МЕСТА И РЕКОМЕНДАЦИИ:');
    console.log('='.repeat(50));
    
    console.log('\n🔍 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
    
    if (totalReversalPatterns > 0) {
      console.log(`❌ ${totalReversalPatterns} паттернов списание→возврат найдено`);
      console.log('   Рекомендация: Проверить логику TransactionService и BalanceManager');
    }
    
    if (duplicatedHashes.length > 0) {
      console.log(`❌ ${duplicatedHashes.length} дублированных TX хешей`);
      console.log('   Рекомендация: Усилить дедупликацию в TransactionService');
    }
    
    console.log('\n🎯 ПРИОРИТЕТНЫЕ ОБЛАСТИ ДЛЯ ИССЛЕДОВАНИЯ:');
    console.log('1. core/TransactionService.ts - логика shouldUpdateBalance()');
    console.log('2. core/BalanceManager.ts - операции add/subtract/set');
    console.log('3. modules/boost/service.ts - активация TON Boost пакетов');
    console.log('4. modules/wallet/service.ts - обработка TON депозитов');
    console.log('5. Дедупликация по tx_hash_unique полю');
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
  }
}

// Запуск анализа
analyzeTonBalanceFlow()
  .then(() => {
    console.log('\n✅ Анализ завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Ошибка выполнения:', error);
    process.exit(1);
  });