import { supabase } from '../core/supabase';

async function checkFieldMismatch() {
  console.log('\n=== АНАЛИЗ НЕСООТВЕТСТВИЯ ПОЛЕЙ ===\n');
  
  // Получаем структуру uni_farming_data
  const { data: uniSample } = await supabase
    .from('uni_farming_data')
    .select('*')
    .limit(1);
    
  console.log('1. Поля в таблице uni_farming_data:');
  if (uniSample && uniSample[0]) {
    console.log(Object.keys(uniSample[0]));
  }
  
  // Получаем структуру users таблицы
  const { data: userSample } = await supabase
    .from('users')
    .select('uni_deposit_amount, uni_farming_balance, uni_farming_rate, uni_farming_start_timestamp, uni_farming_last_update, uni_farming_deposit, uni_farming_active')
    .limit(1);
    
  console.log('\n2. Farming поля в таблице users:');
  if (userSample && userSample[0]) {
    console.log(Object.keys(userSample[0]));
  }
  
  console.log('\n3. Сравнение:');
  console.log('Новая таблица НЕ имеет: farming_rate, farming_start_timestamp, farming_last_update, farming_deposit');
  console.log('Но имеет: total_earned, last_claim_at');
  
  console.log('\n4. Рекомендация для продакшена:');
  console.log('- Добавить недостающие поля в новые таблицы');
  console.log('- ИЛИ адаптировать код репозиториев под существующую структуру');
  console.log('- Fallback оставить только как аварийный механизм');
}

checkFieldMismatch().catch(console.error);