import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFarmingRewards() {
  console.log('=== Проверка транзакций FARMING_REWARD для пользователя 74 ===\n');

  try {
    // Получаем все транзакции FARMING_REWARD для пользователя 74
    const { data: farmingRewards, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 74)
      .eq('type', 'FARMING_REWARD')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Ошибка получения транзакций FARMING_REWARD:', error);
      return;
    }

    console.log(`Найдено транзакций FARMING_REWARD: ${farmingRewards?.length || 0}`);
    
    if (farmingRewards && farmingRewards.length > 0) {
      console.log('\nПоследние 10 транзакций FARMING_REWARD:');
      farmingRewards.forEach((tx, index) => {
        console.log(`\n${index + 1}. ID: ${tx.id}`);
        console.log(`   Сумма: ${tx.amount || tx.amount_uni} UNI`);
        console.log(`   Дата: ${new Date(tx.created_at).toLocaleString('ru-RU')}`);
        console.log(`   Описание: ${tx.description}`);
        console.log(`   Статус: ${tx.status}`);
      });
    }

    // Проверим общее количество всех типов транзакций
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select('type')
      .eq('user_id', 74);

    if (!allError && allTransactions) {
      const typeCounts = allTransactions.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n\nВсе типы транзакций пользователя 74:');
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }

    // Проверим последнюю дату фарминг депозита
    const { data: lastDeposit } = await supabase
      .from('transactions')
      .select('created_at, amount')
      .eq('user_id', 74)
      .eq('type', 'FARMING_DEPOSIT')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastDeposit) {
      console.log('\n\nПоследний депозит:');
      console.log(`   Дата: ${new Date(lastDeposit.created_at).toLocaleString('ru-RU')}`);
      console.log(`   Сумма: ${lastDeposit.amount} UNI`);
    }

    // Проверим общий баланс пользователя
    const { data: user } = await supabase
      .from('users')
      .select('balance_uni, uni_farming_active, uni_deposit_amount')
      .eq('id', 74)
      .single();

    if (user) {
      console.log('\n\nТекущее состояние пользователя 74:');
      console.log(`   Баланс UNI: ${user.balance_uni}`);
      console.log(`   Фарминг активен: ${user.uni_farming_active ? 'Да' : 'Нет'}`);
      console.log(`   Сумма депозита: ${user.uni_deposit_amount} UNI`);
    }

  } catch (error) {
    console.error('Ошибка выполнения скрипта:', error);
  }
}

checkFarmingRewards();