#!/usr/bin/env tsx
/**
 * Прямой тест TON Boost планировщика
 */

import { tonBoostIncomeScheduler } from '../modules/scheduler/tonBoostIncomeScheduler';
import { supabase } from '../core/supabase';

async function testTonBoostScheduler() {
  console.log('=== ПРЯМОЙ ТЕСТ TON BOOST ПЛАНИРОВЩИКА ===\n');
  
  // 1. Проверяем начальное состояние
  const { data: beforeTx, error: beforeError } = await supabase
    .from('transactions')
    .select('id')
    .or('type.eq.TON_BOOST_INCOME,type.eq.ton_boost_income')
    .order('created_at', { ascending: false })
    .limit(1);
    
  const lastTxId = beforeTx?.[0]?.id || 0;
  console.log('Последняя TON транзакция ID:', lastTxId);
  
  // 2. Запускаем планировщик
  console.log('\nЗапускаем TON Boost планировщик...');
  try {
    tonBoostIncomeScheduler.start();
    console.log('✅ Планировщик запущен успешно');
  } catch (error) {
    console.error('❌ ОШИБКА ЗАПУСКА:', error);
    process.exit(1);
  }
  
  // 3. Ждем обработки
  console.log('\nОжидаем 15 секунд для обработки...');
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // 4. Останавливаем планировщик
  tonBoostIncomeScheduler.stop();
  console.log('\nПланировщик остановлен.');
  
  // 5. Проверяем новые транзакции
  const { data: afterTx, error: afterError } = await supabase
    .from('transactions')
    .select('*')
    .or('type.eq.TON_BOOST_INCOME,type.eq.ton_boost_income')
    .gt('id', lastTxId)
    .order('created_at', { ascending: false });
    
  if (afterTx && afterTx.length > 0) {
    console.log(`\n✅ УСПЕХ! ${afterTx.length} новых TON транзакций создано:`);
    afterTx.forEach(tx => {
      console.log(`  - User ${tx.user_id}: ${tx.amount} ${tx.currency}, Тип: ${tx.type}`);
      console.log(`    Описание: ${tx.description}`);
    });
  } else {
    console.log('\n❌ НЕТ новых TON транзакций');
  }
  
  // 6. Проверяем изменения балансов
  const { data: user74, error: u74Error } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_active, ton_boost_package')
    .eq('id', 74)
    .single();
    
  if (user74) {
    console.log(`\nПользователь 74:`);
    console.log(`  Баланс TON: ${user74.balance_ton}`);
    console.log(`  TON Boost активен: ${user74.ton_boost_active}`);
    console.log(`  Пакет: ${user74.ton_boost_package}`);
  }
  
  process.exit(0);
}

// Запускаем тест
testTonBoostScheduler().catch(error => {
  console.error('КРИТИЧЕСКАЯ ОШИБКА:', error);
  process.exit(1);
});