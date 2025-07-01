// Скрипт для проверки баланса TON в базе данных
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTonBalance() {
  try {
    // Проверяем баланс пользователя ID 48
    const { data: user, error } = await supabase
      .from('users')
      .select('id, telegram_id, balance_uni, balance_ton')
      .eq('id', 48)
      .single();

    if (error) {
      console.error('Ошибка получения пользователя:', error);
      return;
    }

    console.log('=== ДАННЫЕ ПОЛЬЗОВАТЕЛЯ В БД ===');
    console.log('ID:', user.id);
    console.log('Telegram ID:', user.telegram_id);
    console.log('Balance UNI:', user.balance_uni);
    console.log('Balance TON:', user.balance_ton);
    console.log('================================\n');

    // Проверяем транзакции с TON
    const { data: tonTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 48)
      .gt('amount_ton', 0);

    if (txError) {
      console.error('Ошибка получения TON транзакций:', txError);
      return;
    }

    console.log('=== TON ТРАНЗАКЦИИ ===');
    console.log(`Найдено TON транзакций: ${tonTransactions.length}`);
    
    let totalTon = 0;
    tonTransactions.forEach((tx, idx) => {
      console.log(`\nТранзакция ${idx + 1}:`);
      console.log(`- ID: ${tx.id}`);
      console.log(`- Type: ${tx.type}`);
      console.log(`- Amount TON: ${tx.amount_ton}`);
      console.log(`- Status: ${tx.status}`);
      console.log(`- Description: ${tx.description}`);
      totalTon += parseFloat(tx.amount_ton || '0');
    });

    console.log(`\nОбщая сумма TON транзакций: ${totalTon}`);
    console.log('=======================');

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkTonBalance();