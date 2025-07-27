/**
 * КРИТИЧЕСКАЯ ДИАГНОСТИКА: Непредсказуемое поведение TON балансов
 * Дата: 27 июля 2025
 * Проблема: TON депозиты и TON Boost покупки ведут себя непредсказуемо:
 * - Пополнение 1 TON → списывается → может вернуться или не вернуться
 * - Покупка TON Boost → депозит может вернуться на баланс
 * 
 * ЗАДАЧА: Найти узкие места без изменения кода
 */

import { supabase } from './core/supabase';

interface TransactionAnalysis {
  userId: string;
  transactionId: number;
  type: string;
  amount_ton: number;
  description: string;
  created_at: string;
  metadata: any;
  timeline_position: number;
}

interface BalanceFlow {
  operation: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  timestamp: string;
  suspicious: boolean;
  reason?: string;
}

async function diagnoseTonBalanceInconsistencies() {
  console.log('🚨 КРИТИЧЕСКАЯ ДИАГНОСТИКА: Непредсказуемое поведение TON балансов');
  console.log('=' * 80);
  
  try {
    // 1. АНАЛИЗ ПОСЛЕДНИХ TON ДЕПОЗИТОВ ЗА 24 ЧАСА
    console.log('\n1️⃣ АНАЛИЗ TON ДЕПОЗИТОВ ЗА ПОСЛЕДНИЕ 24 ЧАСА:');
    console.log('-' * 50);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentDeposits, error: depositsError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .or('currency.eq.TON,amount_ton.gt.0')
      .or('description.ilike.%депозит%,description.ilike.%пополнение%,type.eq.TON_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (depositsError) {
      console.error('❌ Ошибка получения депозитов:', depositsError);
    } else if (recentDeposits && recentDeposits.length > 0) {
      console.log(`📊 Найдено TON депозитов за 24 часа: ${recentDeposits.length}`);
      
      // Группируем по пользователям и анализируем паттерны
      const userDeposits = new Map();
      recentDeposits.forEach(tx => {
        const userId = tx.user_id.toString();
        if (!userDeposits.has(userId)) {
          userDeposits.set(userId, []);
        }
        userDeposits.get(userId).push(tx);
      });
      
      console.log(`👥 Уникальных пользователей с депозитами: ${userDeposits.size}`);
      
      // Анализируем каждого пользователя на предмет дублирования
      for (const [userId, deposits] of userDeposits) {
        if (deposits.length > 1) {
          console.log(`\n⚠️ ПОДОЗРИТЕЛЬНАЯ АКТИВНОСТЬ - Пользователь ${userId}:`);
          deposits.forEach((tx, index) => {
            console.log(`  ${index + 1}. ${new Date(tx.created_at).toLocaleString()}: ${tx.amount_ton} TON - ${tx.description}`);
            if (tx.metadata?.tx_hash) {
              console.log(`     TX Hash: ${tx.metadata.tx_hash}`);
            }
          });
          
          // Проверяем на дублирование TX хешей
          const txHashes = deposits.map(tx => tx.metadata?.tx_hash || tx.metadata?.ton_tx_hash).filter(Boolean);
          const uniqueHashes = new Set(txHashes);
          if (txHashes.length !== uniqueHashes.size) {
            console.log(`     🔴 ДУБЛИРОВАНИЕ TX ХЕШЕЙ ОБНАРУЖЕНО!`);
          }
        }
      }
    } else {
      console.log('ℹ️ Депозитов за последние 24 часа не найдено');
    }
    
    // 2. АНАЛИЗ TON BOOST ПОКУПОК ЗА 24 ЧАСА
    console.log('\n2️⃣ АНАЛИЗ TON BOOST ПОКУПОК ЗА ПОСЛЕДНИЕ 24 ЧАСА:');
    console.log('-' * 50);
    
    const { data: recentBoostPurchases, error: boostError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .or('description.ilike.%boost%,metadata->>original_type.eq.TON_BOOST_DEPOSIT,type.eq.BOOST_PURCHASE')
      .order('created_at', { ascending: false })
      .limit(30);
    
    if (boostError) {
      console.error('❌ Ошибка получения TON Boost покупок:', boostError);
    } else if (recentBoostPurchases && recentBoostPurchases.length > 0) {
      console.log(`📊 Найдено транзакций связанных с TON Boost: ${recentBoostPurchases.length}`);
      
      // Группируем по пользователям
      const userBoostActivity = new Map();
      recentBoostPurchases.forEach(tx => {
        const userId = tx.user_id.toString();
        if (!userBoostActivity.has(userId)) {
          userBoostActivity.set(userId, { purchases: [], deposits: [], incomes: [] });
        }
        
        const activity = userBoostActivity.get(userId);
        if (tx.description?.toLowerCase().includes('покупка') || tx.type === 'BOOST_PURCHASE') {
          activity.purchases.push(tx);
        } else if (tx.metadata?.original_type === 'TON_BOOST_DEPOSIT') {
          activity.deposits.push(tx);
        } else if (tx.metadata?.original_type === 'TON_BOOST_INCOME') {
          activity.incomes.push(tx);
        }
      });
      
      // Анализируем паттерны покупка → депозит → возврат
      for (const [userId, activity] of userBoostActivity) {
        const { purchases, deposits, incomes } = activity;
        
        if (purchases.length > 0) {
          console.log(`\n👤 Пользователь ${userId}:`);
          console.log(`  💰 Покупок: ${purchases.length}`);
          console.log(`  📥 Депозитов: ${deposits.length}`);
          console.log(`  📈 Доходов: ${incomes.length}`);
          
          // Ищем подозрительные паттерны
          if (deposits.length > purchases.length) {
            console.log(`  🔴 ПОДОЗРИТЕЛЬНО: Депозитов больше чем покупок!`);
          }
          
          // Анализируем временные интервалы
          if (purchases.length > 0 && deposits.length > 0) {
            const lastPurchase = new Date(purchases[0].created_at);
            const lastDeposit = new Date(deposits[0].created_at);
            const timeDiff = Math.abs(lastDeposit.getTime() - lastPurchase.getTime()) / 1000;
            
            if (timeDiff < 60) {
              console.log(`  ⚠️ Покупка и депозит с разницей ${timeDiff.toFixed(1)} секунд`);
            }
          }
        }
      }
    } else {
      console.log('ℹ️ TON Boost активности за последние 24 часа не найдено');
    }
    
    // 3. ПОИСК ПОЛЬЗОВАТЕЛЕЙ С ЧАСТЫМИ ИЗМЕНЕНИЯМИ БАЛАНСА
    console.log('\n3️⃣ ПОИСК ПОЛЬЗОВАТЕЛЕЙ С ЧАСТЫМИ ИЗМЕНЕНИЯМИ TON БАЛАНСА:');
    console.log('-' * 50);
    
    const { data: frequentBalanceChanges, error: balanceError } = await supabase
      .from('transactions')
      .select('user_id, COUNT(*) as transaction_count')
      .gte('created_at', yesterday.toISOString())
      .or('currency.eq.TON,amount_ton.gt.0')
      .group('user_id')
      .having('COUNT(*) > 5')
      .order('transaction_count', { ascending: false });
    
    if (balanceError) {
      console.error('❌ Ошибка анализа частоты транзакций:', balanceError);
    } else if (frequentBalanceChanges && frequentBalanceChanges.length > 0) {
      console.log('🔍 Пользователи с высокой частотой TON транзакций:');
      frequentBalanceChanges.forEach(user => {
        console.log(`  User ${user.user_id}: ${user.transaction_count} транзакций за 24 часа`);
      });
      
      // Детальный анализ самого активного пользователя
      const mostActiveUser = frequentBalanceChanges[0];
      console.log(`\n🔬 ДЕТАЛЬНЫЙ АНАЛИЗ ПОЛЬЗОВАТЕЛЯ ${mostActiveUser.user_id}:`);
      
      const { data: userTransactions, error: userTxError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', mostActiveUser.user_id)
        .gte('created_at', yesterday.toISOString())
        .or('currency.eq.TON,amount_ton.gt.0')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (userTxError) {
        console.error('❌ Ошибка получения транзакций пользователя:', userTxError);
      } else if (userTransactions) {
        console.log(`📋 Последние ${userTransactions.length} TON транзакций:`);
        
        let balanceFlow: BalanceFlow[] = [];
        let suspiciousPatterns = 0;
        
        userTransactions.forEach((tx, index) => {
          const amount = parseFloat(tx.amount_ton || '0');
          const isDebit = amount < 0;
          const isCredit = amount > 0;
          
          console.log(`  ${index + 1}. ${new Date(tx.created_at).toLocaleString()}: ${amount > 0 ? '+' : ''}${amount} TON`);
          console.log(`     Тип: ${tx.type} | Описание: ${tx.description}`);
          
          // Ищем подозрительные паттерны
          if (index > 0) {
            const prevTx = userTransactions[index - 1];
            const prevAmount = parseFloat(prevTx.amount_ton || '0');
            const timeDiff = Math.abs(new Date(tx.created_at).getTime() - new Date(prevTx.created_at).getTime()) / 1000;
            
            // Паттерн: списание → зачисление той же суммы
            if (Math.abs(amount + prevAmount) < 0.000001 && timeDiff < 300) {
              console.log(`     🔴 ПОДОЗРИТЕЛЬНЫЙ ПАТТЕРН: Списание/зачисление ${Math.abs(amount)} TON с разницей ${timeDiff.toFixed(1)}с`);
              suspiciousPatterns++;
            }
          }
          
          if (tx.metadata?.tx_hash || tx.metadata?.ton_tx_hash) {
            console.log(`     TX Hash: ${tx.metadata.tx_hash || tx.metadata.ton_tx_hash}`);
          }
        });
        
        if (suspiciousPatterns > 0) {
          console.log(`\n⚠️ ОБНАРУЖЕНО ПОДОЗРИТЕЛЬНЫХ ПАТТЕРНОВ: ${suspiciousPatterns}`);
        }
      }
    } else {
      console.log('ℹ️ Пользователей с частыми изменениями баланса не найдено');
    }
    
    // 4. ПРОВЕРКА ДУБЛИРОВАНИЯ TX ХЕШЕЙ В СИСТЕМЕ
    console.log('\n4️⃣ ПРОВЕРКА ДУБЛИРОВАНИЯ TRANSACTION ХЕШЕЙ:');
    console.log('-' * 50);
    
    const { data: duplicateHashes, error: hashError } = await supabase
      .rpc('find_duplicate_tx_hashes', {
        since_date: yesterday.toISOString()
      });
    
    if (hashError) {
      console.log('ℹ️ RPC функция недоступна, выполняем альтернативный поиск...');
      
      // Альтернативный поиск дубликатов
      const { data: allTxWithHashes, error: altError } = await supabase
        .from('transactions')
        .select('id, user_id, amount_ton, metadata, created_at')
        .gte('created_at', yesterday.toISOString())
        .not('metadata->tx_hash', 'is', null);
      
      if (!altError && allTxWithHashes) {
        const hashMap = new Map();
        allTxWithHashes.forEach(tx => {
          const hash = tx.metadata?.tx_hash || tx.metadata?.ton_tx_hash;
          if (hash) {
            if (!hashMap.has(hash)) {
              hashMap.set(hash, []);
            }
            hashMap.get(hash).push(tx);
          }
        });
        
        let duplicatesFound = 0;
        for (const [hash, transactions] of hashMap) {
          if (transactions.length > 1) {
            duplicatesFound++;
            console.log(`🔴 ДУБЛИРОВАНИЕ TX HASH: ${hash}`);
            transactions.forEach(tx => {
              console.log(`  - ID ${tx.id}, User ${tx.user_id}, ${tx.amount_ton} TON, ${new Date(tx.created_at).toLocaleString()}`);
            });
          }
        }
        
        if (duplicatesFound === 0) {
          console.log('✅ Дублирования TX хешей не обнаружено');
        } else {
          console.log(`🔴 НАЙДЕНО ДУБЛИРОВАНИЙ: ${duplicatesFound}`);
        }
      }
    }
    
    // 5. АНАЛИЗ СОСТОЯНИЯ ПЛАНИРОВЩИКОВ
    console.log('\n5️⃣ ПРОВЕРКА СОСТОЯНИЯ ПЛАНИРОВЩИКОВ:');
    console.log('-' * 50);
    
    // Проверяем последние начисления от планировщиков
    const { data: schedulerActivity, error: schedulerError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (schedulerError) {
      console.error('❌ Ошибка проверки планировщиков:', schedulerError);
    } else if (schedulerActivity && schedulerActivity.length > 0) {
      const lastSchedulerTx = schedulerActivity[0];
      const timeSinceLastTx = Date.now() - new Date(lastSchedulerTx.created_at).getTime();
      const minutesSince = Math.floor(timeSinceLastTx / 1000 / 60);
      
      console.log(`📊 Последняя активность планировщика: ${minutesSince} минут назад`);
      
      if (minutesSince > 10) {
        console.log('⚠️ ВОЗМОЖНАЯ ПРОБЛЕМА: Планировщик не работает более 10 минут');
      } else {
        console.log('✅ Планировщики работают нормально');
      }
      
      // Анализируем источники транзакций планировщика
      const sources = new Map();
      schedulerActivity.forEach(tx => {
        const source = tx.metadata?.transaction_source || 'unknown';
        sources.set(source, (sources.get(source) || 0) + 1);
      });
      
      console.log('📈 Активность планировщиков:');
      for (const [source, count] of sources) {
        console.log(`  - ${source}: ${count} транзакций`);
      }
    } else {
      console.log('❌ КРИТИЧНО: Нет активности планировщиков за 24 часа!');
    }
    
    // 6. ИТОГОВАЯ ДИАГНОСТИКА
    console.log('\n6️⃣ ИТОГОВАЯ ДИАГНОСТИКА И РЕКОМЕНДАЦИИ:');
    console.log('=' * 50);
    
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log(`- TON депозитов за 24ч: ${recentDeposits?.length || 0}`);
    console.log(`- TON Boost транзакций за 24ч: ${recentBoostPurchases?.length || 0}`);
    console.log(`- Пользователей с высокой активностью: ${frequentBalanceChanges?.length || 0}`);
    
    console.log('\n🔍 ПОТЕНЦИАЛЬНЫЕ УЗКИЕ МЕСТА:');
    console.log('1. Проверить дедупликацию транзакций по TX hash');
    console.log('2. Анализировать временные интервалы между покупкой и депозитом TON Boost');
    console.log('3. Мониторить состояние планировщиков доходов');
    console.log('4. Проверить логику обновления балансов в BalanceManager');
    console.log('5. Анализировать WebSocket уведомления о изменениях баланса');
    
  } catch (error) {
    console.error('💥 КРИТИЧЕСКАЯ ОШИБКА в диагностике:', error);
  }
}

// Запускаем диагностику
diagnoseTonBalanceInconsistencies()
  .then(() => {
    console.log('\n✅ Диагностика завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Ошибка выполнения:', error);
    process.exit(1);
  });