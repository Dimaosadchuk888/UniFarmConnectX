/**
 * Диагностика проблемы с обновлением users.ton_boost_package
 */

import { createClient } from '@supabase/supabase-js';

async function debugDbUpdate() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== ДИАГНОСТИКА ОБНОВЛЕНИЯ БД ===');
  
  // 1. Проверка текущего состояния
  const { data: current } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package, ton_boost_rate')
    .eq('id', 48)
    .single();
  
  console.log('\n1. ТЕКУЩЕЕ СОСТОЯНИЕ:');
  console.log('   ID:', current.id);
  console.log('   TON:', current.balance_ton);
  console.log('   Пакет:', current.ton_boost_package);
  console.log('   Ставка:', current.ton_boost_rate);
  
  // 2. Прямое обновление через Supabase
  console.log('\n2. ПРЯМОЕ ОБНОВЛЕНИЕ:');
  const { data: updateResult, error: updateError } = await supabase
    .from('users')
    .update({ 
      ton_boost_package: 3, // Advanced Boost
      ton_boost_rate: 0.02  // 2% daily
    })
    .eq('id', 48)
    .select('id, ton_boost_package, ton_boost_rate');
  
  if (updateError) {
    console.log('   ❌ Ошибка обновления:', updateError.message);
    console.log('   Детали:', updateError);
  } else {
    console.log('   ✅ Обновление успешно:', updateResult);
  }
  
  // 3. Проверка после обновления
  const { data: after } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package, ton_boost_rate')
    .eq('id', 48)
    .single();
  
  console.log('\n3. ПОСЛЕ ОБНОВЛЕНИЯ:');
  console.log('   ID:', after.id);
  console.log('   TON:', after.balance_ton);
  console.log('   Пакет:', after.ton_boost_package);
  console.log('   Ставка:', after.ton_boost_rate);
  
  // 4. Проверка критериев планировщика
  const isActive = after.ton_boost_package && after.ton_boost_package !== 0;
  const hasBalance = parseFloat(after.balance_ton) >= 10;
  
  console.log('\n4. КРИТЕРИИ ПЛАНИРОВЩИКА:');
  console.log('   Пакет активен:', isActive);
  console.log('   Достаточно TON:', hasBalance);
  console.log('   Будет обработан:', isActive && hasBalance);
  
  if (isActive && hasBalance) {
    console.log('\n   🎯 ПРИНУДИТЕЛЬНАЯ АКТИВАЦИЯ УСПЕШНА!');
    console.log('   Планировщик должен начать работу');
  }
  
  console.log('\n=== ДИАГНОСТИКА ЗАВЕРШЕНА ===');
}

debugDbUpdate().catch(console.error);