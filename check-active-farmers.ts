import { supabase } from './core/supabase';

async function checkActiveFarmers() {
  // Проверка активных фармеров
  const { data: activeFarmers, error } = await supabase
    .from('users')
    .select('id, telegram_id, username, uni_farming_active, uni_deposit_amount, uni_farming_rate, uni_farming_last_update, balance_uni')
    .eq('uni_farming_active', true)
    .order('id');

  console.log('\n=== АКТИВНЫЕ UNI ФАРМЕРЫ ===');
  console.log('Найдено активных фармеров:', activeFarmers?.length || 0);
  
  if (activeFarmers && activeFarmers.length > 0) {
    activeFarmers.forEach(farmer => {
      console.log(`\nUser ID: ${farmer.id}`);
      console.log(`  Telegram ID: ${farmer.telegram_id}`);
      console.log(`  Username: ${farmer.username}`);
      console.log(`  Депозит: ${farmer.uni_deposit_amount} UNI`);
      console.log(`  Ставка: ${farmer.uni_farming_rate} (${(farmer.uni_farming_rate * 100).toFixed(2)}% в день)`);
      console.log(`  Последнее обновление: ${farmer.uni_farming_last_update || 'Никогда'}`);
      console.log(`  Баланс: ${farmer.balance_uni} UNI`);
    });
  }

  // Проверка последних FARMING_REWARD транзакций
  const { data: recentRewards, error: rewardsError } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n\n=== ПОСЛЕДНИЕ FARMING_REWARD ТРАНЗАКЦИИ ===');
  if (recentRewards && recentRewards.length > 0) {
    recentRewards.forEach(tx => {
      console.log(`\nTx ID: ${tx.id}`);
      console.log(`  User ID: ${tx.user_id}`);
      console.log(`  Amount: ${tx.amount} ${tx.currency}`);
      console.log(`  Created: ${tx.created_at}`);
    });
  } else {
    console.log('Не найдено FARMING_REWARD транзакций');
  }

  // Проверка пользователя 74
  const { data: user74 } = await supabase
    .from('users')
    .select('*')
    .eq('id', 74)
    .single();

  if (user74) {
    console.log('\n\n=== ПОЛЬЗОВАТЕЛЬ 74 ===');
    console.log('uni_farming_active:', user74.uni_farming_active);
    console.log('uni_deposit_amount:', user74.uni_deposit_amount);
    console.log('uni_farming_rate:', user74.uni_farming_rate);
    console.log('uni_farming_last_update:', user74.uni_farming_last_update);
    console.log('uni_farming_start_timestamp:', user74.uni_farming_start_timestamp);
    console.log('balance_uni:', user74.balance_uni);
  }
}

checkActiveFarmers();