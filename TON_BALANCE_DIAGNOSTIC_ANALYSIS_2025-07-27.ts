#!/usr/bin/env tsx
/**
 * Диагностика системы пополнения и списания TON-баланса
 * 27 июля 2025 - Анализ без изменений в коде
 */

import { supabase } from './core/supabase';

interface User {
  id: number;
  username?: string;
  balance_ton: number;
  ton_boost_package?: string;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: number;
  user_id: number;
  type: string;
  amount: string;
  currency: string;
  status: string;
  description?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  tx_hash_unique?: string;
}

interface TonFarmingData {
  id: number;
  user_id: string;
  farming_balance: number;
  farming_rate: number;
  package_id?: number;
  last_claim_at?: string;
  created_at: string;
  updated_at: string;
}

async function analyzeTonBalanceSystem() {
  console.log('🔎 ДИАГНОСТИКА СИСТЕМЫ TON-БАЛАНСА - НАЧАЛО АНАЛИЗА');
  console.log('=' .repeat(80));

  try {
    // 1. Поиск пользователей с недавними TON операциями
    console.log('\n📊 1. АНАЛИЗ ПОЛЬЗОВАТЕЛЕЙ С TON ОПЕРАЦИЯМИ');
    const recentTonUsers = await findUsersWithRecentTonOperations();

    // 2. Детальный анализ каждого пользователя
    for (const user of recentTonUsers.slice(0, 3)) {
      console.log(`\n🔍 2. ДЕТАЛЬНЫЙ АНАЛИЗ ПОЛЬЗОВАТЕЛЯ ${user.id}`);
      await analyzeUserTonOperations(user.id);
    }

    // 3. Анализ паттернов и аномалий
    console.log('\n🚨 3. ПОИСК АНОМАЛИЙ И ПАТТЕРНОВ');
    await findTonBalanceAnomalies();

    // 4. Проверка целостности данных
    console.log('\n✅ 4. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ');
    await validateTonDataIntegrity();

  } catch (error) {
    console.error('❌ Ошибка при выполнении диагностики:', error);
  }

  console.log('\n' + '=' .repeat(80));
  console.log('🔎 ДИАГНОСТИКА ЗАВЕРШЕНА');
}

async function findUsersWithRecentTonOperations() {
  console.log('   Поиск пользователей с TON операциями за последние 7 дней...');
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('user_id, created_at, type, amount, currency')
    .eq('currency', 'TON')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false });

  if (txError) {
    console.error('   ❌ Ошибка загрузки транзакций:', txError);
    return [];
  }

  const userIds = [...new Set(transactions?.map(t => t.user_id) || [])];
  console.log(`   📈 Найдено ${userIds.length} уникальных пользователей с TON операциями`);

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username, balance_ton, ton_boost_package, created_at')
    .in('id', userIds.slice(0, 10))
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('   ❌ Ошибка загрузки пользователей:', usersError);
    return [];
  }

  users?.forEach(user => {
    const userTxCount = transactions?.filter(t => t.user_id === user.id).length || 0;
    console.log(`   👤 User ${user.id}: TON баланс ${user.balance_ton}, ${userTxCount} операций, пакет: ${user.ton_boost_package || 'нет'}`);
  });

  return users || [];
}

async function analyzeUserTonOperations(userId: number) {
  console.log(`   📋 Анализ операций пользователя ${userId}...`);

  // Получаем данные пользователя
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error(`   ❌ Ошибка загрузки пользователя ${userId}:`, userError);
    return;
  }

  console.log(`   💰 Текущий TON баланс: ${user.balance_ton}`);
  console.log(`   📦 TON Boost пакет: ${user.ton_boost_package || 'не активен'}`);

  // Получаем все TON транзакции пользователя за последние 3 дня
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'TON')
    .gte('created_at', threeDaysAgo)
    .order('created_at', { ascending: true });

  if (txError) {
    console.error(`   ❌ Ошибка загрузки транзакций для ${userId}:`, txError);
    return;
  }

  console.log(`   📊 Найдено ${transactions?.length || 0} TON транзакций за 3 дня:`);

  let currentBalance = 0;
  transactions?.forEach((tx, index) => {
    const amount = parseFloat(tx.amount);
    const isCredit = ['TON_DEPOSIT', 'FARMING_REWARD'].includes(tx.type);
    const isDebit = ['BOOST_PURCHASE', 'WITHDRAWAL'].includes(tx.type);
    
    if (isCredit) currentBalance += amount;
    if (isDebit) currentBalance -= amount;

    console.log(`   ${index + 1}. [${tx.created_at.slice(11, 19)}] ${tx.type}: ${isDebit ? '-' : '+'}${amount} TON (баланс: ~${currentBalance.toFixed(6)}) - ${tx.description || 'без описания'}`);
    
    if (tx.metadata) {
      try {
        const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata) : tx.metadata;
        if (metadata.tx_hash || metadata.ton_tx_hash) {
          console.log(`      🔗 TX Hash: ${metadata.tx_hash || metadata.ton_tx_hash}`);
        }
        if (metadata.package_id) {
          console.log(`      📦 Package ID: ${metadata.package_id}`);
        }
      } catch (e) {
        console.log(`      📝 Metadata: ${JSON.stringify(tx.metadata).slice(0, 100)}`);
      }
    }
  });

  // Проверка TON Farming данных
  const { data: tonFarming, error: farmingError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId.toString());

  if (!farmingError && tonFarming?.length) {
    console.log(`   🌱 TON Farming данные:`);
    tonFarming.forEach(farm => {
      console.log(`      Баланс фарминга: ${farm.farming_balance} TON, ставка: ${farm.farming_rate}`);
      console.log(`      Последний клейм: ${farm.last_claim_at || 'никогда'}`);
    });
  }

  // Анализ паттернов
  await analyzeTransactionPatterns(transactions || [], userId);
}

async function analyzeTransactionPatterns(transactions: Transaction[], userId: number) {
  console.log(`   🔍 АНАЛИЗ ПАТТЕРНОВ для пользователя ${userId}:`);

  // Поиск дублирующихся транзакций
  const duplicates = findDuplicateTransactions(transactions);
  if (duplicates.length > 0) {
    console.log(`   ⚠️  Найдено ${duplicates.length} потенциальных дублей:`);
    duplicates.forEach(dup => {
      console.log(`      Дубль: ${dup.type} ${dup.amount} TON в ${dup.created_at}`);
    });
  }

  // Поиск быстрых возвратов средств
  const refunds = findQuickRefunds(transactions);
  if (refunds.length > 0) {
    console.log(`   🔄 Найдено ${refunds.length} быстрых возвратов:`);
    refunds.forEach(refund => {
      console.log(`      Возврат: ${refund.debit.type} -${refund.debit.amount} → ${refund.credit.type} +${refund.credit.amount} (интервал: ${refund.timeDiff}мин)`);
    });
  }

  // Поиск аномальных сумм
  const anomalies = findAmountAnomalies(transactions);
  if (anomalies.length > 0) {
    console.log(`   📊 Найдено ${anomalies.length} аномальных сумм:`);
    anomalies.forEach(anomaly => {
      console.log(`      Аномалия: ${anomaly.type} ${anomaly.amount} TON - ${anomaly.reason}`);
    });
  }
}

function findDuplicateTransactions(transactions: Transaction[]): Transaction[] {
  const seen = new Map();
  const duplicates: Transaction[] = [];

  transactions.forEach(tx => {
    const key = `${tx.type}-${tx.amount}-${tx.user_id}`;
    const timeKey = new Date(tx.created_at).getTime();
    
    if (seen.has(key)) {
      const prevTime = seen.get(key);
      if (Math.abs(timeKey - prevTime) < 60000) { // В пределах минуты
        duplicates.push(tx);
      }
    } else {
      seen.set(key, timeKey);
    }
  });

  return duplicates;
}

function findQuickRefunds(transactions: Transaction[]): any[] {
  const refunds: any[] = [];
  
  for (let i = 0; i < transactions.length - 1; i++) {
    const current = transactions[i];
    const next = transactions[i + 1];
    
    const isDebitCredit = 
      (['BOOST_PURCHASE', 'WITHDRAWAL'].includes(current.type) && 
       ['FARMING_REWARD', 'TON_DEPOSIT'].includes(next.type)) ||
      (['BOOST_PURCHASE', 'WITHDRAWAL'].includes(next.type) && 
       ['FARMING_REWARD', 'TON_DEPOSIT'].includes(current.type));
    
    if (isDebitCredit && current.amount === next.amount) {
      const timeDiff = Math.abs(new Date(next.created_at).getTime() - new Date(current.created_at).getTime()) / (1000 * 60);
      if (timeDiff < 30) { // В пределах 30 минут
        refunds.push({
          debit: ['BOOST_PURCHASE', 'WITHDRAWAL'].includes(current.type) ? current : next,
          credit: ['FARMING_REWARD', 'TON_DEPOSIT'].includes(current.type) ? current : next,
          timeDiff: timeDiff.toFixed(1)
        });
      }
    }
  }
  
  return refunds;
}

function findAmountAnomalies(transactions: Transaction[]): any[] {
  const anomalies: any[] = [];
  const amounts = transactions.map(tx => parseFloat(tx.amount));
  
  transactions.forEach(tx => {
    const amount = parseFloat(tx.amount);
    
    // Очень малые суммы (меньше 0.001)
    if (amount < 0.001 && tx.type !== 'FARMING_REWARD') {
      anomalies.push({
        ...tx,
        reason: 'Очень малая сумма для типа операции'
      });
    }
    
    // Очень большие суммы (больше 10 TON)
    if (amount > 10) {
      anomalies.push({
        ...tx,
        reason: 'Необычно большая сумма'
      });
    }
    
    // Точные совпадения сумм в разных операциях
    const exactMatches = transactions.filter(t => 
      t.id !== tx.id && 
      t.amount === tx.amount && 
      t.type !== tx.type
    );
    
    if (exactMatches.length > 0) {
      anomalies.push({
        ...tx,
        reason: `Точное совпадение суммы с операцией ${exactMatches[0].type}`
      });
    }
  });
  
  return anomalies;
}

async function findTonBalanceAnomalies() {
  console.log('   🚨 Поиск системных аномалий...');

  // Поиск пользователей с отрицательным балансом
  const { data: negativeBalance, error: negError } = await supabase
    .from('users')
    .select('id, username, balance_ton')
    .lt('balance_ton', 0);

  if (negativeBalance?.length) {
    console.log(`   ⚠️  ${negativeBalance.length} пользователей с отрицательным TON балансом:`);
    negativeBalance.forEach(user => {
      console.log(`      User ${user.id}: ${user.balance_ton} TON`);
    });
  }

  // Поиск пользователей с очень большими балансами
  const { data: highBalance, error: highError } = await supabase
    .from('users')
    .select('id, username, balance_ton')
    .gt('balance_ton', 100);

  if (highBalance?.length) {
    console.log(`   💰 ${highBalance.length} пользователей с балансом > 100 TON:`);
    highBalance.forEach(user => {
      console.log(`      User ${user.id}: ${user.balance_ton} TON`);
    });
  }

  // Поиск pending транзакций
  const { data: pendingTx, error: pendingError } = await supabase
    .from('transactions')
    .select('*')
    .eq('currency', 'TON')
    .eq('status', 'pending')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (pendingTx?.length) {
    console.log(`   ⏳ ${pendingTx.length} pending TON транзакций за 24ч:`);
    pendingTx.forEach(tx => {
      console.log(`      ${tx.type}: ${tx.amount} TON (User ${tx.user_id}) - ${tx.created_at}`);
    });
  }
}

async function validateTonDataIntegrity() {
  console.log('   ✅ Проверка целостности данных...');

  // Проверка суммарного баланса vs транзакций для топ-пользователей
  const { data: topUsers, error: topError } = await supabase
    .from('users')
    .select('id, balance_ton')
    .gt('balance_ton', 0.1)
    .order('balance_ton', { ascending: false })
    .limit(5);

  if (topUsers?.length) {
    console.log('   📊 Проверка соответствия баланса и транзакций для топ-пользователей:');
    
    for (const user of topUsers) {
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('type, amount, currency')
        .eq('user_id', user.id)
        .eq('currency', 'TON')
        .eq('status', 'completed');

      if (!txError && transactions) {
        let calculatedBalance = 0;
        transactions.forEach(tx => {
          const amount = parseFloat(tx.amount);
          if (['TON_DEPOSIT', 'FARMING_REWARD'].includes(tx.type)) {
            calculatedBalance += amount;
          } else if (['BOOST_PURCHASE', 'WITHDRAWAL'].includes(tx.type)) {
            calculatedBalance -= amount;
          }
        });

        const difference = Math.abs(user.balance_ton - calculatedBalance);
        const status = difference < 0.01 ? '✅' : '⚠️';
        
        console.log(`      ${status} User ${user.id}: DB баланс ${user.balance_ton} vs расчетный ${calculatedBalance.toFixed(6)} (разница: ${difference.toFixed(6)})`);
      }
    }
  }
}

// Запуск диагностики
analyzeTonBalanceSystem()
  .then(() => {
    console.log('\n🎯 Диагностика завершена успешно');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Критическая ошибка диагностики:', error);
    process.exit(1);
  });