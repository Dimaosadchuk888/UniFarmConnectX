/**
 * Обновление балансов пользователя 50
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function updateBalances() {
  console.log('💰 Обновляем балансы пользователя 50...\n');
  
  // Обновляем балансы
  const { error: updateError } = await supabase
    .from('users')
    .update({
      balance_uni: 1000,
      balance_ton: 1000
    })
    .eq('id', 50);
    
  if (updateError) {
    console.error('❌ Ошибка при обновлении балансов:', updateError);
  } else {
    console.log('✅ Балансы обновлены: UNI=1000, TON=1000');
  }
  
  // Проверяем результат
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', 50)
    .single();
    
  if (!fetchError && user) {
    console.log('\n✨ Пользователь 50:');
    console.log(`   ID: ${user.id}`);
    console.log(`   telegram_id: ${user.telegram_id}`);
    console.log(`   username: ${user.username}`);
    console.log(`   ref_code: ${user.ref_code}`);
    console.log(`   Баланс UNI: ${user.balance_uni}`);
    console.log(`   Баланс TON: ${user.balance_ton}`);
  }
}

updateBalances();