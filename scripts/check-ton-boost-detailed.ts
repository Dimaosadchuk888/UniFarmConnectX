#!/usr/bin/env tsx
/**
 * Детальная проверка TON Boost
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function checkTonBoostDetailed() {
  console.log('=== ДЕТАЛЬНАЯ ПРОВЕРКА TON BOOST ===\n');
  
  // 1. Детальная информация о пользователе 74
  const { data: user74, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
    
  console.log('1. Полная информация пользователя 74:');
  console.log(`   ID: ${user74?.id}`);
  console.log(`   balance_ton: ${user74?.balance_ton}`);
  console.log(`   ton_boost_active: ${user74?.ton_boost_active}`);
  console.log(`   ton_boost_package: ${user74?.ton_boost_package}`);
  console.log(`   ton_boost_rate: ${user74?.ton_boost_rate}`);
  console.log(`   ton_boost_start: ${user74?.ton_boost_start}`);
  console.log(`   ton_boost_end: ${user74?.ton_boost_end}`);
  
  // 2. Проверяем таблицу ton_farming_data
  const { data: tonFarmingData, error: tonFarmingError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', 74);
    
  console.log('\n2. Данные в ton_farming_data:');
  if (tonFarmingError) {
    console.log(`   ОШИБКА: ${tonFarmingError.message}`);
  } else if (tonFarmingData && tonFarmingData.length > 0) {
    console.log(`   Найдено записей: ${tonFarmingData.length}`);
    tonFarmingData.forEach(d => {
      console.log(`   User ${d.user_id}: active=${d.ton_farming_active}, deposit=${d.ton_farming_deposit}, rate=${d.ton_farming_rate}`);
    });
  } else {
    console.log('   НЕТ ДАННЫХ в ton_farming_data');
  }
  
  // 3. Проверяем транзакции TON для ВСЕХ пользователей
  const { data: allTonTx, error: allTxError } = await supabase
    .from('transactions')
    .select('*')
    .in('type', ['TON_BOOST_INCOME', 'TON_REWARD', 'ton_boost_income'])
    .order('created_at', { ascending: false })
    .limit(20);
    
  console.log('\n3. TON транзакции ВСЕХ пользователей (последние 20):');
  if (allTonTx && allTonTx.length > 0) {
    allTonTx.forEach(tx => {
      console.log(`   User ${tx.user_id}: ID ${tx.id}, Тип: ${tx.type}, Сумма: ${tx.amount} ${tx.currency}, Время: ${tx.created_at}`);
    });
  } else {
    console.log('   НЕТ TON ТРАНЗАКЦИЙ В СИСТЕМЕ ВООБЩЕ');
  }
  
  // 4. Проверяем активных пользователей с TON boost детально
  const { data: activeUsers, error: activeError } = await supabase
    .from('users')
    .select('id, username, balance_ton, ton_boost_active, ton_boost_package, ton_boost_rate')
    .eq('ton_boost_active', true)
    .not('ton_boost_package', 'is', null)
    .limit(5);
    
  console.log('\n4. Активные пользователи с TON Boost (первые 5):');
  if (activeUsers && activeUsers.length > 0) {
    activeUsers.forEach(u => {
      console.log(`   User ${u.id} (${u.username}): package=${u.ton_boost_package}, rate=${u.ton_boost_rate}, balance_ton=${u.balance_ton}`);
    });
  }
  
  // 5. Проверяем таблицу boost_purchases для активных пакетов
  const { data: activeBoosts, error: boostError } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('currency', 'TON')
    .eq('is_active', true)
    .limit(5);
    
  console.log('\n5. Активные TON Boost покупки (первые 5):');
  if (activeBoosts && activeBoosts.length > 0) {
    activeBoosts.forEach(b => {
      console.log(`   User ${b.user_id}: package=${b.package_id}, status=${b.status}, start=${b.start_date}`);
    });
  } else {
    console.log('   НЕТ АКТИВНЫХ TON BOOST ПОКУПОК');
  }
  
  // 6. Проверяем последние логи планировщика
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  console.log('\n6. Время проверки планировщика:');
  console.log(`   Текущее время: ${now.toISOString()}`);
  console.log(`   Должен был запуститься после: ${fiveMinutesAgo.toISOString()}`);
  
  process.exit(0);
}

checkTonBoostDetailed().catch(console.error);
