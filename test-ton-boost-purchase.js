/**
 * Тестовый скрипт для проверки покупки TON Boost
 * от имени пользователя 50
 */

import { createClient } from '@supabase/supabase-js';

async function testTonBoostPurchase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== ТЕСТ ПОКУПКИ TON BOOST ===');
  
  const userId = '48';
  
  // 1. Сброс пользователя к начальному состоянию
  console.log('\n1. СБРОС К НАЧАЛЬНОМУ СОСТОЯНИЮ:');
  await supabase
    .from('users')
    .update({ 
      ton_boost_package: 0,
      ton_boost_rate: 0
    })
    .eq('id', userId);
  console.log('   Пользователь сброшен');

  // 2. Состояние ДО покупки
  const { data: userBefore } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package, ton_boost_rate')
    .eq('id', userId)
    .single();
  
  console.log('\n2. СОСТОЯНИЕ ДО:');
  console.log('   TON:', userBefore.balance_ton);
  console.log('   Пакет:', userBefore.ton_boost_package);
  console.log('   Ставка:', userBefore.ton_boost_rate);
  
  // 3. Покупка Advanced пакета (ID=3, 2% daily)
  console.log('\n3. ПОКУПКА ADVANCED ПАКЕТА:');
  
  const purchaseResponse = await fetch('http://localhost:3000/api/v2/boost/purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ4LCJ0ZWxlZ3JhbV9pZCI6NDgsInVzZXJuYW1lIjoiZGVtb191c2VyIiwicmVmX2NvZGUiOiJSRUZfMTc1MDk1MjU3NjYxNF90OTM4dnMiLCJpYXQiOjE3NTE2MTAzNzgsImV4cCI6MTc1MjIxNTE3OH0.v95q1-qqaPthRflbCtJqTAQEpvAgpDwmWzWyFbPQuoM'
    },
    body: JSON.stringify({
      user_id: '48',
      boost_id: '3', // Advanced Boost
      payment_method: 'wallet'
    })
  });
  
  const result = await purchaseResponse.json();
  console.log('   Статус:', result.success ? 'УСПЕХ' : 'ОШИБКА');
  console.log('   Сообщение:', result.message);
  
  // Ждем завершения обработки
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 4. Состояние ПОСЛЕ покупки
  const { data: userAfter } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package, ton_boost_rate')
    .eq('id', userId)
    .single();
  
  console.log('\n4. СОСТОЯНИЕ ПОСЛЕ:');
  console.log('   TON:', userAfter.balance_ton);
  console.log('   Пакет:', userAfter.ton_boost_package);
  console.log('   Ставка:', userAfter.ton_boost_rate);
  
  // 5. Анализ активации
  const balanceChange = parseFloat(userBefore.balance_ton) - parseFloat(userAfter.balance_ton);
  const isActivated = userAfter.ton_boost_package && userAfter.ton_boost_package !== 0;
  const hasCorrectRate = userAfter.ton_boost_rate === 0.02;
  
  console.log('\n5. АНАЛИЗ АКТИВАЦИИ:');
  console.log('   TON списано:', balanceChange);
  console.log('   Пакет активирован:', isActivated ? 'ДА' : 'НЕТ');
  console.log('   Правильная ставка:', hasCorrectRate ? 'ДА' : 'НЕТ');
  
  if (isActivated && hasCorrectRate) {
    console.log('\n   🎯 ПОКУПКА И АКТИВАЦИЯ УСПЕШНЫ!');
    console.log('   Планировщик начнет начисления через 5 минут');
    
    // Рассчитаем ожидаемые начисления
    const deposit = Math.max(0, parseFloat(userAfter.balance_ton) - 10);
    const dailyIncome = deposit * 0.02;
    const fiveMinIncome = dailyIncome / 288;
    
    console.log(`   - Депозит: ${deposit} TON`);
    console.log(`   - Дневной доход: ${dailyIncome.toFixed(6)} TON`);
    console.log(`   - Доход за 5 мин: ${fiveMinIncome.toFixed(8)} TON`);
    
  } else {
    console.log('\n   ❌ ПРОБЛЕМА С АКТИВАЦИЕЙ');
    console.log('   Требуется дополнительная диагностика');
  }
  
  // 6. Проверка транзакций
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('id, type, description, amount_ton, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);
  
  console.log('\n6. ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
  recentTransactions.forEach((tx, index) => {
    const date = new Date(tx.created_at).toLocaleString();
    console.log(`   ${index + 1}. ${tx.description} | ${tx.amount_ton || 0} TON | ${date}`);
  });
  
  console.log('\n=== ТЕСТ ЗАВЕРШЕН ===');
}

testTonBoostPurchase().catch(console.error);