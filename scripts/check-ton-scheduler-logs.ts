#!/usr/bin/env tsx
/**
 * Проверка логов и состояния TON Boost планировщика
 */

import { supabase } from '../core/supabase';
import { logger } from '../core/logger';

async function checkTonSchedulerLogs() {
  console.log('=== ПРОВЕРКА TON BOOST ПЛАНИРОВЩИКА ===\n');
  
  // 1. Проверяем недавние транзакции всех типов для поиска TON активности
  const { data: recentTx, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .or('currency.eq.TON,type.eq.TON_BOOST_INCOME,type.eq.ton_boost_income')
    .order('created_at', { ascending: false })
    .limit(20);
    
  console.log('1. Недавние транзакции связанные с TON:');
  if (recentTx && recentTx.length > 0) {
    recentTx.forEach(tx => {
      console.log(`   ${tx.created_at}: User ${tx.user_id}, Тип: ${tx.type}, Сумма: ${tx.amount} ${tx.currency}`);
      console.log(`   Описание: ${tx.description}`);
      console.log(`   ---`);
    });
  } else {
    console.log('   НЕТ TON ТРАНЗАКЦИЙ');
  }
  
  // 2. Проверяем что возвращает TonFarmingRepository для активных пользователей
  console.log('\n2. Имитация вызова getActiveBoostUsers():');
  
  // Сначала проверяем ton_farming_data
  const { data: tonFarmingData, error: tfdError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('boost_active', true);
    
  if (tfdError?.code === '42P01') {
    console.log('   Таблица ton_farming_data не существует, используем fallback');
    
    // Fallback - проверяем users
    const { data: activeUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username, balance_ton, ton_boost_active, ton_boost_package, ton_boost_rate')
      .eq('ton_boost_active', true);
      
    console.log(`   Найдено активных пользователей в users: ${activeUsers?.length || 0}`);
    if (activeUsers && activeUsers.length > 0) {
      activeUsers.slice(0, 3).forEach(u => {
        console.log(`   User ${u.id}: package=${u.ton_boost_package}, rate=${u.ton_boost_rate}, balance=${u.balance_ton}`);
      });
    }
  } else if (tonFarmingData) {
    console.log(`   Найдено активных в ton_farming_data: ${tonFarmingData.length}`);
  }
  
  // 3. Проверяем boost_purchases на случай если планировщик использует другой метод
  const { data: boostPurchases, error: bpError } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('currency', 'TON')
    .eq('status', 'confirmed')
    .eq('is_active', true);
    
  console.log(`\n3. Активные покупки в boost_purchases: ${boostPurchases?.length || 0}`);
  
  // 4. Эмулируем расчет дохода для пользователя 74
  const { data: user74, error: u74Error } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();
    
  if (user74 && user74.ton_boost_active) {
    console.log('\n4. Эмуляция расчета дохода для User 74:');
    console.log(`   Пакет: ${user74.ton_boost_package}, Ставка: ${user74.ton_boost_rate}`);
    
    const userDeposit = Math.max(0, parseFloat(user74.balance_ton || '0') - 10);
    const dailyRate = parseFloat(user74.ton_boost_rate || '0.01');
    const dailyIncome = userDeposit * dailyRate;
    const fiveMinuteIncome = dailyIncome / 288;
    
    console.log(`   Депозит (balance_ton - 10): ${userDeposit.toFixed(6)} TON`);
    console.log(`   Дневной доход (${dailyRate * 100}%): ${dailyIncome.toFixed(6)} TON`);
    console.log(`   Доход за 5 минут: ${fiveMinuteIncome.toFixed(6)} TON`);
    
    if (fiveMinuteIncome <= 0.0001) {
      console.log(`   ⚠️ Доход слишком мал, планировщик пропустит`);
    }
  }
  
  process.exit(0);
}

checkTonSchedulerLogs().catch(console.error);
