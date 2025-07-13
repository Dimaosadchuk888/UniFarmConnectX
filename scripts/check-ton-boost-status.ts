#!/usr/bin/env tsx
/**
 * Проверка состояния TON Boost для пользователя 74
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function checkTonBoostStatus() {
  console.log('=== TON BOOST STATUS CHECK ===\n');
  
  // 1. Проверяем активные TON Boost пакеты
  const { data: boostPurchases, error: boostError } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('user_id', 74)
    .eq('currency', 'TON')
    .order('created_at', { ascending: false });
    
  console.log('1. TON Boost пакеты пользователя 74:');
  if (boostPurchases && boostPurchases.length > 0) {
    boostPurchases.forEach(p => {
      console.log(`   ID: ${p.id}, Пакет: ${p.package_id}, Статус: ${p.status}, Активен: ${p.is_active}`);
      console.log(`   Создан: ${p.created_at}, Начало: ${p.start_date}, Конец: ${p.end_date}`);
      console.log(`   ---`);
    });
  } else {
    console.log('   НЕТ TON BOOST ПАКЕТОВ');
  }
  
  // 2. Проверяем пользовательские поля ton_boost
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_active, ton_boost_package, ton_boost_rate, ton_boost_start, ton_boost_end')
    .eq('id', 74)
    .single();
    
  console.log('\n2. TON Boost поля в таблице users:');
  if (user) {
    console.log(`   balance_ton: ${user.balance_ton} TON`);
    console.log(`   ton_boost_active: ${user.ton_boost_active}`);
    console.log(`   ton_boost_package: ${user.ton_boost_package}`);
    console.log(`   ton_boost_rate: ${user.ton_boost_rate}`);
    console.log(`   ton_boost_start: ${user.ton_boost_start}`);
    console.log(`   ton_boost_end: ${user.ton_boost_end}`);
  }
  
  // 3. Проверяем транзакции TON
  const { data: tonTransactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .in('type', ['TON_BOOST_INCOME', 'TON_REWARD', 'ton_boost_income'])
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('\n3. TON транзакции (последние 10):');
  if (tonTransactions && tonTransactions.length > 0) {
    tonTransactions.forEach(tx => {
      console.log(`   ID: ${tx.id}, Тип: ${tx.type}, Сумма: ${tx.amount} ${tx.currency}`);
      console.log(`   Создана: ${tx.created_at}`);
    });
  } else {
    console.log('   НЕТ TON ТРАНЗАКЦИЙ (TON_BOOST_INCOME, TON_REWARD)');
  }
  
  // 4. Проверяем активных пользователей с TON boost
  const { data: activeBoostUsers, error: activeError } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_active, ton_boost_package, ton_boost_rate')
    .eq('ton_boost_active', true)
    .not('ton_boost_package', 'is', null);
    
  console.log(`\n4. Всего активных пользователей с TON Boost: ${activeBoostUsers?.length || 0}`);
  
  // 5. Проверяем последние farming транзакции для сравнения
  const { data: farmingTx, error: farmingError } = await supabase
    .from('transactions')
    .select('id, type, amount, currency, created_at')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(3);
    
  console.log('\n5. Последние UNI Farming транзакции (для сравнения):');
  if (farmingTx && farmingTx.length > 0) {
    farmingTx.forEach(tx => {
      console.log(`   ID: ${tx.id}, Сумма: ${tx.amount} ${tx.currency}, Время: ${tx.created_at}`);
    });
  }
  
  process.exit(0);
}

checkTonBoostStatus().catch(console.error);
