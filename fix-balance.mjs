import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Пересчитываем баланс для пользователя 48
const userId = 48;

// Получаем все транзакции со статусами confirmed и completed
const { data: transactions, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)
  .in('status', ['confirmed', 'completed']);

if (error) {
  console.error('Ошибка получения транзакций:', error);
  process.exit(1);
}

console.log(`Найдено транзакций для пользователя ${userId}: ${transactions.length}`);

let uniBalance = 0;
let tonBalance = 0;

// Считаем баланс на основе транзакций
for (const tx of transactions || []) {
  const txType = tx.type.toUpperCase();
  const isIncome = [
    'FARMING_REWARD', 'MISSION_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 
    'TON_FARMING_REWARD', 'TON_BOOST_REWARD', 'AIRDROP_REWARD'
  ].includes(txType);
  
  const amountUni = parseFloat(tx.amount_uni || tx.amount || '0');
  const amountTon = parseFloat(tx.amount_ton || '0');
  
  if (amountUni > 0) {
    uniBalance += isIncome ? amountUni : -amountUni;
    console.log(`${tx.type}: ${isIncome ? '+' : '-'}${amountUni} UNI`);
  }
  
  if (amountTon > 0) {
    tonBalance += isIncome ? amountTon : -amountTon;
    console.log(`${tx.type}: ${isIncome ? '+' : '-'}${amountTon} TON`);
  }
}

console.log('\nПересчитанный баланс:');
console.log(`UNI: ${uniBalance}`);
console.log(`TON: ${tonBalance}`);

// Обновляем баланс в базе данных
const { error: updateError } = await supabase
  .from('users')
  .update({
    balance_uni: uniBalance.toString(),
    balance_ton: tonBalance.toString()
  })
  .eq('id', userId);

if (updateError) {
  console.error('Ошибка обновления баланса:', updateError);
} else {
  console.log('\nБаланс успешно обновлен в базе данных!');
}