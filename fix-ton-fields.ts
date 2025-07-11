import { supabase } from './core/supabase';

async function fixTonFields() {
  console.log('=== ДОБАВЛЕНИЕ TON ПОЛЕЙ В ТАБЛИЦУ users ===\n');
  
  // Для Supabase используем прямой SQL через функцию
  const sqlQueries = [
    // TON boost поля
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_boost_package INTEGER DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_boost_active BOOLEAN DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_boost_expires_at TIMESTAMP DEFAULT NULL`,
    
    // TON farming поля
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_farming_deposit NUMERIC(20,9) DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_farming_balance NUMERIC(20,9) DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_farming_rate NUMERIC(10,6) DEFAULT 0.01`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_farming_start_timestamp TIMESTAMP DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_farming_last_update TIMESTAMP DEFAULT NULL`
  ];
  
  console.log('⚠️ ВНИМАНИЕ: Для добавления полей выполните следующие SQL команды в Supabase Dashboard:\n');
  
  sqlQueries.forEach((query, index) => {
    console.log(`-- ${index + 1}. ${query.includes('boost_package') ? 'TON Boost поля' : 'TON Farming поля'}`);
    console.log(query + ';');
  });
  
  console.log('\n📋 Инструкция:');
  console.log('1. Откройте Supabase Dashboard');
  console.log('2. Перейдите в SQL Editor');
  console.log('3. Скопируйте и выполните SQL команды выше');
  console.log('4. После выполнения перезапустите тест');
  
  // Проверяем текущие данные пользователя
  const { data: userData } = await supabase
    .from('users')
    .select('id, balance_ton, ton_boost_package')
    .eq('id', 74)
    .single();
    
  console.log('\n📊 Текущие данные пользователя 74:');
  console.log('- balance_ton:', userData?.balance_ton);
  console.log('- ton_boost_package:', userData?.ton_boost_package || 'поле отсутствует');
}

fixTonFields().catch(console.error);