// Скрипт для восстановления баланса TON
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreTonBalance() {
  try {
    console.log('=== ВОССТАНОВЛЕНИЕ БАЛАНСА TON ===\n');
    
    // Проверяем текущий баланс
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('id, telegram_id, balance_uni, balance_ton')
      .eq('id', 48)
      .single();

    if (fetchError) {
      console.error('Ошибка получения пользователя:', fetchError);
      return;
    }

    console.log('Текущий баланс:');
    console.log(`- UNI: ${currentUser.balance_uni}`);
    console.log(`- TON: ${currentUser.balance_ton}`);
    console.log('');

    // Восстанавливаем только баланс TON
    const { error: updateError } = await supabase
      .from('users')
      .update({
        balance_ton: '1000'  // Восстанавливаем исходное значение
      })
      .eq('id', 48);

    if (updateError) {
      console.error('Ошибка обновления баланса TON:', updateError);
      return;
    }

    console.log('✓ Баланс TON восстановлен до 1000');
    
    // Проверяем результат
    const { data: updatedUser, error: checkError } = await supabase
      .from('users')
      .select('id, telegram_id, balance_uni, balance_ton')
      .eq('id', 48)
      .single();

    if (checkError) {
      console.error('Ошибка проверки обновления:', checkError);
      return;
    }

    console.log('\nОбновлённый баланс:');
    console.log(`- UNI: ${updatedUser.balance_uni}`);
    console.log(`- TON: ${updatedUser.balance_ton}`);
    console.log('\n=== ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО ===');

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

restoreTonBalance();