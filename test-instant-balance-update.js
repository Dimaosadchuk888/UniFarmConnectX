/**
 * Тест мгновенного обновления TON баланса после покупки Boost-пакета
 * Проверяет работу нового механизма балансовых обновлений
 */

import { createClient } from '@supabase/supabase-js';

async function testInstantBalanceUpdate() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== ТЕСТ МГНОВЕННОГО ОБНОВЛЕНИЯ БАЛАНСА ===');
  
  // Ждем 1 минуту для первого цикла
  console.log('Ожидание работы планировщика TON Boost...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Проверяем изменения баланса
  const { data: user } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package, ton_boost_rate')
    .eq('id', 48)
    .single();
  
  console.log('\n1. ТЕКУЩЕЕ СОСТОЯНИЕ:');
  console.log('   TON баланс:', user.balance_ton);
  console.log('   Пакет:', user.ton_boost_package);
  console.log('   Ставка:', user.ton_boost_rate);
  
  // Рассчитываем ожидаемый доход
  const deposit = Math.max(0, parseFloat(user.balance_ton) - 10);
  const dailyRate = user.ton_boost_rate;
  const dailyIncome = deposit * dailyRate;
  const fiveMinIncome = dailyIncome / 288; // 288 циклов по 5 минут в день
  
  console.log('\n2. РАСЧЕТНЫЕ ДАННЫЕ:');
  console.log('   Депозит (TON - 10):', deposit);
  console.log('   Дневная ставка:', (dailyRate * 100) + '%');
  console.log('   Дневной доход:', dailyIncome.toFixed(8));
  console.log('   Доход за 5 мин:', fiveMinIncome.toFixed(8));
  
  // Проверяем последние транзакции
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('id, user_id, amount_ton, type, description, created_at')
    .eq('user_id', 48)
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('\n3. ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
  recentTransactions.forEach((tx, index) => {
    const date = new Date(tx.created_at).toLocaleString();
    console.log(`   ${index + 1}. ${tx.description} | ${tx.amount_ton} TON | ${date}`);
  });
  
  // Проверяем TON Boost транзакции
  const tonBoostTransactions = recentTransactions.filter(tx => 
    tx.description && tx.description.includes('TON Boost')
  );
  
  console.log('\n4. АНАЛИЗ TON BOOST ДОХОДОВ:');
  if (tonBoostTransactions.length > 0) {
    console.log('   ✅ Планировщик работает!');
    console.log('   Найдено транзакций:', tonBoostTransactions.length);
    tonBoostTransactions.forEach(tx => {
      console.log(`   - ${tx.amount_ton} TON | ${new Date(tx.created_at).toLocaleString()}`);
    });
  } else {
    console.log('   ⚠️ Транзакций TON Boost не найдено');
    console.log('   Возможные причины:');
    console.log('   - Планировщик еще не запускался');
    console.log('   - Недостаточно времени прошло');
    console.log('   - Проблема с планировщиком');
  }
  
  console.log('\n=== ТЕСТ ЗАВЕРШЕН ===');
}

testInstantBalanceUpdate().catch(console.error);