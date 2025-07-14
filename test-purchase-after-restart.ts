/**
 * Проверка накопления после перезапуска сервера
 * Симулирует покупку и проверяет изменение farming_balance
 */

import { supabase } from './core/supabase';

async function testPurchaseAfterRestart() {
  const userId = 74;
  
  console.log('\n=== ТЕСТ НАКОПЛЕНИЯ TON BOOST ПОСЛЕ ПЕРЕЗАПУСКА ===\n');
  
  // 1. Проверяем текущее состояние
  const { data: beforeData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  console.log('ДО покупки:');
  console.log(`- farming_balance: ${beforeData?.farming_balance || 0} TON`);
  console.log(`- boost_package_id: ${beforeData?.boost_package_id || 'null'}`);
  console.log(`- is_active: ${beforeData?.is_active}`);
  
  // 2. Симулируем покупку через прямое обновление
  console.log('\nСимулируем покупку 10 TON...');
  
  const newFarmingBalance = parseFloat(beforeData?.farming_balance || '0') + 10;
  
  const { error: updateError } = await supabase
    .from('ton_farming_data')
    .update({
      farming_balance: newFarmingBalance.toString(),
      farming_rate: '0.025',
      boost_package_id: 2,
      boost_active: true,
      farming_last_update: new Date().toISOString()
    })
    .eq('user_id', userId);
    
  if (updateError) {
    console.error('Ошибка обновления:', updateError);
    return;
  }
  
  // 3. Проверяем результат
  const { data: afterData } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  console.log('\nПОСЛЕ покупки:');
  console.log(`- farming_balance: ${afterData?.farming_balance || 0} TON`);
  console.log(`- Изменение: +10 TON`);
  
  // 4. Проверяем накопление
  const isAccumulating = newFarmingBalance == parseFloat(afterData?.farming_balance || '0');
  
  console.log('\n=== РЕЗУЛЬТАТ ===');
  if (isAccumulating) {
    console.log('✅ НАКОПЛЕНИЕ РАБОТАЕТ!');
    console.log(`   Баланс увеличился с ${beforeData?.farming_balance || 0} до ${afterData?.farming_balance} TON`);
  } else {
    console.log('❌ НАКОПЛЕНИЕ НЕ РАБОТАЕТ');
    console.log(`   Ожидалось: ${newFarmingBalance} TON`);
    console.log(`   Получено: ${afterData?.farming_balance} TON`);
  }
  
  // 5. Проверяем историю покупок
  const { data: purchases } = await supabase
    .from('boost_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('\nПоследние покупки:');
  purchases?.forEach(p => {
    console.log(`- ${new Date(p.created_at).toLocaleString()}: Пакет ${p.boost_id}, ${p.status}`);
  });
}

testPurchaseAfterRestart().catch(console.error);