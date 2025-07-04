/**
 * Восстановление TON баланса и принудительная активация TON Boost
 */

import { createClient } from '@supabase/supabase-js';

async function restoreTonBalance() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== ВОССТАНОВЛЕНИЕ И АКТИВАЦИЯ ===');
  
  const userId = 48;
  
  // 1. Восстановление баланса TON
  console.log('\n1. ВОССТАНОВЛЕНИЕ БАЛАНСА:');
  const { data: restoration, error: restoreError } = await supabase
    .from('users')
    .update({ 
      balance_ton: 900, // Восстанавливаем изначальный баланс
      ton_boost_package: 3, // Активируем Advanced Boost
      ton_boost_rate: 0.02 // 2% дневная ставка
    })
    .eq('id', userId)
    .select('id, balance_ton, ton_boost_package, ton_boost_rate');
  
  if (restoreError) {
    console.log('   ❌ Ошибка восстановления:', restoreError.message);
    return;
  }
  
  console.log('   ✅ Баланс восстановлен:', restoration[0]);
  
  // 2. Проверка критериев планировщика
  const user = restoration[0];
  const isActive = user.ton_boost_package && user.ton_boost_package !== 0;
  const hasBalance = parseFloat(user.balance_ton) >= 10;
  
  console.log('\n2. ПРОВЕРКА КРИТЕРИЕВ:');
  console.log('   Пакет активен:', isActive);
  console.log('   Достаточно TON:', hasBalance);
  console.log('   Планировщик найдет:', isActive && hasBalance);
  
  if (isActive && hasBalance) {
    // Рассчитаем ожидаемые начисления
    const deposit = Math.max(0, parseFloat(user.balance_ton) - 10);
    const dailyRate = user.ton_boost_rate;
    const dailyIncome = deposit * dailyRate;
    const fiveMinIncome = dailyIncome / 288;
    
    console.log('\n3. РАСЧЕТЫ ДОХОДА:');
    console.log(`   Депозит: ${deposit} TON`);
    console.log(`   Дневная ставка: ${(dailyRate * 100)}%`);
    console.log(`   Дневной доход: ${dailyIncome.toFixed(6)} TON`);
    console.log(`   Доход за 5 мин: ${fiveMinIncome.toFixed(8)} TON`);
    
    console.log('\n   🎯 АКТИВАЦИЯ ЗАВЕРШЕНА!');
    console.log('   Планировщик начнет начисления через 5 минут');
  }
  
  console.log('\n=== ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО ===');
}

restoreTonBalance().catch(console.error);