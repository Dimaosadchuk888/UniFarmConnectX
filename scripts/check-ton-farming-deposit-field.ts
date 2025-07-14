/**
 * Проверка наличия поля ton_farming_deposit в таблице users
 */

import { supabase } from '../core/supabase.js';

async function checkField() {
  console.log('\n=== ПРОВЕРКА ПОЛЯ ton_farming_deposit ===\n');

  const { data: userData, error } = await supabase
    .from('users')
    .select('id, ton_farming_deposit')
    .eq('id', 74)
    .single();
    
  if (error) {
    console.log('❌ Поле ton_farming_deposit НЕ СУЩЕСТВУЕТ в таблице users');
    console.log('Ошибка:', error.message);
    console.log('\nНужно использовать вариант 2 - получение из ton_farming_data');
  } else {
    console.log('✅ Поле ton_farming_deposit СУЩЕСТВУЕТ');
    console.log('Значение для user 74:', userData?.ton_farming_deposit || 'NULL');
  }
}

checkField()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Ошибка:', error);
    process.exit(1);
  });