/**
 * Финальный тест исправленной логики TON Boost активации
 */

import { createClient } from '@supabase/supabase-js';

async function finalTestFix() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== ФИНАЛЬНЫЙ ТЕСТ ИСПРАВЛЕНИЯ ===');
  
  // 1. Состояние ДО покупки
  const { data: userBefore } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package, ton_boost_rate')
    .eq('id', 48)
    .single();
  
  console.log('\n1. СОСТОЯНИЕ ДО:');
  console.log('   TON:', userBefore.balance_ton);
  console.log('   Пакет:', userBefore.ton_boost_package);
  console.log('   Ставка:', userBefore.ton_boost_rate);
  
  // 2. Покупка Elite пакета
  console.log('\n2. ПОКУПКА ELITE ПАКЕТА:');
  
  const purchaseResponse = await fetch('http://localhost:3000/api/v2/boost/purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE2MTAzNzgsImV4cCI6MTc1MjIxNTE3OH0.v95q1-qqaPthRflbCtJqTAQEpvAgpDwmWzWyFbPQuoM'
    },
    body: JSON.stringify({
      user_id: '48',
      boost_id: '5', // Elite Boost (3% daily)
      payment_method: 'wallet'
    })
  });
  
  const result = await purchaseResponse.json();
  console.log('   Результат:', result.success ? 'УСПЕХ' : 'ОШИБКА');
  
  // Ждем завершения обработки
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 3. Состояние ПОСЛЕ покупки
  const { data: userAfter } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package, ton_boost_rate')
    .eq('id', 48)
    .single();
  
  console.log('\n3. СОСТОЯНИЕ ПОСЛЕ:');
  console.log('   TON:', userAfter.balance_ton);
  console.log('   Пакет:', userAfter.ton_boost_package);
  console.log('   Ставка:', userAfter.ton_boost_rate);
  
  // 4. Проверка критериев планировщика
  const isActive = userAfter.ton_boost_package && userAfter.ton_boost_package !== 0;
  const hasBalance = parseFloat(userAfter.balance_ton) >= 10;
  
  console.log('\n4. ПРОВЕРКА АКТИВАЦИИ:');
  console.log('   Пакет активен:', isActive ? 'ДА' : 'НЕТ');
  console.log('   Достаточно TON:', hasBalance ? 'ДА' : 'НЕТ');
  console.log('   Планировщик найдет:', (isActive && hasBalance) ? 'ДА' : 'НЕТ');
  
  if (isActive && hasBalance) {
    console.log('\n   🎯 ИСПРАВЛЕНИЕ УСПЕШНО!');
    console.log('   Планировщик начнет начисления TON каждые 5 минут');
    
    // Рассчитаем ожидаемые начисления
    const deposit = Math.max(0, parseFloat(userAfter.balance_ton) - 10);
    const dailyRate = userAfter.ton_boost_rate;
    const dailyIncome = deposit * dailyRate;
    const fiveMinIncome = dailyIncome / 288;
    
    console.log(`   - Депозит: ${deposit} TON`);
    console.log(`   - Ставка: ${(dailyRate * 100)}% в день`);
    console.log(`   - Доход за 5 мин: ${fiveMinIncome.toFixed(8)} TON`);
    
  } else {
    console.log('\n   ❌ Требуется дополнительная диагностика');
  }
  
  console.log('\n=== ТЕСТ ЗАВЕРШЕН ===');
}

finalTestFix().catch(console.error);