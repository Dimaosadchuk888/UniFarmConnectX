import { supabase } from './core/supabase';

async function checkLatestFarmingRewards() {
  console.log('Проверяем последние farming rewards для пользователя 74...');
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, user_id, type, amount, currency, created_at, description')
    .eq('user_id', 74)
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Ошибка получения транзакций:', error);
    return;
  }
  
  console.log(`\nПоследние ${transactions?.length || 0} farming rewards:`);
  console.log('='.repeat(80));
  
  transactions?.forEach((tx, index) => {
    const date = new Date(tx.created_at);
    console.log(`${index + 1}. ID: ${tx.id}`);
    console.log(`   Время: ${date.toISOString()} (${date.toLocaleTimeString('ru-RU')})`);
    console.log(`   Сумма: ${tx.amount} ${tx.currency}`);
    console.log(`   Описание: ${tx.description}`);
    console.log('-'.repeat(80));
  });
  
  // Проверяем последнее время и вычисляем следующее ожидаемое
  if (transactions && transactions.length > 0) {
    const lastTime = new Date(transactions[0].created_at);
    const nextExpected = new Date(lastTime.getTime() + 5 * 60 * 1000); // +5 минут
    const now = new Date();
    
    console.log(`\nПоследнее начисление: ${lastTime.toISOString()}`);
    console.log(`Ожидаемое следующее: ${nextExpected.toISOString()}`);
    console.log(`Текущее время:       ${now.toISOString()}`);
    
    if (now > nextExpected) {
      console.log('\n⚠️  ВНИМАНИЕ: Ожидаемое время начисления уже прошло!');
      console.log(`   Задержка: ${Math.round((now.getTime() - nextExpected.getTime()) / 1000)} секунд`);
    } else {
      console.log(`\n✓ До следующего начисления: ${Math.round((nextExpected.getTime() - now.getTime()) / 1000)} секунд`);
    }
  }
  
  // Проверяем текущий баланс
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, balance_uni, balance_ton, uni_farming_active, uni_deposit_amount')
    .eq('id', 74)
    .single();
    
  if (user) {
    console.log(`\nТекущее состояние пользователя 74:`);
    console.log(`Баланс UNI: ${user.balance_uni}`);
    console.log(`Баланс TON: ${user.balance_ton}`);
    console.log(`Фарминг активен: ${user.uni_farming_active ? 'ДА' : 'НЕТ'}`);
    console.log(`Депозит: ${user.uni_deposit_amount} UNI`);
  }
}

checkLatestFarmingRewards()
  .then(() => process.exit(0))
  .catch(console.error);