// Тестовый скрипт для проверки обновления баланса
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL и SUPABASE_KEY должны быть установлены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateUserBalance() {
  try {
    // Получаем текущий баланс пользователя ID 48
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, telegram_id, balance_uni, balance_ton')
      .eq('id', 48)
      .single();

    if (userError) {
      console.error('Ошибка получения пользователя:', userError);
      return;
    }

    console.log('Текущий пользователь:', user);

    // Получаем все транзакции пользователя
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 48)
      .eq('status', 'confirmed');

    if (txError) {
      console.error('Ошибка получения транзакций:', txError);
      return;
    }

    console.log(`Найдено транзакций: ${transactions.length}`);
    
    // Выводим первую транзакцию для анализа структуры
    if (transactions.length > 0) {
      console.log('Структура первой транзакции:', JSON.stringify(transactions[0], null, 2));
    }

    // Считаем баланс
    let uniBalance = 0;
    let tonBalance = 0;

    transactions.forEach(tx => {
      // Ищем поля с суммами в разных местах
      const amountUni = parseFloat(tx.amount_uni || tx.amount || '0');
      const amountTon = parseFloat(tx.amount_ton || '0');
      const currency = tx.currency || (amountUni > 0 ? 'UNI' : amountTon > 0 ? 'TON' : null);
      
      console.log(`Транзакция: type=${tx.type}, amount_uni=${tx.amount_uni}, amount_ton=${tx.amount_ton}, currency=${currency}`);
      
      const isIncome = ['FARMING_REWARD', 'MISSION_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS'].includes(tx.type);
      
      if (amountUni > 0) {
        uniBalance += isIncome ? amountUni : -amountUni;
      }
      if (amountTon > 0) {
        tonBalance += isIncome ? amountTon : -amountTon;
      }
    });

    console.log(`Рассчитанный баланс: UNI=${uniBalance}, TON=${tonBalance}`);

    // Обновляем баланс в базе данных
    const { error: updateError } = await supabase
      .from('users')
      .update({
        balance_uni: uniBalance.toString(),
        balance_ton: tonBalance.toString()
      })
      .eq('id', 48);

    if (updateError) {
      console.error('Ошибка обновления баланса:', updateError);
    } else {
      console.log('Баланс успешно обновлён!');
      
      // Проверяем обновлённый баланс
      const { data: updatedUser } = await supabase
        .from('users')
        .select('id, telegram_id, balance_uni, balance_ton')
        .eq('id', 48)
        .single();
        
      console.log('Обновлённый пользователь:', updatedUser);
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

updateUserBalance();