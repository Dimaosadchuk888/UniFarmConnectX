/**
 * Скрипт для пополнения баланса пользователя 50
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: SUPABASE_URL или SUPABASE_KEY не установлены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateUserBalance() {
  try {
    // Обновляем баланс пользователя 50
    const { data, error } = await supabase
      .from('users')
      .update({
        balance_uni: '1000',
        balance_ton: '500'
      })
      .eq('id', 50)
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка обновления баланса:', error);
      return;
    }

    console.log('✅ Баланс пользователя 50 успешно обновлен:');
    console.log('   UNI: 1000');
    console.log('   TON: 500');
    console.log('   ID:', data.id);
    console.log('   Telegram ID:', data.telegram_id);
    console.log('   Ref Code:', data.ref_code);

  } catch (err) {
    console.error('❌ Ошибка:', err);
  }
}

updateUserBalance();